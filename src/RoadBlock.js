import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class RoadBlock {
  constructor(scene, x, z, width = 2, height = 1.2, depth = 0.6, rotationY = 0, color = 0xff6600) {
    this.group = new THREE.Group();
    this.group.position.set(x, height / 2, z);
    this.group.rotation.y = rotationY;
    scene.add(this.group);

    const blockMat = new THREE.MeshLambertMaterial({ color });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), blockMat);
    this.group.add(block);

    // White reflective stripes
    const stripeGeo = new THREE.BoxGeometry(width + 0.02, height * 0.12, depth + 0.02);
    const s1 = new THREE.Mesh(stripeGeo, stripeMat);
    s1.position.y = height * 0.25;
    this.group.add(s1);
    const s2 = new THREE.Mesh(stripeGeo, stripeMat);
    s2.position.y = -height * 0.25;
    this.group.add(s2);

    this.width = width;
    this.height = height;
    this.depth = depth;
  }

  getObstacleBox() {
    this.group.updateWorldMatrix(true, false);
    return new THREE.Box3().setFromObject(this.group);
  }

  getCarBox() {
    return this.getObstacleBox();
  }
}
