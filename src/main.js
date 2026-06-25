import * as THREE from 'three';
import { Player } from './Player.js';
import { HingeDoor } from './HingeDoor.js';
import { ParkourStep } from './ParkourStep.js';
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
let stage = 0; // 0 = parkour question, 1 = door question, 2 = done
let dead = false;
let completed = false;
let gameStarted = false;

// Level object references (cleared on respawn)
let levelMeshes = [];
let parkourSteps = [];
let doorInstances = [];
let doorTriggered = [];
let labelMeshes = [];
let trickyStepIndex = -1;
let pendingDeathReason = '';

const SPAWN_POS = new THREE.Vector3(-40, GAME_CONFIG.spawnY + PLAYER_HEIGHT, 0);
const SPAWN_ROT = new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ');

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

// -----------------------------------------------------------------------------
// Level building
// -----------------------------------------------------------------------------
function clearLevel() {
  for (const mesh of levelMeshes) scene.remove(mesh);
  for (const mesh of labelMeshes) scene.remove(mesh);
  for (const step of parkourSteps) scene.remove(step.group);
  for (const door of doorInstances) scene.remove(door.group);

  levelMeshes = [];
  labelMeshes = [];
  parkourSteps = [];
  doorInstances = [];
  doorTriggered = [];
  trickyStepIndex = -1;
  pendingDeathReason = '';
}

function buildParkour(q1) {
  const y0 = GAME_CONFIG.spawnY;

  // Spawn platform
  createBox(scene, -40, y0, 0, 7, 0.2, 7, 0x888888);

  // First step
  createBox(scene, -32, y0 - 0.5, 0, 5, 0.2, 5, 0xccaa66);

  // Middle split: two larger platforms separated horizontally, one is wrong and slides away sideways
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

  // Slide outward (away from the centre path) when triggered
  leftStep.slideDir = -1;
  rightStep.slideDir = 1;

  // Question sign spanning above both answer platforms
  createLabel(scene, q1.prompt, -26, y0 + 4.2, 0, -Math.PI / 2, 3.5, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });

  // Answer labels on each platform
  createLabel(scene, leftAnswer.text, -26, y0 + 1.7, leftZ, -Math.PI / 2, 1.6);
  createLabel(scene, rightAnswer.text, -26, y0 + 1.7, rightZ, -Math.PI / 2, 1.6);

  // Entrance platform leading into the building
  createBox(scene, -18, y0 - 1.5, 0, 5, 0.2, 5, 0x66cc66);
}

function buildBuildingAndDoors(q2) {
  const floorY = GAME_CONFIG.spawnY - 1.5;
  const buildingMinX = -14;
  const buildingMaxX = 10;
  const buildingZ = 10;
  const wallHeight = 16;

  // Main floor
  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY, 0,
    buildingMaxX - buildingMinX, 0.2, buildingZ * 2, 0x999999);

  // Back wall with entrance gap at z=0
  createBox(scene, buildingMinX, floorY + wallHeight / 2, -6, 0.4, wallHeight, 8, 0x666666);
  createBox(scene, buildingMinX, floorY + wallHeight / 2, 6, 0.4, wallHeight, 8, 0x666666);
  createBox(scene, buildingMinX, floorY + wallHeight + 1.5, 0, 0.4, 3, 4, 0x666666);

  // Side walls
  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight / 2, -buildingZ,
    buildingMaxX - buildingMinX, wallHeight, 0.4, 0x666666);
  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight / 2, buildingZ,
    buildingMaxX - buildingMinX, wallHeight, 0.4, 0x666666);

  // Front wall: lower segments between door frames + one continuous strip above the doors
  const doorZs = [-4.5, -1.5, 1.5, 4.5];
  const wallOverlap = 1.15;
  const lowerWallSegments = [
    [-buildingZ, doorZs[0] - wallOverlap],
    [doorZs[0] + wallOverlap, doorZs[1] - wallOverlap],
    [doorZs[1] + wallOverlap, doorZs[2] - wallOverlap],
    [doorZs[2] + wallOverlap, doorZs[3] - wallOverlap],
    [doorZs[3] + wallOverlap, buildingZ]
  ];
  const lowerWallHeight = 2.6;
  for (const [zMin, zMax] of lowerWallSegments) {
    const centerZ = (zMin + zMax) / 2;
    const depth = zMax - zMin;
    createBox(scene, buildingMaxX, floorY + lowerWallHeight / 2, centerZ, 0.4, lowerWallHeight, depth, 0x666666);
  }
  createBox(scene, buildingMaxX, floorY + (wallHeight + lowerWallHeight) / 2, 0,
    0.4, wallHeight - lowerWallHeight, buildingZ * 2, 0x666666);

  // Roof
  createBox(scene, (buildingMinX + buildingMaxX) / 2, floorY + wallHeight, 0,
    buildingMaxX - buildingMinX, 0.2, buildingZ * 2, 0x555555);

  // Doors
  const doorZPositions = [-4.5, -1.5, 1.5, 4.5];
  for (let i = 0; i < 4; i++) {
    const door = new HingeDoor(scene, buildingMaxX, doorZPositions[i], -Math.PI / 2);
    door.group.position.y = floorY;
    doorInstances.push(door);
    doorTriggered.push(false);
  }


  // Question sign above the door row
  createLabel(scene, q2.prompt, buildingMaxX - 0.3, floorY + 6.5, 0, -Math.PI / 2, 3.5, {
    width: 640, height: 160, font: 'bold 34px system-ui, sans-serif'
  });

  // Answer labels above each door
  for (let i = 0; i < 4; i++) {
    createLabel(scene, q2.answers[i].text, buildingMaxX - 0.3, floorY + 3.6, doorZPositions[i], -Math.PI / 2, 1.6);
  }

  // Build bridge behind the correct door (slightly lower so it doesn't clip through the wall/floor)
  const correctDoorIndex = q2.answers.findIndex(a => a.correct);
  const correctZ = doorZPositions[correctDoorIndex];
  const bridgeStart = buildingMaxX - 0.5;
  const bridgeEnd = 45;
  const bridgeLength = bridgeEnd - bridgeStart;
  const bridgeY = floorY - 0.3;
  createBox(scene, (bridgeStart + bridgeEnd) / 2, bridgeY, correctZ, bridgeLength, 0.2, 5, 0x8b5a2b);

  // End platform
  createBox(scene, 50, bridgeY, correctZ, 6, 0.2, 6, 0x55aa55);
  createLabel(scene, 'Goal', 50, bridgeY + 2.4, correctZ, -Math.PI / 2, 1.5);
}

