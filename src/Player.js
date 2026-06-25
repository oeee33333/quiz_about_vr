import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS, WALK_SPEED, WORLD_SIZE, GRAVITY, JUMP_SPEED } from './constants.js';

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.enabled = true;
    this.floorOffset = 0;
    this.canJump = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this._bindInput();
  }

  _bindInput() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));
  }

  _onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = true; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = true; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = true; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = true; break;
      case 'Space':
        if (this.canJump) {
          this.velocity.y = JUMP_SPEED;
          this.canJump = false;
        }
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': this.moveForward = false; break;
      case 'ArrowLeft':
      case 'KeyA': this.moveLeft = false; break;
      case 'ArrowDown':
      case 'KeyS': this.moveBackward = false; break;
      case 'ArrowRight':
      case 'KeyD': this.moveRight = false; break;
    }
  }

  getPosition() {
    return this.camera.position;
  }

  lock() {
    this.controls.lock();
  }

  update(dt, obstacles = [], floors = []) {
    if (!this.enabled || !this.controls.isLocked) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.velocity.y = 0;
      return;
    }

    this.velocity.x -= this.velocity.x * 10.0 * dt;
    this.velocity.z -= this.velocity.z * 10.0 * dt;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * WALK_SPEED * 10.0 * dt;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * WALK_SPEED * 10.0 * dt;

    this.controls.moveRight(-this.velocity.x * dt);
    this.controls.moveForward(-this.velocity.z * dt);

    const pos = this.camera.position;

    // Keep inside the world
    const limit = WORLD_SIZE / 2 - PLAYER_RADIUS;
    pos.x = Math.max(-limit, Math.min(limit, pos.x));
    pos.z = Math.max(-limit, Math.min(limit, pos.z));

    // Gravity and floor collision
    this.velocity.y -= GRAVITY * dt;
    pos.y += this.velocity.y * dt;

    // Find the highest floor that is close enough to land on.
    // Shrink the floor bounds by the player radius so bumping the side of a
    // platform does not teleport the player on top of it.
    let landingFloor = null;
    const candidates = floors
      .filter(f =>
        f &&
        pos.x >= f.min.x + PLAYER_RADIUS &&
        pos.x <= f.max.x - PLAYER_RADIUS &&
        pos.z >= f.min.z + PLAYER_RADIUS &&
        pos.z <= f.max.z - PLAYER_RADIUS
      )
      .sort((a, b) => b.max.y - a.max.y);

    for (const floor of candidates) {
      if (pos.y >= floor.max.y - 0.5) {
        landingFloor = floor;
        break;
      }
    }

    const floorY = landingFloor ? landingFloor.max.y : 0;

    if (pos.y <= floorY + PLAYER_HEIGHT && pos.y >= floorY - 0.5 && this.velocity.y <= 0) {
      pos.y = floorY + PLAYER_HEIGHT;
      this.velocity.y = 0;
      this.canJump = true;
    } else {
      this.canJump = false;
    }

    // Simple AABB collision resolution against static obstacles
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      pos,
      new THREE.Vector3(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2)
    );

    for (const box of obstacles) {
      if (!box || !box.intersectsBox(playerBox)) continue;
      const cx = (box.min.x + box.max.x) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      const overlapX = Math.min(playerBox.max.x - box.min.x, box.max.x - playerBox.min.x);
      const overlapZ = Math.min(playerBox.max.z - box.min.z, box.max.z - playerBox.min.z);
      if (overlapX < overlapZ) {
        pos.x += pos.x < cx ? -overlapX : overlapX;
      } else {
        pos.z += pos.z < cz ? -overlapZ : overlapZ;
      }
      playerBox.setFromCenterAndSize(pos, new THREE.Vector3(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2));
    }
  }
}
