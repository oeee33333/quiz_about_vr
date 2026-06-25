
import * as THREE from 'three';
import { Player } from './Player.js';
import { HingeDoor } from './HingeDoor.js';
import { ParkourStep } from './ParkourStep.js';
import { Elevator } from './Elevator.js';
import { Ladder } from './Ladder.js';
import { GarageDoor } from './GarageDoor.js';
import { Car } from './Car.js';
import { Truck } from './Truck.js';
import { RoadBlock } from './RoadBlock.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS, WORLD_SIZE } from './constants.js';
import { GAME_CONFIG } from './gameConfig.js';

// -----------------------------------------------------------------------------
// Scene setup (performance-first)
// -----------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
document.getElementById('game').appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.55);
sun.position.set(30, 80, 30);
scene.add(sun);

// -----------------------------------------------------------------------------
// UI refs
// -----------------------------------------------------------------------------
const promptEl = document.getElementById('prompt');
const questionUI = document.getElementById('question-ui');
const deathScreen = document.getElementById('death-screen');
const deathReason = document.getElementById('death-reason');
const completeScreen = document.getElementById('complete-screen');
const startScreen = document.getElementById('start-screen');
const floorMenu = document.getElementById('floor-menu');
const floorButtons = document.getElementById('floor-buttons');

function setPrompt(text) {
  if (text) {
    promptEl.textContent = text;
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }
}

function hideQuestionUI() {
  questionUI.classList.add('hidden');
}

// -----------------------------------------------------------------------------
// Player
// -----------------------------------------------------------------------------
const player = new Player(camera, document.body);
scene.add(camera);

// -----------------------------------------------------------------------------
// Game state
// -----------------------------------------------------------------------------
let scrambledQuestions = [];
let stage = 0; // 0 parkour, 1 doors, 2 elevator choice, 3 floor choice, 4 done
let dead = false;
let completed = false;
let gameStarted = false;

let levelMeshes = [];
let parkourSteps = [];
let doorInstances = [];
let doorTriggered = [];
let elevators = [];
let ladders = [];
let labelMeshes = [];
let trickyStepIndex = -1;
let pendingDeathReason = '';

let bridgeZ = 0;
let correctElevatorIndex = -1;
let currentElevator = null;
let elevatorRideActive = false;
let selectedFloorIndex = -1;
let ladderHitNotified = false;
let groundFloorArrived = false;

let garageDoors = [];
let garageInstances = [];
let correctGarageIndex = -1;
let carInstance = null;
let drivingCar = false;
let roadBlocks = [];
let finalTruck = null;
let finalTruckSpawned = false;
let finalTruckDir = 0;
let carExitAnim = null;
let lastGroundY = 0;
const MAX_FALL_DISTANCE = 8;
const GOAL_Z = 110;
const FINAL_TRUCK_Z_SPAWN = -20;
const FINAL_TRUCK_TRIGGER_Z = 50;
const FINAL_SIGN_Z = 26;

const SPAWN_POS = new THREE.Vector3(-40, GAME_CONFIG.spawnY + PLAYER_HEIGHT, 0);
const SPAWN_ROT = new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ');

const B2_TOP_Y = GAME_CONFIG.spawnY - 1.8;
const B2_SECOND_Y = 18;
const B2_GROUND_Y = 0;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makeLabelTexture(text, opts = {}) {
  const width = opts.width || 256;
  const height = opts.height || 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = opts.bg || 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = opts.border || '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  ctx.fillStyle = opts.fg || '#ffffff';
  ctx.font = opts.font || 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = width - 24;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = Math.min(height / (lines.length + 1), height / 3);
  const startY = (height - (lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, width / 2, startY + i * lineHeight));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLabel(scene, text, x, y, z, rotY = 0, scale = 2, opts = {}) {
  const tex = makeLabelTexture(text, opts);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale * 2, scale), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  labelMeshes.push(mesh);
  return mesh;
}

function createLabelMesh(text, scale = 2, opts = {}) {
  const tex = makeLabelTexture(text, opts);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(scale * 2, scale), mat);
}

function createBox(scene, x, y, z, w, h, d, color, opacity = 1) {
  const mat = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  levelMeshes.push(mesh);
  return mesh;
}

function getBoxFloor(mesh) {
  mesh.updateWorldMatrix(true, false);
  return new THREE.Box3().setFromObject(mesh);
}

function isInsideElevatorLoose(elevator, playerPos) {
  const local = elevator.group.worldToLocal(playerPos.clone());
  return (
    local.x > -1.5 && local.x < 1.5 &&
    local.z > -1.5 && local.z < 1.5 &&
    local.y > -0.5 && local.y < 3.5
  );
}

