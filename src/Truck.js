import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Truck {
  constructor(scene, x, z, rotationY = 0) {
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotationY;
    scene.add(this.group);

    const cabMat = new THREE.MeshLambertMaterial({ color: 0x3366cc });
    const trailerMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 2.8), cabMat);
    cab.position.set(0, 1.6, 2.8);
    this.group.add(cab);

    // Trailer
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 7.0), trailerMat);
    trailer.position.set(0, 2.6, -2.0);
    this.group.add(trailer);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const positions = [
      [-1.2, 0.55, 3.4],
      [1.2, 0.55, 3.4],
      [-1.2, 0.55, 1.6],
      [1.2, 0.55, 1.6],
      [-1.2, 0.55, -4.2],
      [1.2, 0.55, -4.2],
      [-1.2, 0.55, -2.5],
      [1.2, 0.55, -2.5],
    ];
    for (const p of positions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(...p);
      this.group.add(w);
    }
  }

  getObstacleBox() {
    this.group.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(this.group);
    box.min.y = 0;
    box.max.y = 2.2;
    return box;
  }
}
