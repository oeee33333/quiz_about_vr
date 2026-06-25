import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PLAYER_HEIGHT, PLAYER_RADIUS } from './constants.js';

export class HingeDoor {
  constructor(scene, x, z, rotationY = 0) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    scene.add(this.group);

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xa06b3e, side: THREE.DoubleSide });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Frame
    const postGeo = new THREE.BoxGeometry(0.2, 2.6, 0.2);
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(-1.1, 1.3, 0);
    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(1.1, 1.3, 0);
    const topGeo = new THREE.BoxGeometry(2.4, 0.2, 0.2);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.set(0, 2.6, 0);
    this.group.add(leftPost, rightPost, top);

    // Hinge pivot on the left side
    this.pivot = new THREE.Group();
    this.pivot.position.set(-1, 0, 0);
    this.group.add(this.pivot);

    // Door leaf
    const leafGeo = new THREE.BoxGeometry(2, 2.5, 0.1);
    this.leaf = new THREE.Mesh(leafGeo, leafMat);
    this.leaf.position.set(1, 1.25, 0);
    this.pivot.add(this.leaf);

    // Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.06), darkMat);
    handle.position.set(1.7, 1.25, 0.1);
    this.pivot.add(handle);

    this.angle = 0;
    this.targetAngle = 0;
    this.openDir = 1; // +1 opens inward, -1 opens outward
  }

  push() {
    this.targetAngle = this.openDir * (Math.PI / 2 + 0.25); // ~103 degrees
  }

  reset() {
    this.targetAngle = 0;
  }

  getObstacleBox() {
    // Once the door is mostly open it stops colliding
    if (Math.abs(this.angle) > 0.6) return null;
    this.leaf.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.leaf);
  }

  update(dt, playerPos) {
    // Smoothly animate
    const speed = 2.5;
    if (this.angle < this.targetAngle) {
      this.angle = Math.min(this.targetAngle, this.angle + speed * dt);
    } else if (this.angle > this.targetAngle) {
      this.angle = Math.max(this.targetAngle, this.angle - speed * dt);
    }
    this.pivot.rotation.y = this.angle;

    // Detect push while the door is closed
    if (this.angle < 0.2) {
      const box = this.getObstacleBox();
      if (!box) return;
      const playerBox = new THREE.Box3().setFromCenterAndSize(
        playerPos,
        new THREE.Vector3(PLAYER_RADIUS * 2, PLAYER_HEIGHT, PLAYER_RADIUS * 2)
      );
      if (box.intersectsBox(playerBox)) {
        this.push();
      }
    }
  }
}
