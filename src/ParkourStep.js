import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class ParkourStep {
  constructor(scene, x, z, width = 1.6, depth = 1.6, y = 0.5, isTricky = false, color = 0xccaa66) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    scene.add(this.group);

    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), mat);
    this.group.add(mesh);

    this.isTricky = isTricky;
    this.baseX = x;
    this.width = width;
    this.depth = depth;
    this.topY = y + 0.1;
    this.triggered = false;
  }

  getFloorBox() {
    this.group.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.group);
  }

  update(dt, playerPos, playerVelY) {
    if (!this.isTricky || this.triggered) return;

    const local = this.group.worldToLocal(playerPos.clone());
    const above = local.x > -this.width / 2 && local.x < this.width / 2 &&
                  local.z > -this.depth / 2 && local.z < this.depth / 2;
    const falling = playerVelY < 0;
    // Player is a bit above the step surface when they are about to land
    const close = local.y > -1.0 && local.y < 3.0;

    if (above && falling && close) {
      this.triggered = true;
    }
  }

  postUpdate(dt) {
    if (!this.triggered) return;
    // Slide sideways quickly once the player tries to land on it
    this.group.position.x += 12 * dt;
  }
}
