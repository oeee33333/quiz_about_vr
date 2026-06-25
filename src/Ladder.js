import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Ladder {
  constructor(parentGroup, height = 3.0) {
    this.group = new THREE.Group();
    this.group.visible = false;
    parentGroup.add(this.group);

    this.height = height;
    this.leanAngle = 0.35;
    this.doorZ = 1.2;
    this.active = false;
    this.falling = false;

    const railMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const rungMat = new THREE.MeshLambertMaterial({ color: 0x666666 });

    const railGeo = new THREE.BoxGeometry(0.1, height, 0.1);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-0.35, height / 2, 0);
    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(0.35, height / 2, 0);
    this.group.add(leftRail, rightRail);

    const rungCount = 6;
    const rungGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06);
    for (let i = 1; i < rungCount; i++) {
      const y = (height * i) / rungCount;
      const rung = new THREE.Mesh(rungGeo, rungMat);
      rung.position.set(0, y, 0);
      this.group.add(rung);
    }
  }

  // Spawn just before the doors open. Orientation depends on where the player is.
  spawn(playerInside) {
    this.active = true;
    this.falling = false;
    this.group.visible = true;

    if (playerInside) {
      // Ladder leans from the outside; it will fall inward onto the player.
      this.fallAngle = -Math.PI / 2 + 0.05;
      this.group.position.set(0, 0, this.doorZ + this.height * Math.sin(this.leanAngle));
      this.group.rotation.x = -this.leanAngle;
    } else {
      // Ladder leans from the inside; it will fall outward onto the player.
      this.fallAngle = Math.PI / 2 - 0.05;
      this.group.position.set(0, 0, this.doorZ - this.height * Math.sin(this.leanAngle));
      this.group.rotation.x = this.leanAngle;
    }
  }

  hide() {
    this.active = false;
    this.falling = false;
    this.group.visible = false;
  }

  get hasFallen() {
    return Math.abs(this.group.rotation.x) > 1.0;
  }

  update(dt, doorOpen) {
    if (!this.active) return;

    if (doorOpen > 0.1 && !this.falling) {
      this.falling = true;
    }

    if (this.falling) {
      if (this.fallAngle > 0) {
        if (this.group.rotation.x < this.fallAngle) {
          this.group.rotation.x = Math.min(this.fallAngle, this.group.rotation.x + 3.0 * dt);
        }
      } else {
        if (this.group.rotation.x > this.fallAngle) {
          this.group.rotation.x = Math.max(this.fallAngle, this.group.rotation.x - 3.0 * dt);
        }
      }
    }

    if (doorOpen < 0.05) {
      this.hide();
    }
  }

  isHittingPlayer(playerPos) {
    if (!this.active) return false;
    const base = new THREE.Vector3();
    const top = new THREE.Vector3(0, this.height, 0);
    this.group.localToWorld(base);
    this.group.localToWorld(top);

    const seg = new THREE.Vector3().subVectors(top, base);
    const toPlayer = new THREE.Vector3().subVectors(playerPos, base);
    const lenSq = seg.lengthSq();
    let t = 0;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, toPlayer.dot(seg) / lenSq));
    }
    const closest = new THREE.Vector3().copy(base).addScaledVector(seg, t);
    return closest.distanceTo(playerPos) < 1.0;
  }
}
