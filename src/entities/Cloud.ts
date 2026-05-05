import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import cloudUrl from '../assets/MSB-Cloud.glb?url';

export class Cloud {
  public mesh: THREE.Group;
  public orbitGroup: THREE.Group;
  private orbitAxis: THREE.Vector3;
  private orbitSpeed: number;

  constructor(positionDir: THREE.Vector3, altitude: number) {
    this.orbitGroup = new THREE.Group();
    this.mesh = new THREE.Group();
    
    // Position the cloud high above the surface along local Y
    this.mesh.position.set(0, altitude, 0);
    
    this.orbitGroup.add(this.mesh);
    
    // Point the orbit group in the requested initial direction
    this.orbitGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), positionDir);

    // Random orbit axis and speed
    this.orbitAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    
    // Slow drifting speed
    this.orbitSpeed = (Math.random() * 0.1 + 0.05) * (Math.random() > 0.5 ? 1 : -1);

    const loader = new GLTFLoader();
    loader.load(cloudUrl, (gltf) => {
      const model = gltf.scene;
      
      // Randomize scale for variety
      const scale = 3.0 + Math.random() * 4.0;
      model.scale.set(scale, scale, scale);
      
      // Randomly rotate the cloud model itself so they don't all look identical
      model.rotation.y = Math.random() * Math.PI * 2;
      model.rotation.z = (Math.random() - 0.5) * 0.5;
      
      this.mesh.add(model);
    });
  }

  public update(dt: number) {
    // Drifting clouds globally around the planet
    this.orbitGroup.rotateOnWorldAxis(this.orbitAxis, this.orbitSpeed * dt);
  }
}