function garageZFromIndex(index) {
  return [-5, 0, 5][index];
}

// -----------------------------------------------------------------------------
// Level building
// -----------------------------------------------------------------------------
function clearLevel() {
  for (const mesh of levelMeshes) scene.remove(mesh);
  for (const mesh of labelMeshes) scene.remove(mesh);
  for (const step of parkourSteps) scene.remove(step.group);
  for (const door of doorInstances) scene.remove(door.group);
  for (const elevator of elevators) scene.remove(elevator.group);
  for (const gd of garageDoors) scene.remove(gd.group);
  for (const g of garageInstances) {
    if (g.truck) scene.remove(g.truck.group);
    if (g.car) scene.remove(g.car.group);
  }
  for (const block of roadBlocks) scene.remove(block.group);

  levelMeshes = [];
  labelMeshes = [];
  parkourSteps = [];
  doorInstances = [];
  doorTriggered = [];
  elevators = [];
  ladders = [];
  garageDoors = [];
  garageInstances = [];
  trickyStepIndex = -1;
  pendingDeathReason = '';
  correctElevatorIndex = -1;
  currentElevator = null;
  elevatorRideActive = false;
  selectedFloorIndex = -1;
  ladderHitNotified = false;
  groundFloorArrived = false;
  correctGarageIndex = -1;
  carInstance = null;
  drivingCar = false;
  roadBlocks = [];
  finalTruck = null;
  finalTruckSpawned = false;
  finalTruckDir = 0;
  carExitAnim = null;
}

function buildParkour(q1) {
  const y0 = GAME_CONFIG.spawnY;

  createBox(scene, -40, y0, 0, 7, 0.2, 7, 0x888888);
  createBox(scene, -32, y0 - 0.5, 0, 5, 0.2, 5, 0xccaa66);

  const leftZ = -4;
  const rightZ = 4;
  const leftAnswer = q1.answers[0];
  const rightAnswer = q1.answers[1];
  const leftStep = new ParkourStep(scene, -26, leftZ, 5, 5, y0 - 1.0, false, 0x66aaff);
  const rightStep = new ParkourStep(scene, -26, rightZ, 5, 5, y0 - 1.0, false, 0xffaa66);

  parkourSteps.push(leftStep, rightStep);

  if (!leftAnswer.correct && rightAnswer.correct) {
    leftStep.isTricky = true;
    trickyStepIndex = 0;
  } else if (leftAnswer.correct && !rightAnswer.correct) {
    rightStep.isTricky = true;
    trickyStepIndex = 1;
  } else {
    rightStep.isTricky = true;
    trickyStepIndex = 1;
  }

  leftStep.slideDir = -1;
  rightStep.slideDir = 1;

  createLabel(scene, q1.prompt, -26, y0 + 4.2, 0, -Math.PI / 2, 3.5, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });
  createLabel(scene, leftAnswer.text, -26, y0 + 1.7, leftZ, -Math.PI / 2, 1.6);
  createLabel(scene, rightAnswer.text, -26, y0 + 1.7, rightZ, -Math.PI / 2, 1.6);

  createBox(scene, -18, y0 - 1.5, 0, 5, 0.2, 5, 0x66cc66);
}

