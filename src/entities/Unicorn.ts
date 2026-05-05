import * as THREE from 'three';
import { TerrainGenerator } from '../generation/TerrainGenerator';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import unicornUrl from '../assets/MSB-Unicorn.glb?url';

export class Unicorn {
  public mesh: THREE.Group;
  public isCollected: boolean = false;
  
  constructor(positionDir: THREE.Vector3, terrain: TerrainGenerator) {
    this.mesh = new THREE.Group();
    
    const loader = new GLTFLoader();
    loader.load(unicornUrl, (gltf) => {
      const model = gltf.scene;
      model.scale.set(1.5, 1.5, 1.5);
      model.position.y = 1.0; // lift it slightly above pivot
      this.mesh.add(model);
    });

    // Snap to surface
    const surfaceData = terrain.getSurfaceData(positionDir);
    // Float above the surface
    this.mesh.position.copy(surfaceData.point.add(surfaceData.normal.multiplyScalar(2.0)));
    
    // Align up vector
    this.mesh.up.copy(surfaceData.normal);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceData.normal);
  }

  public update(dt: number) {
    if (this.isCollected) return;
    
    // Spin around its local Y axis
    this.mesh.rotateY(4 * dt);
    
    // Bob up and down
    const time = Date.now() * 0.005;
    this.mesh.translateY(Math.sin(time) * 0.03);
  }

  public collect() {
    this.isCollected = true;
    this.mesh.visible = false;
  }
}
