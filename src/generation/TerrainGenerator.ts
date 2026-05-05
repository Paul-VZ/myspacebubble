import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export class TerrainGenerator {
  private noise3D: any;
  private radius: number;
  public mesh!: THREE.Mesh;
  public geometry!: THREE.IcosahedronGeometry;
  public gravity: number = 20;

  constructor(radius: number) {
    this.radius = radius;
  }

  public generatePlanet(seed: number, resolution: number): THREE.Mesh {
    let s = seed;
    this.gravity = 10 + Math.abs(Math.sin(s++)) * 25; // gravity between 10 and 35
    const random = () => {
      const x = Math.sin(s++) * 10000;
      return x - Math.floor(x);
    };
    this.noise3D = createNoise3D(random);

    this.geometry = new THREE.IcosahedronGeometry(this.radius, resolution);
    const posAttribute = this.geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      const nx = vertex.x / this.radius;
      const ny = vertex.y / this.radius;
      const nz = vertex.z / this.radius;
      
      const noiseVal = this.noise3D(nx * 1.5, ny * 1.5, nz * 1.5);
      const displacement = 1 + noiseVal * 0.12; // 12% variance
      
      vertex.multiplyScalar(displacement);
      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    this.geometry.computeVertexNormals();

    // Deterministic random for color
    const r = 0.2 + (Math.abs(Math.sin(s++))) * 0.8;
    const g = 0.2 + (Math.abs(Math.sin(s++))) * 0.8;
    const b = 0.2 + (Math.abs(Math.sin(s++))) * 0.8;
    const planetColor = new THREE.Color(r, g, b);

    const material = new THREE.MeshStandardMaterial({
      color: planetColor,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    // Custom shader for rim lighting
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vNormalView;
        `
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        vNormalView = normalize(normalMatrix * objectNormal);
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vNormalView;
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `
        #include <output_fragment>
        float rim = 1.0 - max(dot(vNormalView, vec3(0.0, 0.0, 1.0)), 0.0);
        rim = smoothstep(0.6, 1.0, rim);
        gl_FragColor = mix(gl_FragColor, vec4(0.8, 0.9, 1.0, 1.0), rim * 0.5);
        `
      );
    };

    this.mesh = new THREE.Mesh(this.geometry, material);

    // Create Bubble Aura
    const auraGeo = new THREE.SphereGeometry(this.radius * 1.35, 64, 64);
    const auraMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: planetColor }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vPositionNormal), 4.0);
          gl_FragColor = vec4(color, 1.0) * intensity * 1.5;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    const aura = new THREE.Mesh(auraGeo, auraMat);
    this.mesh.add(aura);

    return this.mesh;
  }

  // Returns the exact surface point and normal at a given direction from the center
  public getSurfaceData(direction: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
     const dir = direction.clone().normalize();
     const nx = dir.x;
     const ny = dir.y;
     const nz = dir.z;
     
     const noiseVal = this.noise3D(nx * 1.5, ny * 1.5, nz * 1.5);
     const displacement = 1 + noiseVal * 0.12;
     
     const point = dir.clone().multiplyScalar(this.radius * displacement);
     
     // Approximate normal via finite difference
     const eps = 0.01;
     const dx = dir.clone().add(new THREE.Vector3(eps, 0, 0)).normalize();
     const dy = dir.clone().add(new THREE.Vector3(0, eps, 0)).normalize();
     
     const ndx = this.noise3D(dx.x * 1.5, dx.y * 1.5, dx.z * 1.5);
     const px = dx.clone().multiplyScalar(this.radius * (1 + ndx * 0.12));
     
     const ndy = this.noise3D(dy.x * 1.5, dy.y * 1.5, dy.z * 1.5);
     const py = dy.clone().multiplyScalar(this.radius * (1 + ndy * 0.12));
     
     const tx = px.sub(point);
     const ty = py.sub(point);
     const normal = new THREE.Vector3().crossVectors(tx, ty).normalize();
     if (normal.dot(dir) < 0) normal.negate();
     
     return { point, normal };
  }
}