function buildBuildingAndDoors(q2) {
  const floorY = GAME_CONFIG.spawnY - 1.5;
  const buildingMinX = -14;
  const buildingMaxX = 10;
  const buildingZ = 10;
  const wallHeight = 16;

  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY, 0,
    buildingMaxX - buildingMinX, 0.2, buildingZ * 2, 0x999999);

  createBox(scene, buildingMinX, floorY + wallHeight / 2, -6, 0.4, wallHeight, 8, 0x666666);
  createBox(scene, buildingMinX, floorY + wallHeight / 2, 6, 0.4, wallHeight, 8, 0x666666);
  createBox(scene, buildingMinX, floorY + wallHeight + 1.5, 0, 0.4, 3, 4, 0x666666);

  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight / 2, -buildingZ,
    buildingMaxX - buildingMinX, wallHeight, 0.4, 0x666666);
  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight / 2, buildingZ,
    buildingMaxX - buildingMinX, wallHeight, 0.4, 0x666666);

  const doorZs = [-4.5, -1.5, 1.5, 4.5];
  const wallOverlap = 1.15;
  const lowerWallHeight = 2.6;
  const lowerWallSegments = [
    [-buildingZ, doorZs[0] - wallOverlap],
    [doorZs[0] + wallOverlap, doorZs[1] - wallOverlap],
    [doorZs[1] + wallOverlap, doorZs[2] - wallOverlap],
    [doorZs[2] + wallOverlap, doorZs[3] - wallOverlap],
    [doorZs[3] + wallOverlap, buildingZ]
  ];
  for (const [zMin, zMax] of lowerWallSegments) {
    const centerZ = (zMin + zMax) / 2;
    const depth = zMax - zMin;
    createBox(scene, buildingMaxX, floorY + lowerWallHeight / 2, centerZ, 0.4, lowerWallHeight, depth, 0x666666);
  }
  createBox(scene, buildingMaxX, floorY + (wallHeight + lowerWallHeight) / 2, 0,
    0.4, wallHeight - lowerWallHeight, buildingZ * 2, 0x666666);

  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight, 0,
    buildingMaxX - buildingMinX, 0.2, buildingZ * 2, 0x555555);

  const doorZPositions = [-4.5, -1.5, 1.5, 4.5];
  for (let i = 0; i < 4; i++) {
    const door = new HingeDoor(scene, buildingMaxX, doorZPositions[i], -Math.PI / 2);
    door.group.position.y = floorY;
    doorInstances.push(door);
    doorTriggered.push(false);
  }

  createLabel(scene, q2.prompt, buildingMaxX - 0.3, floorY + 6.5, 0, -Math.PI / 2, 3.5, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });
  for (let i = 0; i < 4; i++) {
    createLabel(scene, q2.answers[i].text, buildingMaxX - 0.3, floorY + 3.6, doorZPositions[i], -Math.PI / 2, 1.6);
  }

  const correctDoorIndex = q2.answers.findIndex(a => a.correct);
  const correctZ = doorZPositions[correctDoorIndex];
  bridgeZ = correctZ;
  const bridgeStart = buildingMaxX - 0.5;
  const bridgeEnd = 55.5;
  const bridgeLength = bridgeEnd - bridgeStart;
  const bridgeY = floorY - 0.3;
  createBox(scene, (bridgeStart + bridgeEnd) / 2, bridgeY, correctZ, bridgeLength, 0.2, 5, 0x8b5a2b);
}

