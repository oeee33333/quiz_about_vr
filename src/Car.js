import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Car {
  constructor(scene, x, z, rotationY = 0, color = 0xcc2222) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    scene.add(this.group);

    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x88ccff });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xffffcc });

    // Chassis - front faces -Z so the default camera direction (-Z) looks through the windshield
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4.2), bodyMat);
    chassis.position.set(0, 0.55, 0);
    this.group.add(chassis);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.2), cabinMat);
    cabin.position.set(0, 1.05, -0.2);
    this.group.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const positions = [
      [-0.9, 0.35, -1.3],
      [0.9, 0.35, -1.3],
      [-0.9, 0.35, 1.3],
      [0.9, 0.35, 1.3],
    ];
    for (const p of positions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(...p);
      this.group.add(w);
    }

    // Headlights / taillights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), lightMat);
    hl.position.set(-0.55, 0.6, -2.11);
    this.group.add(hl);
    const hr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), lightMat);
    hr.position.set(0.55, 0.6, -2.11);
    this.group.add(hr);

    const tlMat = new THREE.MeshLambertMaterial({ color: 0xff3333 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), tlMat);
    tl.position.set(-0.55, 0.6, 2.11);
    this.group.add(tl);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), tlMat);
    tr.position.set(0.55, 0.6, 2.11);
    this.group.add(tr);

    this.speed = 0;
    this.maxSpeed = 18;
    this.accel = 10;
    this.friction = 0.8;
    this.turnSpeed = 2.0;
    this.throttle = 0;
    this.steering = 0;
    this.steeringMode = 'mouse';
    this.entered = false;

    // Driver seat local position (left seat, looking forward = -Z)
    this.driverSeatLocal = new THREE.Vector3(-0.5, 1.1, -0.5);
    this.exitOffsetLocal = new THREE.Vector3(-1.4, 0, -0.5);
  }

  getDriverDoorWorldPos() {
    return this.group.localToWorld(new THREE.Vector3(-1.0, 0, -0.8));
  }

  enter(camera) {
    if (this.entered) return;
    this.entered = true;
    this.speed = 0;
    this.throttle = 0;
    this.steering = 0;

    this.group.add(camera);
    camera.position.copy(this.driverSeatLocal);
    camera.rotation.set(0, 0, 0);
  }

  exit(camera) {
    if (!this.entered) return;
    this.entered = false;
    this.throttle = 0;
    this.steering = 0;
    this.speed = 0;

    // Compute an exit point just outside the current driver door
    const exitPos = this.group.localToWorld(this.exitOffsetLocal.clone());
    exitPos.y = 1.6;

    // Detach from car; caller will attach camera back to the scene
    this.group.remove(camera);
    camera.position.copy(exitPos);
    camera.rotation.set(0, this.group.rotation.y, 0);
    camera.quaternion.setFromEuler(camera.rotation);
    return exitPos;
  }

  setInput(throttle, steering) {
    this.throttle = throttle;
    this.steering = steering;
  }

  setSteering(value) {
    this.steering = Math.max(-1, Math.min(1, value));
  }

  update(dt, roadBlocks = []) {
    if (!this.entered) return;

    this.speed += this.throttle * this.accel * dt;
    this.speed *= Math.max(0, 1 - this.friction * dt);
    this.speed = Math.max(-this.maxSpeed / 2, Math.min(this.maxSpeed, this.speed));

    if (Math.abs(this.speed) > 0.05) {
      this.group.rotation.y -= this.steering * this.turnSpeed * (this.speed / this.maxSpeed) * dt;
    }

    const oldPos = this.group.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
    this.group.position.addScaledVector(forward, this.speed * dt);

    // Keep within world
    const limit = 95;
    this.group.position.x = Math.max(-limit, Math.min(limit, this.group.position.x));
    this.group.position.z = Math.max(-limit, Math.min(limit, this.group.position.z));

    // Road-block collision: revert and stop on impact
    this.group.updateWorldMatrix(true, false);
    const carBox = new THREE.Box3().setFromObject(this.group);
    for (const block of roadBlocks) {
      if (block && block.getCarBox().intersectsBox(carBox)) {
        this.group.position.copy(oldPos);
        this.speed = 0;
        break;
      }
    }
  }

  getObstacleBox() {
    if (this.entered) return null;
    this.group.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(this.group);
    // Shrink slightly vertically so the player can step near it
    box.min.y = 0;
    box.max.y = 1.6;
    return box;
  }
}
