import * as THREE from 'three';
import { TerrainGenerator } from '../generation/TerrainGenerator';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import treeUrl from '../assets/MSB-Tree.glb?url';

export class Tree {
  public mesh: THREE.Group;
  public collisionRadius: number = 1.0;

  constructor(positionDir: THREE.Vector3, terrain: TerrainGenerator) {
    this.mesh = new THREE.Group();

    const loader = new GLTFLoader();
    loader.load(treeUrl, (gltf) => {
      const model = gltf.scene;
      
      // Randomize scale for variety
      const scale = 0.8 + Math.random() * 0.6;
      model.scale.set(scale, scale, scale);
      
      this.mesh.add(model);
    });

    // Snap to surface
    const surfaceData = terrain.getSurfaceData(positionDir);
    this.mesh.position.copy(surfaceData.point);

    // Align up vector
    this.mesh.up.copy(surfaceData.normal);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceData.normal);
    
    // Add a random rotation around its local Y axis for variety
    this.mesh.rotateY(Math.random() * Math.PI * 2);
  }
}