function buildSecondBuilding(q3, q4) {
  const b2MinX = 55;
  const b2MaxX = 75;
  const b2Z = 10;
  const wallHeight = B2_TOP_Y + 3;

  // Floors
  createBox(scene, (b2MinX + b2MaxX) / 2, B2_TOP_Y, 0, b2MaxX - b2MinX, 0.2, b2Z * 2, 0x999999);
  createBox(scene, (b2MinX + b2MaxX) / 2, B2_SECOND_Y, 0, b2MaxX - b2MinX, 0.2, b2Z * 2, 0x999999);
  // Extend the ground floor out to cover the road and the drive to the goal.
  createBox(scene, (35 + 110) / 2, B2_GROUND_Y, 50, 110 - 35, 0.2, 160, 0x777777);

  // Perpendicular 2-lane road between the garages (west) and the elevator building (east)
  const roadZMin = -10;
  const roadZMax = 110;
  const roadCenterZ = (roadZMin + roadZMax) / 2;
  const roadLength = roadZMax - roadZMin;
  createBox(scene, 51, B2_GROUND_Y + 0.02, roadCenterZ, 6, 0.05, roadLength, 0x333333);
  // Center divider
  createBox(scene, 51, B2_GROUND_Y + 0.08, roadCenterZ, 0.15, 0.12, roadLength, 0xeeeeee);
  // Edge lines
  createBox(scene, 48, B2_GROUND_Y + 0.08, roadCenterZ, 0.12, 0.12, roadLength, 0xffffff);
  createBox(scene, 54, B2_GROUND_Y + 0.08, roadCenterZ, 0.12, 0.12, roadLength, 0xffffff);

  // Road barriers on both sides for z beyond the garages/building
  const barrierZStart = 12;
  const barrierZEnd = roadZMax;
  const barrierSpacing = 6;
  for (let bz = barrierZStart; bz <= barrierZEnd; bz += barrierSpacing) {
    roadBlocks.push(new RoadBlock(scene, 45, bz, 1.2, 1.0, 0.6, 0, 0xff6600));
    roadBlocks.push(new RoadBlock(scene, 57, bz, 1.2, 1.0, 0.6, 0, 0xff6600));
  }

  // Side walls
  createBox(scene, (b2MinX + b2MaxX) / 2, wallHeight / 2, -b2Z,
    b2MaxX - b2MinX, wallHeight, 0.4, 0x666666);
  createBox(scene, (b2MinX + b2MaxX) / 2, wallHeight / 2, b2Z,
    b2MaxX - b2MinX, wallHeight, 0.4, 0x666666);

  // Front wall (entrance side) with a vertical gap for the bridge
  const entranceGapHalf = 2.6;
  const entranceMin = bridgeZ - entranceGapHalf;
  const entranceMax = bridgeZ + entranceGapHalf;
  if (entranceMin > -b2Z) {
    createBox(scene, b2MinX, wallHeight / 2, (-b2Z + entranceMin) / 2,
      0.4, wallHeight, entranceMin + b2Z, 0x666666);
  }
  if (entranceMax < b2Z) {
    createBox(scene, b2MinX, wallHeight / 2, (entranceMax + b2Z) / 2,
      0.4, wallHeight, b2Z - entranceMax, 0x666666);
  }

  // Elevators hang outside the goal-side wall (x = b2MaxX), doors face spawn (-x)
  const elevatorX = 76.2; // front face flush with b2MaxX
  const elevatorZs = [-7, 0, 7];
  const elevatorGapHalf = 1.3;

  // Goal-side wall with gaps for the elevator doors
  const wallSegments = [
    [-b2Z, elevatorZs[0] - elevatorGapHalf],
    [elevatorZs[0] + elevatorGapHalf, elevatorZs[1] - elevatorGapHalf],
    [elevatorZs[1] + elevatorGapHalf, elevatorZs[2] - elevatorGapHalf],
    [elevatorZs[2] + elevatorGapHalf, b2Z]
  ];
  for (const [zMin, zMax] of wallSegments) {
    createBox(scene, b2MaxX, wallHeight / 2, (zMin + zMax) / 2,
      0.4, wallHeight, zMax - zMin, 0x666666);
  }

  // Question sign for the elevator choice (outside, faces spawn/-x)
  createLabel(scene, q3.prompt, b2MaxX + 1.0, B2_TOP_Y + 6.5, 0, -Math.PI / 2, 3.5, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });

  correctElevatorIndex = q3.answers.findIndex(a => a.correct);

  for (let i = 0; i < 3; i++) {
    const isCorrect = q3.answers[i].correct;
    const floors = isCorrect
      ? q4.answers.map(a => ({
          label: a.text,
          targetY: a.correct ? B2_GROUND_Y : B2_SECOND_Y,
          explanation: a.explanation,
          correct: a.correct
        }))
      : [];

    const elevator = new Elevator(scene, elevatorX, elevatorZs[i], floors);
    elevator.group.position.y = B2_TOP_Y;
    elevator.group.rotation.y = -Math.PI / 2;

    if (isCorrect) {
      const q4Label = createLabelMesh(q4.prompt, 1.0, {
        width: 320, height: 80, font: 'bold 16px system-ui, sans-serif'
      });
      q4Label.position.set(0, 2.0, -1.0);
      elevator.group.add(q4Label);
    }
    elevators.push(elevator);

    const ladder = new Ladder(elevator.group);
    ladders.push(ladder);

    createLabel(scene, q3.answers[i].text, b2MaxX + 1.0, B2_TOP_Y + 4.2, elevatorZs[i], -Math.PI / 2, 1.6);
  }
}

function buildRoadMC(q6) {
  // Sign at the 30% mark facing -z (toward the oncoming car).
  // Left lane = +x side of the road, right lane = -x side.
  createLabel(scene, q6.prompt, 51, B2_GROUND_Y + 9.5, FINAL_SIGN_Z, Math.PI, 3.0, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });
  createLabel(scene, q6.answers[0].text, 54, B2_GROUND_Y + 7.5, FINAL_SIGN_Z, Math.PI, 1.8);
  createLabel(scene, 'LEFT LANE', 54, B2_GROUND_Y + 9.0, FINAL_SIGN_Z, Math.PI, 1.0);
  createLabel(scene, q6.answers[1].text, 48, B2_GROUND_Y + 7.5, FINAL_SIGN_Z, Math.PI, 1.8);
  createLabel(scene, 'RIGHT LANE', 48, B2_GROUND_Y + 9.0, FINAL_SIGN_Z, Math.PI, 1.0);

  // Big finish sign at the end of the road pointing -z
  createLabel(scene, 'FINISH', 51, B2_GROUND_Y + 10, GOAL_Z - 1, Math.PI, 7.0, {
    width: 512, height: 128, font: 'bold 64px system-ui, sans-serif'
  });
}

