import * as THREE from 'three';
import { TerrainGenerator } from '../generation/TerrainGenerator';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import standUrl from '../assets/MSB-Player-stand.glb?url';
import walkUrl from '../assets/MSB-Player-walk.glb?url';
import jumpUrl from '../assets/MSB-Player-jump.glb?url';
import { Tree } from './Tree';

export class Player {
  public mesh: THREE.Group;
  private speed = 15;
  private keys: { [key: string]: boolean } = {};
  private verticalVelocity = 0;
  private isGrounded = false;
  private jumpForce = 18;
  private mixer: THREE.AnimationMixer | null = null;
  private standAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private jumpAction: THREE.AnimationAction | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  
  constructor() {
    this.mesh = new THREE.Group();
    this.initModels();

    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
  }

  private async initModels() {
    const loader = new GLTFLoader();
    try {
      const [standGltf, walkGltf, jumpGltf] = await Promise.all([
        loader.loadAsync(standUrl),
        loader.loadAsync(walkUrl),
        loader.loadAsync(jumpUrl)
      ]);

      // The stand GLB was exported without an armature (static mesh only).
      // We must use the walk GLB as the canonical mesh + skeleton, otherwise 
      // the mixer has no bones to deform and the model remains frozen.
      const model = walkGltf.scene;
      model.scale.set(1.0, 1.0, 1.0);
      model.rotation.y = 0;
      this.mesh.add(model);

      this.mixer = new THREE.AnimationMixer(model);

      const retarget = (clip: THREE.AnimationClip, uniqueName: string): THREE.AnimationClip => {
        const cloned = clip.clone();
        cloned.name = uniqueName;
        cloned.tracks.forEach(track => {
          const dotIdx = track.name.indexOf('.');
          if (dotIdx !== -1) {
            const boneName = track.name.substring(0, dotIdx);
            const pipeIdx = boneName.indexOf('|');
            if (pipeIdx !== -1) {
              track.name = boneName.substring(pipeIdx + 1) + track.name.substring(dotIdx);
            }
          }
        });
        return cloned;
      };

      const getAnim = (gltf: any): THREE.AnimationClip | null =>
        gltf.animations.length > 0 ? gltf.animations[0] : null;

      const standAnim = getAnim(standGltf);
      const walkAnim  = getAnim(walkGltf);
      const jumpAnim  = getAnim(jumpGltf);

      // If standAnim is missing, we don't create a standAction.
      // The update loop will fade out other animations, returning to the rig's rest pose (standing).
      if (standAnim) this.standAction = this.mixer.clipAction(retarget(standAnim, 'stand'));
      if (walkAnim)  this.walkAction  = this.mixer.clipAction(retarget(walkAnim,  'walk'));
      if (jumpAnim) {
        this.jumpAction = this.mixer.clipAction(retarget(jumpAnim, 'jump'));
        this.jumpAction.setLoop(THREE.LoopOnce, 1);
        this.jumpAction.clampWhenFinished = true;
      }

      if (this.standAction) {
        this.currentAction = this.standAction;
        this.currentAction.play();
      }
    } catch (e) {
      console.error('Failed to load player models', e);
    }
  }

  public update(dt: number, terrain: TerrainGenerator, camera: THREE.Camera, trees: Tree[] = []) {
    // Update animations
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Current direction from center
    const dirFromCenter = this.mesh.position.clone().normalize();
    
    // Camera forward and right vectors projected onto the tangent plane of the sphere
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    
    // Remove the component of camForward that is along the normal (dirFromCenter)
    const upComponent = dirFromCenter.clone().multiplyScalar(camForward.dot(dirFromCenter));
    camForward.sub(upComponent).normalize();
    
    const camRight = new THREE.Vector3().crossVectors(camForward, dirFromCenter).normalize();

    const moveDir = new THREE.Vector3();
    if (this.keys['w'] || this.keys['arrowup']) moveDir.add(camForward);
    if (this.keys['s'] || this.keys['arrowdown']) moveDir.sub(camForward);
    if (this.keys['a'] || this.keys['arrowleft']) moveDir.sub(camRight);
    if (this.keys['d'] || this.keys['arrowright']) moveDir.add(camRight);

    let isMoving = false;
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      isMoving = true;
      
      // Smoothly rotate character to face movement direction
      const currentQuat = this.mesh.quaternion.clone();
      const targetPos = this.mesh.position.clone().add(moveDir);
      this.mesh.lookAt(targetPos);
      
      const targetQuat = this.mesh.quaternion.clone();
      this.mesh.quaternion.copy(currentQuat);
      this.mesh.quaternion.slerp(targetQuat, 8 * dt);
    }

    // Move character horizontally
    this.mesh.position.add(moveDir.multiplyScalar(this.speed * dt));

    // Tree collision
    const playerRadius = 0.5;
    for (const tree of trees) {
      const dist = this.mesh.position.distanceTo(tree.mesh.position);
      const minDistance = playerRadius + tree.collisionRadius;
      if (dist < minDistance) {
        // Push player away from tree
        const pushDir = this.mesh.position.clone().sub(tree.mesh.position).normalize();
        const pushDist = minDistance - dist;
        this.mesh.position.add(pushDir.multiplyScalar(pushDist));
      }
    }

    // Calculate surface data beneath character
    const surfaceData = terrain.getSurfaceData(this.mesh.position);
    const surfaceRadius = surfaceData.point.length();
    let currentRadius = this.mesh.position.length();

    // Jumping logic
    if (this.keys[' '] && this.isGrounded) {
      this.verticalVelocity = this.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.verticalVelocity -= terrain.gravity * dt;
    }

    // Update vertical position
    currentRadius += this.verticalVelocity * dt;

    // Collision with ground
    if (currentRadius <= surfaceRadius) {
      currentRadius = surfaceRadius;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Apply updated radius
    this.mesh.position.normalize().multiplyScalar(currentRadius);

    // Align up vector
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
      this.mesh.up,
      surfaceData.normal
    );
    this.mesh.quaternion.premultiply(targetQuaternion);
    this.mesh.up.copy(surfaceData.normal);

    // Animation state machine
    let targetAction = this.standAction;

    if (!this.isGrounded && this.jumpAction) {
      targetAction = this.jumpAction;
    } else if (isMoving && this.walkAction) {
      targetAction = this.walkAction;
    }

    if (targetAction !== this.currentAction) {
      if (this.currentAction) {
        this.currentAction.fadeOut(0.2);
      }
      if (targetAction) {
        targetAction.reset().fadeIn(0.2).play();
      }
      this.currentAction = targetAction;
    }
  }
}
