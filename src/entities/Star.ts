import * as THREE from 'three';
import { TerrainGenerator } from '../generation/TerrainGenerator';

export class Star {
  public mesh: THREE.Mesh;
  public isCollected: boolean = false;
  
  constructor(positionDir: THREE.Vector3, terrain: TerrainGenerator) {
    const geometry = new THREE.OctahedronGeometry(0.8, 0);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffcc00, 
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Snap to surface
    const surfaceData = terrain.getSurfaceData(positionDir);
    // Float slightly above the surface
    this.mesh.position.copy(surfaceData.point.add(surfaceData.normal.multiplyScalar(1.5)));
    
    // Align up vector for rotation
    this.mesh.up.copy(surfaceData.normal);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceData.normal);
  }

  public update(dt: number) {
    if (this.isCollected) return;
    // Rotate around local Y axis
    this.mesh.rotateY(2 * dt);
    // Bob up and down
    const time = Date.now() * 0.003;
    this.mesh.translateY(Math.sin(time) * 0.02);
  }

  public collect() {
    this.isCollected = true;
    this.mesh.visible = false;
  }
}