function buildGarages(q5) {
  const garageZ = [-5, 0, 5];
  const garageX = 42;
  const garageDepth = 6;
  const garageWidth = 5;
  const garageHeight = 3.5;

  correctGarageIndex = q5.answers.findIndex(a => a.correct);

  for (let i = 0; i < 3; i++) {
    const z = garageZ[i];

    // Garage structure
    createBox(scene, garageX, B2_GROUND_Y, z, garageDepth, 0.2, garageWidth, 0x555555);
    createBox(scene, garageX, B2_GROUND_Y + garageHeight, z, garageDepth, 0.2, garageWidth, 0x555555);
    // Back wall on the spawn side (west)
    createBox(scene, garageX - garageDepth / 2, B2_GROUND_Y + garageHeight / 2, z,
      0.2, garageHeight, garageWidth, 0x666666);
    createBox(scene, garageX, B2_GROUND_Y + garageHeight / 2, z - garageWidth / 2,
      garageDepth, garageHeight, 0.2, 0x666666);
    createBox(scene, garageX, B2_GROUND_Y + garageHeight / 2, z + garageWidth / 2,
      garageDepth, garageHeight, 0.2, 0x666666);

    // Garage door on the goal-side face, facing +x
    const door = new GarageDoor(scene, garageX + garageDepth / 2, z, Math.PI / 2);
    garageDoors.push(door);

    // Label above the door
    createLabel(scene, q5.answers[i].text,
      garageX + garageDepth / 2 + 0.3, B2_GROUND_Y + garageHeight + 1.2, z,
      Math.PI / 2, 1.6);

    garageInstances.push({
      door,
      isCorrect: q5.answers[i].correct,
      truck: null,
      car: null,
      triggered: false
    });
  }

  // Question sign above the garages
  createLabel(scene, q5.prompt,
    garageX + garageDepth / 2 + 0.3, B2_GROUND_Y + garageHeight + 6.5, 0,
    Math.PI / 2, 3.5, {
      width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
    });
}

function buildLevel() {
  clearLevel();
  buildParkour(scrambledQuestions[0]);
  buildBuildingAndDoors(scrambledQuestions[1]);
  buildSecondBuilding(scrambledQuestions[2], scrambledQuestions[3]);
  buildGarages(scrambledQuestions[4]);
  buildRoadMC(scrambledQuestions[5]);
}

function scrambleAndBuild() {
  scrambledQuestions = GAME_CONFIG.questions.map(q => ({
    prompt: q.prompt,
    answers: shuffle(q.answers)
  }));
  buildLevel();
}

// -----------------------------------------------------------------------------
// Elevator floor menu
// -----------------------------------------------------------------------------
function buildFloorMenu(elevator) {
  floorButtons.innerHTML = '';
  elevator.floors.forEach((floor, index) => {
    const btn = document.createElement('button');
    btn.textContent = `${index + 1}: ${floor.label}`;
    btn.addEventListener('click', () => {
      startElevatorTravel(floor.targetY, index);
    });
    floorButtons.appendChild(btn);
  });
}

function startElevatorTravel(targetY, floorIndex) {
  if (!currentElevator) return;
  currentElevator.travelTo(targetY);
  floorMenu.classList.add('hidden');
  player.enabled = false;
  elevatorRideActive = true;
  selectedFloorIndex = floorIndex;
}

// -----------------------------------------------------------------------------
// Respawn / start
// -----------------------------------------------------------------------------
function resetPlayer() {
  camera.position.copy(SPAWN_POS);
  camera.rotation.copy(SPAWN_ROT);
  player.velocity.set(0, 0, 0);
  player.enabled = true;
  lastGroundY = camera.position.y;
}

function respawn() {
  dead = false;
  completed = false;
  stage = 0;
  pendingDeathReason = '';
  currentElevator = null;
  elevatorRideActive = false;
  selectedFloorIndex = -1;
  ladderHitNotified = false;
  groundFloorArrived = false;
  drivingCar = false;
  floorMenu.classList.add('hidden');
  deathScreen.classList.remove('show');
  completeScreen.classList.remove('show');
  startScreen.classList.add('hidden');
  scrambleAndBuild();
  resetPlayer();
  hideQuestionUI();
  player.lock();
}

function die(reason) {
  if (dead || completed) return;
  if (drivingCar && carInstance) {
    carInstance.exit(camera);
    scene.add(camera);
    drivingCar = false;
  }
  dead = true;
  player.enabled = false;
  player.controls.unlock();
  deathReason.textContent = reason;
  deathScreen.classList.add('show');
  hideQuestionUI();
  floorMenu.classList.add('hidden');
}

function complete() {
  if (dead || completed) return;
  completed = true;
  player.enabled = false;
  player.controls.unlock();
  completeScreen.classList.add('show');
  hideQuestionUI();
  floorMenu.classList.add('hidden');
}

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------
startScreen.addEventListener('click', () => {
  if (!gameStarted) {
    gameStarted = true;
    respawn();
  } else if (!dead && !completed && !drivingCar) {
    player.lock();
  }
});