function buildLevel() {
  clearLevel();
  buildParkour(scrambledQuestions[0]);
  buildBuildingAndDoors(scrambledQuestions[1]);
}

function scrambleAndBuild() {
  scrambledQuestions = GAME_CONFIG.questions.map(q => ({
    prompt: q.prompt,
    answers: shuffle(q.answers)
  }));
  buildLevel();
}

// -----------------------------------------------------------------------------
// Respawn / start
// -----------------------------------------------------------------------------
function resetPlayer() {
  camera.position.copy(SPAWN_POS);
  camera.rotation.copy(SPAWN_ROT);
  player.velocity.set(0, 0, 0);
  player.enabled = true;
}

function respawn() {
  dead = false;
  completed = false;
  stage = 0;
  pendingDeathReason = '';
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
  dead = true;
  player.enabled = false;
  player.controls.unlock();
  deathReason.textContent = reason;
  deathScreen.classList.add('show');
  hideQuestionUI();
}

function complete() {
  if (dead || completed) return;
  completed = true;
  player.enabled = false;
  player.controls.unlock();
  completeScreen.classList.add('show');
  hideQuestionUI();
}

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------
startScreen.addEventListener('click', () => {
  if (!gameStarted) {
    gameStarted = true;
    respawn();
  } else if (!dead && !completed) {
    player.lock();
  }
});

player.controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
player.controls.addEventListener('unlock', () => {
  if (!dead && !completed && gameStarted) {
    startScreen.classList.remove('hidden');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR' && (dead || completed)) {
    respawn();
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

  return floors;
}

function collectObstacles() {
  const obstacles = [];
  const playerPos = camera.getWorldPosition(new THREE.Vector3());

  // Building walls act as obstacles once the player is near/inside the building.
  if (playerPos.x > -16) {
    for (const mesh of levelMeshes) {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 1) {
        obstacles.push(box);
      }
    }
  }

  // Doors are intentionally NOT obstacles; the player pushes them open on contact.

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

  if (!dead && !completed) {
    // Stage progression
    if (stage === 0 && playerPos.x > -16) {
      stage = 1;
    }

    // Parkour step updates and trap detection
    for (let i = 0; i < parkourSteps.length; i++) {
      const step = parkourSteps[i];
      step.update(dt, playerPos, player.velocity.y);

      // Slide the wrong platform sideways once the player tries to land on it
      if (step.triggered) {
        step.group.position.z += (step.slideDir || 1) * 12 * dt;
      }

      if (step.triggered && i === trickyStepIndex && !pendingDeathReason) {
        const wrongAnswer = scrambledQuestions[0].answers[i];
        pendingDeathReason = `Wrong answer: "${wrongAnswer.text}". ${wrongAnswer.explanation}`;
      }
    }

    // Door open detection
    for (let i = 0; i < doorInstances.length; i++) {
      const door = doorInstances[i];
      door.update(dt, playerPos);
      if (!doorTriggered[i] && door.angle > 0.35) {
        doorTriggered[i] = true;
        const answer = scrambledQuestions[1].answers[i];
        if (!answer.correct && !pendingDeathReason) {
          pendingDeathReason = `Wrong answer: "${answer.text}". ${answer.explanation}`;
        }
      }
    }

    // Death by falling
    if (playerPos.y < GAME_CONFIG.fallDeathY) {
      die(pendingDeathReason || 'You fell. Choose more carefully next time.');
    }

    // Completion: reached the end platform
    if (playerPos.x > 47 && Math.abs(playerPos.z) < 5) {
      complete();
    }

    // Physics
    const floors = collectFloors();
    const obstacles = collectObstacles();
    player.update(dt, obstacles, floors);
  }

  renderer.render(scene, camera);
}

animate();
