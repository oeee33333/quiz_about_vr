import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class GarageDoor {
  constructor(scene, x, z, rotationY = 0) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    scene.add(this.group);

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const width = 4.2;
    const height = 3.0;
    const thick = 0.12;

    // Frame posts
    const postGeo = new THREE.BoxGeometry(0.25, height, thick);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-width / 2 + 0.125, height / 2, 0);
    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(width / 2 - 0.125, height / 2, 0);
    const header = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, thick), frameMat);
    header.position.set(0, height - 0.125, 0);
    this.group.add(leftPost, rightPost, header);

    // Moving panel
    this.panel = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, height - 0.25, 0.08), doorMat);
    this.panel.position.set(0, height / 2 - 0.125, 0);
    this.group.add(this.panel);

    this.closedY = height / 2 - 0.125;
    this.openY = height + 1.6;
    this.targetY = this.closedY;
  }

  open() {
    this.targetY = this.openY;
  }

  close() {
    this.targetY = this.closedY;
  }

  isPlayerInFront(playerPos) {
    const local = this.group.worldToLocal(playerPos.clone());
    return (
      local.x > -2.4 && local.x < 2.4 &&
      local.z > 0.5 && local.z < 4.0 &&
      local.y > -1 && local.y < 3.5
    );
  }

  getObstacleBox() {
    if (this.panel.position.y > this.closedY + 1.5) return null; // open enough
    this.panel.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.panel);
  }

  update(dt) {
    const dy = this.targetY - this.panel.position.y;
    if (Math.abs(dy) < 0.02) {
      this.panel.position.y = this.targetY;
    } else {
      this.panel.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 2.5 * dt);
    }
  }
}