player.controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
player.controls.addEventListener('unlock', () => {
  if (!dead && !completed && gameStarted && !drivingCar) {
    startScreen.classList.remove('hidden');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.repeat) return;

  if (event.code === 'KeyR' && (dead || completed)) {
    respawn();
    return;
  }

  if (event.code === 'KeyE' && gameStarted && !dead && !completed && !elevatorRideActive) {
    const playerPos = camera.getWorldPosition(new THREE.Vector3());

    // Enter the car if it is available and not still rolling out
    if (!drivingCar && carInstance && !carExitAnim) {
      const dist = playerPos.distanceTo(carInstance.group.position);
      if (dist < 3.5) {
        drivingCar = true;
        carExitAnim = null;
        carInstance.enter(camera);
        player.enabled = false;
        player.controls.unlock();
        return;
      }
    }

    // Open a garage door
    for (let i = 0; i < garageInstances.length; i++) {
      const g = garageInstances[i];
      if (!g.triggered && g.door.isPlayerInFront(playerPos)) {
        g.triggered = true;
        g.door.open();
        if (g.isCorrect) {
          const startZ = garageZFromIndex(i);
          // Start inside the garage, facing out toward the road (+x)
          g.car = new Car(scene, 42, startZ, -Math.PI / 2, 0xcc2222);
          carInstance = g.car;
          carExitAnim = {
            car: g.car,
            startX: 42,
            targetX: 51,
            startTime: performance.now(),
            driveDuration: 1500,
            turnDuration: 800,
            phase: 'drive'
          };
          setPrompt('Get in the car and drive to the goal');
        } else {
          g.truck = new Truck(scene, 39, garageZFromIndex(i), Math.PI / 2);
          g.truckActive = true;
        }
        return;
      }
    }

    // Open an elevator
    for (let i = 0; i < elevators.length; i++) {
      const elevator = elevators[i];
      if (elevator.isPlayerAtFront(playerPos) && !elevator.traveling && !elevator.departing) {
        elevator.openDoors();
        currentElevator = elevator;
        if (i !== correctElevatorIndex && !pendingDeathReason) {
          const wrongAnswer = scrambledQuestions[2].answers[i];
          pendingDeathReason = `Wrong answer: "${wrongAnswer.text}". ${wrongAnswer.explanation}`;
        }
        if (elevator.floors.length > 0) {
          buildFloorMenu(elevator);
        }
        return;
      }
    }
  }

  if (event.code.startsWith('Digit') && !floorMenu.classList.contains('hidden')) {
    const index = parseInt(event.code.slice(5), 10) - 1;
    if (currentElevator && index >= 0 && index < currentElevator.floors.length) {
      startElevatorTravel(currentElevator.floors[index].targetY, index);
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// -----------------------------------------------------------------------------
// Physics helpers
// -----------------------------------------------------------------------------
function collectFloors() {
  const floors = [];

  for (const mesh of levelMeshes) floors.push(getBoxFloor(mesh));
  for (const step of parkourSteps) floors.push(step.getFloorBox());

  for (const elevator of elevators) {
    floors.push(elevator.getFloorBox());
  }

  return floors;
}

function collectObstacles() {
  const obstacles = [];
  const playerPos = camera.getWorldPosition(new THREE.Vector3());

  if (playerPos.x > -16 && playerPos.x < 52) {
    for (const mesh of levelMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 1) obstacles.push(box);
    }
  }

  if (playerPos.x > 52) {
    for (const mesh of levelMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 1) obstacles.push(box);
    }
  }

  for (const elevator of elevators) {
    obstacles.push(...elevator.getObstacleBoxes());
  }

  return obstacles;
}

// -----------------------------------------------------------------------------
// Main loop
// -----------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const playerPos = camera.getWorldPosition(new THREE.Vector3());

  if (!gameStarted) {
    renderer.render(scene, camera);
    return;
  }

  // ---------------------------------------------------------------------------
  // World animations always run so the player can watch death sequences.
  // ---------------------------------------------------------------------------

  // Parkour step movement (visual only; death reasons handled below when alive)
  for (let i = 0; i < parkourSteps.length; i++) {
    const step = parkourSteps[i];
    step.update(dt, playerPos, player.velocity.y);
    if (step.triggered) {
      step.group.position.z += (step.slideDir || 1) * 12 * dt;
    }
  }

  // Doors animate regardless of death
  for (const door of doorInstances) {
    door.update(dt, playerPos);
  }

  // Elevators and ladders animate regardless of death
  for (let i = 0; i < elevators.length; i++) {
    const elevator = elevators[i];
    const ladder = ladders[i];

    const lastY = elevator.group.position.y;
    elevator.update(dt, playerPos);

    if (elevatorRideActive && elevator === currentElevator) {
      camera.position.y += elevator.group.position.y - lastY;
    }

    // Ladder animation
    const isWrongElevator = i !== correctElevatorIndex;
    const isWrongFloorArrival = (i === correctElevatorIndex) && (Math.abs(elevator.group.position.y - B2_SECOND_Y) < 0.1);
    const shouldLadderFall = isWrongElevator || isWrongFloorArrival;

    if (shouldLadderFall && elevator.doorOpen > 0.05 && !ladder.active) {
      ladder.spawn(elevator.isPlayerInside(playerPos));
    }

    if (ladder.active) {
      ladder.update(dt, elevator.doorOpen);
    }

    if (elevator.doorOpen < 0.05) {
      ladder.hide();
      ladderHitNotified = false;
    }
  }

  // Garage doors and wrong-garage trucks animate regardless of death
  for (let i = 0; i < garageInstances.length; i++) {
    const g = garageInstances[i];
    g.door.update(dt);

    if (g.truck && g.truckActive) {
      g.truck.group.position.x += 22 * dt;
      g.truck.group.updateWorldMatrix(true, false);
    }
  }

  // Car exit animation
  if (carExitAnim) {
    const anim = carExitAnim;
    const now = performance.now();
    if (anim.phase === 'drive') {
      const t = Math.min((now - anim.startTime) / anim.driveDuration, 1);
      const ease = t * (2 - t); // ease out
      anim.car.group.position.x = anim.startX + (anim.targetX - anim.startX) * ease;
      if (t >= 1) {
        anim.phase = 'turn';
        anim.startTime = now;
      }
    } else if (anim.phase === 'turn') {
      const t = Math.min((now - anim.startTime) / anim.turnDuration, 1);
      const startRot = -Math.PI / 2;
      const endRot = -Math.PI; // 90-degree clockwise turn, ends facing road direction (+z)
      anim.car.group.rotation.y = startRot + (endRot - startRot) * t;
      if (t >= 1) {
        carExitAnim = null;
      }
    }
  }

  // Final truck animation
  if (finalTruck) {
    finalTruck.group.position.z += finalTruckDir * 55 * dt;
    finalTruck.group.updateWorldMatrix(true, false);
  }

  // ---------------------------------------------------------------------------
  // Gameplay updates only while alive and not completed.
  // ---------------------------------------------------------------------------
  if (!dead && !completed) {
    // Stage progression
    if (stage === 0 && playerPos.x > -16) stage = 1;
    if (stage === 1 && playerPos.x > 52) stage = 2;
    if (stage === 3 && groundFloorArrived) stage = 4;

    // Parkour trap death reason
    for (let i = 0; i < parkourSteps.length; i++) {
      const step = parkourSteps[i];
      if (step.triggered && i === trickyStepIndex && !pendingDeathReason) {
        const wrongAnswer = scrambledQuestions[0].answers[i];
        pendingDeathReason = `Wrong answer: "${wrongAnswer.text}". ${wrongAnswer.explanation}`;
      }
    }

    // Door open detection
    for (let i = 0; i < doorInstances.length; i++) {
      const door = doorInstances[i];
      if (!doorTriggered[i] && door.angle > 0.35) {
        doorTriggered[i] = true;
        const answer = scrambledQuestions[1].answers[i];
        if (!answer.correct && !pendingDeathReason) {
          pendingDeathReason = `Wrong answer: "${answer.text}". ${answer.explanation}`;
        }
      }
    }

    // Elevator ride arrival logic
    for (let i = 0; i < elevators.length; i++) {
      const elevator = elevators[i];

      if (elevatorRideActive && elevator === currentElevator && !elevator.traveling && !elevator.departing) {
        elevatorRideActive = false;
        const targetY = currentElevator.targetY;
        if (Math.abs(targetY - B2_SECOND_Y) < 0.1) {
          // Wrong floor: ladder falls and kills
          stage = 3;
          const wrongAnswer = scrambledQuestions[3].answers[selectedFloorIndex];
          pendingDeathReason = `Wrong answer: "${wrongAnswer.text}". ${wrongAnswer.explanation}`;
        } else if (Math.abs(targetY - B2_TOP_Y) < 0.1) {
          // Returned to top floor (should not happen via floor menu)
          player.enabled = true;
        } else {
          // Ground floor: safe, move on to garage stage
          groundFloorArrived = true;
          player.enabled = true;
          setPrompt('Find the correct garage');
        }
      }

      // Ladder death check
      const ladder = ladders[i];
      if (ladder.active) {
        if (!ladderHitNotified && ladder.isHittingPlayer(playerPos)) {
          ladderHitNotified = true;
          die(pendingDeathReason || 'A ladder fell on you!');
        }
      }

      // Show floor menu inside the correct elevator at the top floor
      if (i === correctElevatorIndex &&
          !elevatorRideActive &&
          !elevator.traveling &&
          !elevator.departing &&
          Math.abs(elevator.group.position.y - B2_TOP_Y) < 0.1 &&
          isInsideElevatorLoose(elevator, playerPos) &&
          elevator.doorOpen > 0.9 &&
          elevator.isPlayerFacingDoor(camera)) {
        floorMenu.classList.remove('hidden');
        currentElevator = elevator;
        setPrompt('');
      } else if (i === correctElevatorIndex && floorMenu.classList.contains('hidden') === false && currentElevator === elevator) {
        // Only hide if the conditions are no longer met
        if (!isInsideElevatorLoose(elevator, playerPos) || elevator.doorOpen < 0.9) {
          floorMenu.classList.add('hidden');
        }
      }
    }

    // Prompt when standing in front of an elevator
    let atElevatorFront = false;
    for (const elevator of elevators) {
      if (elevator.isPlayerAtFront(playerPos) && !elevator.traveling && !elevator.departing && !elevatorRideActive) {
        atElevatorFront = true;
        break;
      }
    }
    if (atElevatorFront) {
      setPrompt('Press E to open the elevator');
    }

    // Wrong-garage truck collision
    for (let i = 0; i < garageInstances.length; i++) {
      const g = garageInstances[i];
      if (g.truck && g.truckActive) {
        const truckBox = new THREE.Box3().setFromObject(g.truck.group);
        const playerBox = new THREE.Box3().setFromCenterAndSize(
          playerPos,
          new THREE.Vector3(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2)
        );
        if (truckBox.intersectsBox(playerBox)) {
          const wrongAnswer = scrambledQuestions[4].answers[i];
          die(`Wrong answer: "${wrongAnswer.text}". ${wrongAnswer.explanation}`);
        }
      }
    }

    // Driving the car to the goal
    if (drivingCar && carInstance) {
      const throttle = Number(player.moveForward) - Number(player.moveBackward);
      const steering = Number(player.moveRight) - Number(player.moveLeft);
      carInstance.setInput(throttle, steering);
      carInstance.update(dt, roadBlocks);

      // Final MC: spawn a high-speed truck on the wrong lane halfway down the road
      if (!finalTruckSpawned && carInstance.group.position.z >= FINAL_TRUCK_TRIGGER_Z) {
        finalTruckSpawned = true;
        const q6 = scrambledQuestions[5];
        // answers[0] = left lane (+x side), answers[1] = right lane (-x side)
        const leftIsCorrect = q6.answers[0].correct;
        finalTruckDir = 1;
        // Truck travels from -z to +z on the wrong side of the road
        const truckX = leftIsCorrect ? 48 : 54;
        finalTruck = new Truck(scene, truckX, FINAL_TRUCK_Z_SPAWN, 0);
      }

      if (finalTruck) {
        const truckBox = new THREE.Box3().setFromObject(finalTruck.group);
        const carBox = new THREE.Box3().setFromObject(carInstance.group);
        if (truckBox.intersectsBox(carBox)) {
          const q6 = scrambledQuestions[5];
          const wrongAnswer = q6.answers.find(a => !a.correct);
          die(`Wrong lane: "${wrongAnswer.text}". ${wrongAnswer.explanation}`);
        }
      }

      if (carInstance.group.position.z >= GOAL_Z) {
        complete();
      }
    }

    // Prompt when standing in front of a garage door
    let atGarageFront = false;
    for (let i = 0; i < garageInstances.length; i++) {
      const g = garageInstances[i];
      if (!g.triggered && g.door.isPlayerInFront(playerPos)) {
        atGarageFront = true;
        break;
      }
    }
    if (atGarageFront && !drivingCar) {
      setPrompt('Press E to open the garage');
    } else if (!atElevatorFront && !drivingCar) {
      setPrompt('');
    }

    // Prompt to enter the car
    if (!drivingCar && carInstance && !carExitAnim) {
      const dist = playerPos.distanceTo(carInstance.group.position);
      if (dist < 3.5) {
        setPrompt('Press E to enter the car and drive to the goal');
      }
    }

    // Death by falling
    if (playerPos.y < GAME_CONFIG.fallDeathY) {
      die(pendingDeathReason || 'You fell. Choose more carefully next time.');
    }

    // Physics
    if (!drivingCar) {
      const floors = collectFloors();
      const obstacles = collectObstacles();
      player.update(dt, obstacles, floors);
    }

    // Track safe ground height and kill on excessive falls
    if (player.canJump) {
      lastGroundY = playerPos.y;
    } else if (player.velocity.y < 0 && lastGroundY - playerPos.y > MAX_FALL_DISTANCE) {
      die(pendingDeathReason || 'You fell too far.');
    }
  }

  renderer.render(scene, camera);
}

animate();
