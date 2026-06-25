import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from './constants.js';

export class Elevator {
  constructor(scene, x, z, floors) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    scene.add(this.group);

    this.floors = floors; // [{label, targetY}]
    this.currentY = 0;
    this.targetY = 0;
    this.departing = false;
    this.traveling = false;

    this.doorOpen = 0; // 0 closed, 1 open
    this.doorTarget = 0;

    const wallMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

    const width = 2.4;
    const depth = 2.4;
    const height = 3.0;
    const thick = 0.15;

    // Back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, thick), wallMat);
    back.position.set(0, height / 2, -depth / 2);
    this.group.add(back);

    // Side walls
    const left = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth), wallMat);
    left.position.set(-width / 2, height / 2, 0);
    this.group.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth), wallMat);
    right.position.set(width / 2, height / 2, 0);
    this.group.add(right);

    // Floor and ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), floorMat);
    floor.position.set(0, thick / 2, 0);
    this.group.add(floor);
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), floorMat);
    ceiling.position.set(0, height - thick / 2, 0);
    this.group.add(ceiling);

    // Front frame posts (beside the door opening)
    const postGeo = new THREE.BoxGeometry(0.25, height, thick);
    const leftPost = new THREE.Mesh(postGeo, wallMat);
    leftPost.position.set(-width / 2 + 0.125, height / 2, depth / 2);
    this.group.add(leftPost);
    const rightPost = new THREE.Mesh(postGeo, wallMat);
    rightPost.position.set(width / 2 - 0.125, height / 2, depth / 2);
    this.group.add(rightPost);
    const header = new THREE.Mesh(new THREE.BoxGeometry(width - 0.5, 0.25, thick), wallMat);
    header.position.set(0, height - 0.125, depth / 2);
    this.group.add(header);

    // Sliding doors (nearly meet in the middle so there is no visible gap when closed)
    const doorWidth = width / 2 - 0.01;
    this.leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, height - 0.3, 0.08), doorMat);
    this.leftDoor.position.set(-width / 4 + 0.05, height / 2 - 0.05, depth / 2);
    this.group.add(this.leftDoor);

    this.rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, height - 0.3, 0.08), doorMat);
    this.rightDoor.position.set(width / 4 - 0.05, height / 2 - 0.05, depth / 2);
    this.group.add(this.rightDoor);

    this.closedLeft = -width / 4 + 0.05;
    this.openLeft = -width / 2 + 0.15;
    this.closedRight = width / 4 - 0.05;
    this.openRight = width / 2 - 0.15;

    // Interior button panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.05), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    panel.position.set(width / 2 - 0.2, 1.4, depth / 2 - 0.1);
    this.group.add(panel);

    this.width = width;
    this.depth = depth;
    this.height = height;
    this.thick = thick;
  }

  openDoors() {
    this.doorTarget = 1;
  }

  closeDoors() {
    this.doorTarget = 0;
  }

  travelTo(y) {
    this.closeDoors();
    this.targetY = y;
    this.departing = true;
    this.traveling = false;
  }

  // Transform a local-direction vector to world space (ignores position).
  _localDirToWorld(v) {
    return v.clone().applyEuler(this.group.rotation).normalize();
  }

  isPlayerFacingDoor(camera) {
    const worldDir = new THREE.Vector3();
    camera.getWorldDirection(worldDir);
    // Door faces +Z in local space.
    const doorDir = this._localDirToWorld(new THREE.Vector3(0, 0, 1));
    return worldDir.dot(doorDir) > 0.5;
  }

  _localPlayerPos(playerPos) {
    return this.group.worldToLocal(playerPos.clone());
  }

  isPlayerInside(playerPos) {
    const local = this._localPlayerPos(playerPos);
    return (
      local.x > -0.95 && local.x < 0.95 &&
      local.z > -0.95 && local.z < 0.95 &&
      local.y > 0 && local.y < 2.9
    );
  }

  isPlayerAtFront(playerPos) {
    const local = this._localPlayerPos(playerPos);
    return (
      local.x > -1.1 && local.x < 1.1 &&
      local.z > 1.0 && local.z < 3.5 &&
      local.y > -1 && local.y < 3
    );
  }

  // Compute a world-space AABB from a local-space AABB.
  _worldBox(localMin, localMax) {
    this.group.updateMatrixWorld(true);
    const points = [
      new THREE.Vector3(localMin.x, localMin.y, localMin.z),
      new THREE.Vector3(localMin.x, localMin.y, localMax.z),
      new THREE.Vector3(localMin.x, localMax.y, localMin.z),
      new THREE.Vector3(localMin.x, localMax.y, localMax.z),
      new THREE.Vector3(localMax.x, localMin.y, localMin.z),
      new THREE.Vector3(localMax.x, localMin.y, localMax.z),
      new THREE.Vector3(localMax.x, localMax.y, localMin.z),
      new THREE.Vector3(localMax.x, localMax.y, localMax.z)
    ];
    const worldBox = new THREE.Box3();
    for (const p of points) {
      worldBox.expandByPoint(this.group.localToWorld(p));
    }
    return worldBox;
  }

  getObstacleBoxes() {
    const boxes = [];
    const w = this.width / 2;
    const d = this.depth / 2;
    const h = this.height;
    const t = this.thick;
    const guard = 2.5; // extra thickness outward to stop fast players tunneling through

    // Back wall (thickened outward, away from interior)
    boxes.push(this._worldBox(
      new THREE.Vector3(-w, 0, -d - t - guard),
      new THREE.Vector3(w, h, -d)
    ));
    // Left wall (thickened outward)
    boxes.push(this._worldBox(
      new THREE.Vector3(-w - t - guard, 0, -d),
      new THREE.Vector3(-w, h, d)
    ));
    // Right wall (thickened outward)
    boxes.push(this._worldBox(
      new THREE.Vector3(w, 0, -d),
      new THREE.Vector3(w + t + guard, h, d)
    ));

    // Front posts/header/doors only if doors are closed
    if (this.doorOpen < 0.1) {
      // Left post
      boxes.push(this._worldBox(
        new THREE.Vector3(-w, 0, d),
        new THREE.Vector3(-w + 0.25, h, d + t + guard)
      ));
      // Right post
      boxes.push(this._worldBox(
        new THREE.Vector3(w - 0.25, 0, d),
        new THREE.Vector3(w, h, d + t + guard)
      ));
      // Header
      boxes.push(this._worldBox(
        new THREE.Vector3(-w, h - 0.25, d),
        new THREE.Vector3(w, h, d + t + guard)
      ));
      // Closed door panels
      const doorW = this.width / 2 - 0.01;
      boxes.push(this._worldBox(
        new THREE.Vector3(this.closedLeft - doorW / 2, 0, d - 0.05),
        new THREE.Vector3(this.closedLeft + doorW / 2, h - 0.3, d + 0.05)
      ));
      boxes.push(this._worldBox(
        new THREE.Vector3(this.closedRight - doorW / 2, 0, d - 0.05),
        new THREE.Vector3(this.closedRight + doorW / 2, h - 0.3, d + 0.05)
      ));
    }

    return boxes;
  }

  getFloorBox() {
    const w = this.width / 2;
    const d = this.depth / 2;
    const t = this.thick;
    const r = PLAYER_RADIUS;
    // Extend 1.0 m past the front (local +z) to bridge the building floor,
    // and expand horizontally by the player radius so the player can stand
    // right against the side/back walls without losing floor support.
    return this._worldBox(
      new THREE.Vector3(-w - r, 0, -d - r),
      new THREE.Vector3(w + r, t, d + 1.0 + r)
    );
  }

  update(dt, playerPos) {
    // Animate doors
    const doorSpeed = 2.0;
    if (this.doorOpen < this.doorTarget) {
      this.doorOpen = Math.min(this.doorTarget, this.doorOpen + doorSpeed * dt);
    } else if (this.doorOpen > this.doorTarget) {
      this.doorOpen = Math.max(this.doorTarget, this.doorOpen - doorSpeed * dt);
    }

    this.leftDoor.position.x = this.closedLeft + (this.openLeft - this.closedLeft) * this.doorOpen;
    this.rightDoor.position.x = this.closedRight + (this.openRight - this.closedRight) * this.doorOpen;

    // Close doors before moving
    if (this.departing) {
      if (this.doorOpen < 0.05) {
        this.departing = false;
        this.traveling = true;
      }
    }

    // Travel
    if (this.traveling) {
      const dy = this.targetY - this.group.position.y;
      if (Math.abs(dy) < 0.02) {
        this.group.position.y = this.targetY;
        this.currentY = this.targetY;
        this.traveling = false;
        this.openDoors();
      } else {
        this.group.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 4.0 * dt);
      }
    }
  }
}
