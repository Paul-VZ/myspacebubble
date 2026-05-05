import './style.css';
import * as THREE from 'three';
import { state } from './core/GameState';
import { TerrainGenerator } from './generation/TerrainGenerator';
import { Player } from './entities/Player';
import { Star } from './entities/Star';
import { Unicorn } from './entities/Unicorn';
import { Tree } from './entities/Tree';
import { Cloud } from './entities/Cloud';
import bgMusicUrl from './assets/Risian-MapsWithoutNames.mp3';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  private terrain!: TerrainGenerator;
  private player!: Player;
  private stars: Star[] = [];
  private trees: Tree[] = [];
  private clouds: Cloud[] = [];
  private unicorn: Unicorn | null = null;
  private rainbow: THREE.Mesh | null = null;
  private planetRadius = 30;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);
    this.scene.fog = new THREE.FogExp2(0x020208, 0.015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const appDiv = document.getElementById('app');
    if (appDiv) appDiv.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.initLevel();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.renderer.setAnimationLoop(this.animate.bind(this));
    this.setupAudio();
  }

  private setupAudio() {
    const bgMusic = new Audio(bgMusicUrl);
    bgMusic.loop = true;
    bgMusic.volume = 0.2;

    const playMusic = () => {
      if (bgMusic.paused) {
        bgMusic.play().catch(e => console.log('Autoplay prevented', e));
      }
    };

    // Browsers require user interaction before playing audio
    window.addEventListener('click', playMusic, { once: true });
    window.addEventListener('keydown', playMusic, { once: true });

    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        bgMusic.volume = parseInt((e.target as HTMLInputElement).value) / 100;
      });
    }
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1);
    dirLight.position.set(1, 1, 0).normalize();
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.8);
    backLight.position.set(-1, -0.5, -1).normalize();
    this.scene.add(backLight);
    
    // Add a subtle rim light from bottom
    const bottomLight = new THREE.DirectionalLight(0x6622aa, 0.5);
    bottomLight.position.set(0, -1, 0).normalize();
    this.scene.add(bottomLight);
  }

  private initLevel() {
    if (this.terrain && this.terrain.mesh) {
      this.scene.remove(this.terrain.mesh);
    }
    if (this.player && this.player.mesh) {
      this.scene.remove(this.player.mesh);
    }
    this.stars.forEach(star => this.scene.remove(star.mesh));
    this.stars = [];
    this.trees.forEach(tree => this.scene.remove(tree.mesh));
    this.trees = [];
    this.clouds.forEach(cloud => this.scene.remove(cloud.orbitGroup));
    this.clouds = [];
    if (this.unicorn && this.unicorn.mesh) {
      this.scene.remove(this.unicorn.mesh);
      this.unicorn = null;
    }
    if (this.rainbow) {
      this.scene.remove(this.rainbow);
      this.rainbow = null;
    }

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.classList.remove('flash');
      void uiLayer.offsetWidth;
      uiLayer.classList.add('flash');
    }

    this.terrain = new TerrainGenerator(this.planetRadius);
    const planetMesh = this.terrain.generatePlanet(state.seed, 32); 
    this.scene.add(planetMesh);

    for (let i = 0; i < state.totalStars; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      const star = new Star(dir, this.terrain);
      this.stars.push(star);
      this.scene.add(star.mesh);
    }

    const numTrees = 15 + Math.floor(Math.random() * 15);
    for (let i = 0; i < numTrees; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      const tree = new Tree(dir, this.terrain);
      this.trees.push(tree);
      this.scene.add(tree.mesh);
    }

    const numClouds = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numClouds; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      const altitude = this.planetRadius + 12 + Math.random() * 8;
      const cloud = new Cloud(dir, altitude);
      this.clouds.push(cloud);
      this.scene.add(cloud.orbitGroup);
    }

    // 20% chance to spawn a special unicorn
    if (Math.random() < 0.2) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      this.unicorn = new Unicorn(dir, this.terrain);
      this.scene.add(this.unicorn.mesh);

      const rainbowGeo = new THREE.TorusGeometry(this.planetRadius + 5, 2.5, 16, 100, Math.PI);
      const rainbowMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            float t = vUv.y;
            vec3 color = vec3(0.0);
            if (t < 0.14) color = vec3(1.0, 0.0, 0.0);
            else if (t < 0.28) color = vec3(1.0, 0.5, 0.0);
            else if (t < 0.42) color = vec3(1.0, 1.0, 0.0);
            else if (t < 0.57) color = vec3(0.0, 1.0, 0.0);
            else if (t < 0.71) color = vec3(0.0, 0.0, 1.0);
            else if (t < 0.85) color = vec3(0.29, 0.0, 0.51);
            else color = vec3(0.56, 0.0, 1.0);
            
            float alpha = sin(vUv.x * 3.14159) * sin(t * 3.14159);
            gl_FragColor = vec4(color, alpha * 0.8);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      this.rainbow = new THREE.Mesh(rainbowGeo, rainbowMat);
      
      // Orient the rainbow so it crosses through the unicorn's location
      const up = new THREE.Vector3(0, 1, 0);
      this.rainbow.quaternion.setFromUnitVectors(up, dir);
      
      // Spin it around the unicorn direction randomly so it arcs in a random direction
      this.rainbow.rotateOnAxis(dir, Math.random() * Math.PI);
      
      this.scene.add(this.rainbow);
    }

    this.player = new Player();
    const playerStartDir = new THREE.Vector3(0, 1, 0); 
    const startSurface = this.terrain.getSurfaceData(playerStartDir);
    this.player.mesh.position.copy(startSurface.point);
    this.player.mesh.up.copy(startSurface.normal);
    
    // Initial camera placement
    this.camera.position.copy(startSurface.point.clone().add(startSurface.normal.clone().multiplyScalar(20)));
    this.camera.lookAt(startSurface.point);
    
    this.scene.add(this.player.mesh);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    const dt = this.clock.getDelta();

    this.player.update(dt, this.terrain, this.camera, this.trees);

    for (const cloud of this.clouds) {
      cloud.update(dt);
    }

    for (const star of this.stars) {
      star.update(dt);
      
      if (!star.isCollected) {
        const dist = this.player.mesh.position.distanceTo(star.mesh.position);
        if (dist < 2.5) { 
          star.collect();
          state.collectStar();
          
          if (this.unicorn && !this.unicorn.isCollected) {
            this.unicorn.collect();
            state.missUnicorn();
          }
          if (this.rainbow) {
            this.rainbow.visible = false;
          }
          
          if (state.isLevelComplete()) {
            setTimeout(() => {
              state.resetLevel();
              this.initLevel();
            }, 800);
          }
        }
      }
    }

    if (this.unicorn && !this.unicorn.isCollected) {
      this.unicorn.update(dt);
      
      const dist = this.player.mesh.position.distanceTo(this.unicorn.mesh.position);
      if (dist < 3.0) {
        this.unicorn.collect();
        state.collectUnicorn();
        if (this.rainbow) {
          this.rainbow.visible = false;
        }
        // Collect all remaining stars automatically
        for (const star of this.stars) {
          if (!star.isCollected) {
            star.collect();
            state.collectStar();
          }
        }
        
        if (state.isLevelComplete()) {
          setTimeout(() => {
            state.resetLevel();
            this.initLevel();
          }, 800);
        }
      }
    }

    const playerPos = this.player.mesh.position;
    const playerUp = this.player.mesh.up;
    
    // Height offset
    const cameraHeightOffset = playerUp.clone().multiplyScalar(10);
    // Back offset relative to player rotation
    const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.mesh.quaternion).normalize();
    const cameraBackOffset = playerForward.clone().negate().multiplyScalar(15);
    
    const targetCameraPos = playerPos.clone().add(cameraHeightOffset).add(cameraBackOffset);

    // Smooth follow
    this.camera.position.lerp(targetCameraPos, 4 * dt);
    
    // Smooth up-vector alignment
    this.camera.up.lerp(playerUp, 4 * dt);
    this.camera.lookAt(playerPos);

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
