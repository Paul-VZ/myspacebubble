# My Space Bubble

Building an interactive 3D game where a character roams a procedurally generated spherical terrain is a fantastic project for WebGL. To keep the rendering efficient and ensure smooth performance, the architecture needs to decouple the game logic, procedural generation, and rendering pipeline. 

Here are the architectural insights and technical strategies to build this experience efficiently on WebGL using a modern WebGL framework (such as Three.js or Babylon.js).

---

## 1. Core Architecture Pattern

To manage the state of a roaming character on a spherical surface, a **Component-Entity-System (ECS)** or a clean object-oriented scene graph approach works best. The architecture can be separated into three core layers:

* **Logic Layer:** Manages character movement, collision detection with the sphere, star collection states, and game progression (moving to the next sphere).
* **Generation Layer:** Executes procedural generation algorithms to create the terrain data for each sphere before rendering.
* **Rendering Layer:** Uses WebGL to draw the scene, handle lighting, and apply post-processing shaders for atmosphere or rustic micro-interactions.

---

## 2. Spherical Terrain Generation

Procedurally generating a terrain on a sphere requires avoiding the "seam" and distortion issues common with simple polar projections. 

* **Icosphere/Geodesic Sphere:** Start with an icosahedron and subdivide it. This provides a base mesh with nearly uniform triangle distribution across the surface, which is far better for uniform vertex heights than a UV sphere.
* **Noise-based Displacement:** Apply a 3D Simplex or Perlin noise algorithm to the vertex normals. The noise function takes the 3D coordinates $(x, y, z)$ of each vertex on the sphere as input, displacing the vertex outwards to create hills, valleys, and features.
* **Chunking (Level of Detail):** If the terrain needs to feel vast (like a quarter of a soccer field), you can divide the sphere into sectors or stream geometry dynamically, though a single, well-optimized mesh of around 10,000 to 20,000 triangles is lightweight enough for modern WebGL without needing complex chunk loading.

---

## 3. World Space and Physics

Handling movement on a sphere requires overriding standard 2D or flat-plane physics.

* **Gravity and Up-Vector:** Instead of a fixed world-space "down" vector $(0, -1, 0)$, the gravity vector is dynamic and depends on the character's position relative to the sphere's center.
    $$\vec{g} = -\text{normalize}(\vec{P}_{\text{character}} - \vec{C}_{\text{sphere}})$$
* **Character Controller:** The character's local up-vector must align with the normal of the terrain point they are currently standing on. Use raycasting or a simple distance check to snap the character to the displaced vertex height.
* **Bounding Spheres and Collisions:** Because the terrain is a sphere, bounding box collisions can be simplified into radial distance checks supplemented by height-field data from the procedural generation function.

---

## 4. Game Loop and Data Flow

The architecture should maintain a unidirectional data flow to prevent WebGL state stalls:

1.  **Input:** Capture keyboard or mouse input.
2.  **Update:** Calculate character movement and update the camera matrix to orbit or follow the character along the sphere's curvature.
3.  **Collision Check:** Determine the character's new latitude/longitude or XYZ coordinates and check if they overlap with the bounding radius of any of the five stars.
4.  **Render:** Draw the scene to the WebGL context.

---

## 5. Recommended WebGL Stack

To minimize boilerplate and focus purely on game mechanics and generation:

* **Framework:** **Three.js** provides excellent built-in geometry primitives (like `IcosahedronGeometry`), robust vector math libraries, and material systems.
* **Lighting & Atmosphere:** Use a basic physical material (such as `MeshStandardMaterial`) with a subtle rim lighting shader to give the sphere a distinct, glowing atmosphere as the character roams.
* **State Management:** Keep the game state—such as collected stars, the current level/seed, and player position—in a simple state object, making it easy to reset when generating the next sphere.

---

## 6. Implementation Build Plan

### Phase 1: Project Setup and Foundation
1. **Initialize Project:** Create a new application using Vite (e.g., `npx create-vite@latest ./ --template vanilla-ts`).
2. **Install Dependencies:** Install `three` for the core 3D engine and `simplex-noise` for terrain generation.
3. **Directory Structure:** Create folders for `core/` (loop, state), `generation/` (terrain algorithms), `entities/` (player, stars), and `render/` (scene, camera, lights).
4. **Basic Scene Setup:** Initialize the WebGL renderer, set up a perspective camera, and add ambient and directional lighting to the canvas.

### Phase 2: Procedural Terrain Generation
1. **Base Mesh:** Instantiate an `IcosahedronGeometry` with a sufficient subdivision detail level to serve as the base spherical planet.
2. **Noise Application:** Integrate 3D Simplex noise to iterate over the geometry vertices and displace them along their normals to form terrain features like hills and valleys.
3. **Materials & Aesthetics:** Apply a `MeshStandardMaterial`. Integrate a custom shader or utilize `onBeforeCompile` to add a subtle rim lighting effect for atmospheric glow.

### Phase 3: Character and Physics Systems
1. **Character Controller:** Create a simple character mesh (e.g., a capsule) and implement input handling (WASD/arrows) to move around the sphere.
2. **Dynamic Gravity:** Implement physics logic to constantly calculate the gravity vector pointing towards the sphere's center. 
3. **Surface Alignment:** Use raycasting (via `THREE.Raycaster`) from the character's position towards the center of the planet to determine the exact terrain height and surface normal. Snap the character to this height and align their local up-vector with the normal.

### Phase 4: Game Logic and Mechanics
1. **State Management:** Create a centralized state object to track the score (collected stars), current level seed, and player status.
2. **Star Placement:** Scatter 5 star objects across the planet using spherical coordinates, converted to Cartesian points and snapped to the terrain's surface height.
3. **Collision Detection:** Implement radial distance checks between the player and stars. When a star is collected, update the state, play an effect, and remove the star.
4. **Level Progression:** Once all 5 stars are collected, trigger a transition sequence to regenerate a new planet with a different noise seed and reset the player.

### Phase 5: Polish and Optimization
1. **Game Loop:** Ensure Input, Update, Collision, and Render phases execute consistently in the `requestAnimationFrame` loop.
2. **UI & Aesthetics:** Overlay a rich, dynamic HTML/CSS user interface for score tracking and menus, leveraging modern typography, gradients, and glassmorphism.
3. **Micro-interactions:** Add smooth camera following, particle effects upon star collection, and seamless transitions between planets to elevate the premium feel of the game.

### Phase 6: Advanced Features & Ecosystem Additions
1. **Atmospheric Bubble Aura:** Render an additive, transparent sphere around the procedural planet, utilizing custom fresnel shader properties to create an atmospheric bubble effect.
2. **Dynamic Planetary Colors:** Randomize the `MeshStandardMaterial` base color for each newly generated planet using a deterministic seed algorithm, ensuring each teleportation presents a visually distinct world.
3. **The Special Unicorn:** Introduce a rare "Unicorn" entity (with a 20% spawn rate per level). When collected, this special power-up automatically gathers all remaining stars and triggers an immediate teleport to the next planet.
