import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Player } from './Player.js';
import { HingeDoor } from './HingeDoor.js';
import { Elevator } from './Elevator.js';
import { GarageDoor } from './GarageDoor.js';
import { Car } from './Car.js';
import { Truck } from './Truck.js';
import { RoadBlock } from './RoadBlock.js';
import { ParkourStep } from './ParkourStep.js';
import { Ladder } from './Ladder.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from './constants.js';

// ---------------------------------------------------------------------------
// Scene setup (performance-first)
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, PLAYER_HEIGHT, 8);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
document.getElementById('game').appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(30, 60, 20);
scene.add(sun);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshLambertMaterial({ color: 0x55aa55 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(200, 50, 0x000000, 0x444444);
grid.material.opacity = 0.15;
grid.material.transparent = true;
scene.add(grid);

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
const player = new Player(camera, document.body);
scene.add(camera); // camera starts as a scene child

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
const hingeDoor = new HingeDoor(scene, -10, 0, 0);

const elevator = new Elevator(scene, 0, -12, [
  { label: 'Return to the Lobby', targetY: 0 },
  { label: 'Ascend to the Clouds', targetY: 5 },
  { label: 'Visit the Secret Garden', targetY: 0 },
  { label: 'Go to the Rooftop Bar', targetY: 5 },
]);

const garage = new GarageDoor(scene, 12, 0, 0);
const car = new Car(scene, 0, 10, 0, 0xcc2222);
const truck = new Truck(scene, -12, -12, Math.PI / 4);

// Upper floor platform in front of the elevator so the player can walk out after ascending.
// It stops at the elevator doors; the invisible elevator floor collision is extended to meet it.
const upperPlatform = new THREE.Mesh(
  new THREE.BoxGeometry(8, 0.2, 8),
  new THREE.MeshLambertMaterial({ color: 0x999999 })
);
upperPlatform.position.set(0, 5, -6.8);
scene.add(upperPlatform);

// Road blocks that the car cannot drive through
const roadBlocks = [
  new RoadBlock(scene, 6, 12, 2, 1.2, 0.6, 0),
  new RoadBlock(scene, -4, 18, 1.5, 1.0, 3.0, Math.PI / 2),
];

// Debug ladder that falls out of the elevator when the doors open
const ladder = new Ladder(elevator.group);
let ladderDebug = false;

// Parkour test section: steps get higher; the last one moves away when you try to land on it
const parkourSteps = [
  new ParkourStep(scene, -35, 15, 4.8, 4.8, 0.5),
  new ParkourStep(scene, -35, 9, 4.2, 4.2, 1.5),
  new ParkourStep(scene, -28, 8, 4.2, 4.2, 2.5),
  new ParkourStep(scene, -22, 9, 4.2, 4.2, 3.5),
  new ParkourStep(scene, -16, 13, 4.2, 4.2, 4.5, true, 0xaa5555),
];

// Floors used for player gravity / landing
const floors = [
  new THREE.Box3(new THREE.Vector3(-100, -10, -100), new THREE.Vector3(100, 0, 100)),
  new THREE.Box3().setFromObject(upperPlatform),
];
for (const step of parkourSteps) floors.push(step.getFloorBox());

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const promptEl = document.getElementById('prompt');
const floorMenu = document.getElementById('floor-menu');
const floorButtons = document.getElementById('floor-buttons');
const startScreen = document.getElementById('start-screen');
let elevatorRideActive = false;
let ladderHitNotified = false;

function setPrompt(text) {
  if (text) {
    promptEl.textContent = text;
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }
}

const notifyEl = document.getElementById('notify');
let notifyTimeout = null;
function showNotify(text, duration = 2000) {
  notifyEl.textContent = text;
  notifyEl.classList.add('show');
  clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => notifyEl.classList.remove('show'), duration);
}

function buildFloorMenu() {
  floorButtons.innerHTML = '';
  elevator.floors.forEach((floor, index) => {
    const btn = document.createElement('button');
    btn.textContent = `${index + 1}: ${floor.label}`;
    btn.addEventListener('click', () => {
      startElevatorTravel(floor.targetY);
    });
    floorButtons.appendChild(btn);
  });
}
buildFloorMenu();

function startElevatorTravel(targetY) {
  elevator.travelTo(targetY);
  floorMenu.classList.add('hidden');
  player.enabled = false;
  elevatorRideActive = true;
}

function finishElevatorTravel() {
  player.floorOffset = elevator.group.position.y;
  player.enabled = true;
  elevatorRideActive = false;
}

startScreen.addEventListener('click', () => player.lock());
player.controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
player.controls.addEventListener('unlock', () => {
  if (!car.entered) startScreen.classList.remove('hidden');
});

// Mouse steering for the car
window.addEventListener('mousemove', (e) => {
  if (!car.entered) return;
  const t = (e.clientX / window.innerWidth) * 2 - 1;
  car.setSteering(t);
  car.steeringMode = 'mouse';
});

// ---------------------------------------------------------------------------
// Interaction inputs
// ---------------------------------------------------------------------------
document.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  // Debug reset for hinge door
  if (event.code === 'KeyR') {
    hingeDoor.reset();
    return;
  }

  // Debug close for garage door
  if (event.code === 'KeyC') {
    garage.close();
    return;
  }

  // Toggle ladder-fall debug option
  if (event.code === 'KeyL') {
    ladderDebug = !ladderDebug;
    ladderHitNotified = false;
    if (!ladderDebug) ladder.hide();
    showNotify(`Ladder debug ${ladderDebug ? 'ON' : 'OFF'}`);
    return;
  }

  // Elevator floor selection by number keys
  if (event.code.startsWith('Digit') && !floorMenu.classList.contains('hidden')) {
    const index = parseInt(event.code.slice(5), 10) - 1;
    if (index >= 0 && index < elevator.floors.length) {
      startElevatorTravel(elevator.floors[index].targetY);
    }
    return;
  }

  if (event.code !== 'KeyE') return;

  const playerPos = camera.getWorldPosition(new THREE.Vector3());

  if (car.entered) {
    const exitPos = car.exit(camera);
    scene.add(camera);
    camera.position.copy(exitPos);
    player.enabled = true;
    player.lock();
    return;
  }

  // Inside elevator: menu handles travel; E does nothing special here
  if (elevator.isPlayerInside(playerPos) && !elevator.traveling) {
    return;
  }

  if (elevator.isPlayerAtFront(playerPos)) {
    elevator.openDoors();
    return;
  }

  if (garage.isPlayerInFront(playerPos)) {
    garage.open();
    return;
  }

  const doorPos = car.getDriverDoorWorldPos();
  if (doorPos.distanceTo(playerPos) < 2.5) {
    car.enter(camera);
    player.enabled = false;
    player.controls.unlock();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Obstacles for FPS collision
// ---------------------------------------------------------------------------
function collectObstacles() {
  const obstacles = [];

  // The hinge door is intentionally NOT an obstacle so the player can push it open on contact.

  const garageBox = garage.getObstacleBox();
  if (garageBox) obstacles.push(garageBox);

  const carBox = car.getObstacleBox();
  if (carBox) obstacles.push(carBox);

  obstacles.push(truck.getObstacleBox());

  for (const rb of roadBlocks) {
    const box = rb.getObstacleBox();
    if (box) obstacles.push(box);
  }

  // Parkour step sides block the player
  for (const step of parkourSteps) {
    const box = step.getFloorBox();
    if (box) obstacles.push(box);
  }

  // Only collide with elevator exterior when the player is outside it
  const playerPos = camera.getWorldPosition(new THREE.Vector3());
  if (!elevator.isPlayerInside(playerPos)) {
    obstacles.push(...elevator.getObstacleBoxes());
  }

  return obstacles;
}

function updateFloors() {
  floors.length = 2; // keep ground and upper platform

  // Elevator floor moves with the car. It extends slightly forward under the
  // upper platform so the transition is seamless without visible clipping.
  const ex = elevator.group.position.x;
  const ey = elevator.group.position.y;
  const ez = elevator.group.position.z;
  floors.push(new THREE.Box3(
    new THREE.Vector3(ex - 1.2, ey, ez - 1.2),
    new THREE.Vector3(ex + 1.2, ey + 0.1, ez + 2.2)
  ));

  for (const step of parkourSteps) {
    floors.push(step.getFloorBox());
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const playerPos = camera.getWorldPosition(new THREE.Vector3());

  if (car.entered) {
    const throttle = (player.moveForward ? 1 : 0) - (player.moveBackward ? 1 : 0);

    let steering;
    if (player.moveLeft || player.moveRight) {
      steering = (player.moveLeft ? 1 : 0) - (player.moveRight ? 1 : 0);
      car.steeringMode = 'keys';
    } else if (car.steeringMode === 'keys') {
      steering = 0;
    } else {
      steering = car.steering;
    }

    car.setInput(throttle, steering);
    car.update(dt, roadBlocks);

    // Lock view to forward
    camera.rotation.set(0, 0, 0);

    setPrompt('W/S throttle, mouse left/right to steer, A/D also steer, E to exit');
  } else {
    for (const step of parkourSteps) {
      step.update(dt, playerPos, player.velocity.y);
    }
    updateFloors();

    const obstacles = collectObstacles();

    // Move the player with the elevator if a ride is active
    const lastElevatorY = elevator.group.position.y;
    hingeDoor.update(dt, playerPos);
    elevator.update(dt, playerPos);
    garage.update(dt);

    if (ladderDebug) {
      if (elevator.doorOpen > 0.05 && !ladder.active) {
        ladder.spawn(elevator.isPlayerInside(playerPos));
      }
      ladder.update(dt, elevator.doorOpen);
      if (!ladder.active) {
        ladderHitNotified = false;
      } else if (!ladderHitNotified && ladder.isHittingPlayer(playerPos)) {
        ladderHitNotified = true;
        showNotify('The ladder fell on you!', 3000);
      }
    }

    if (elevatorRideActive) {
      camera.position.y += elevator.group.position.y - lastElevatorY;
      player.floorOffset = elevator.group.position.y;
    }

    player.update(dt, obstacles, floors);

    // Apply parkour step movement after physics
    for (const step of parkourSteps) {
      step.postUpdate(dt);
    }

    // Floor menu only when inside, doors open, and looking at the door
    if (
      elevator.isPlayerInside(playerPos) &&
      !elevator.traveling &&
      !elevator.departing &&
      elevator.doorOpen > 0.9 &&
      elevator.isPlayerFacingDoor(camera)
    ) {
      floorMenu.classList.remove('hidden');
      setPrompt('');
    } else {
      floorMenu.classList.add('hidden');

      if (elevator.isPlayerAtFront(playerPos)) {
        setPrompt('Press E to open elevator');
      } else if (garage.isPlayerInFront(playerPos)) {
        setPrompt('Press E to open garage door');
      } else if (car.getDriverDoorWorldPos().distanceTo(playerPos) < 2.5) {
        setPrompt('Press E to enter car');
      } else if (playerPos.distanceTo(new THREE.Vector3(-10, playerPos.y, 0)) < 2.5) {
        setPrompt('Walk into the door to push it open');
      } else {
        setPrompt('');
      }
    }
  }

  // Finish elevator ride once it arrives
  if (elevatorRideActive && !elevator.traveling && !elevator.departing) {
    finishElevatorTravel();
  }

  renderer.render(scene, camera);
}

animate();
