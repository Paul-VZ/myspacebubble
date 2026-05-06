# My Space Bubble

An interactive 3D game where a character roams procedurally generated spherical planets, collecting stars and encountering rare unicorns. Built with Three.js and Vite for a fast, visually premium WebGL experience.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Build tool | Vite (vanilla TypeScript template) |
| 3D Engine | Three.js `^0.184.0` |
| Terrain Noise | `simplex-noise ^4.0.3` |
| 3D Models | Custom GLB assets (via `GLTFLoader`) |
| Background Music | HTML5 `Audio` API (MP3) |
| Typography | Google Fonts – Inter |
| Language | TypeScript |

---

## 1. Core Architecture

The project follows a clean object-oriented scene graph architecture with clearly separated responsibilities:

```
src/
├── core/
│   └── GameState.ts          # Centralized state singleton (stars, level, stats)
├── generation/
│   └── TerrainGenerator.ts   # Procedural planet mesh + surface query API
├── entities/
│   ├── Player.ts             # GLB model, animation state machine, physics
│   ├── Star.ts               # Collectible star (Octahedron + material)
│   ├── Unicorn.ts            # Rare power-up entity (GLB model)
│   ├── Tree.ts               # Decorative GLB scenery with collision
│   └── Cloud.ts              # Orbiting cloud GLB with drift animation
├── assets/
│   ├── MSB-Player-stand.glb
│   ├── MSB-Player-walk.glb
│   ├── MSB-Player-jump.glb
│   ├── MSB-Unicorn.glb
│   ├── MSB-Tree.glb
│   ├── MSB-Cloud.glb
│   └── Risian-MapsWithoutNames.mp3
├── main.ts                   # Game class – scene, game loop, entity orchestration
└── style.css                 # Glassmorphism UI overlay
```

---

## 2. Procedural Terrain Generation (`TerrainGenerator.ts`)

- **Base mesh:** `THREE.IcosahedronGeometry` at subdivision detail level 32, providing a near-uniform triangle distribution with no polar seam distortion.
- **Noise displacement:** 3D Simplex noise (`simplex-noise`) evaluated at normalised vertex coordinates `(nx * 1.5, ny * 1.5, nz * 1.5)`, displacing each vertex ±12% along its normal to form hills and valleys.
- **Deterministic seed:** A seeded pseudo-random function drives both the noise instance and all planetary parameters, ensuring fully reproducible planets from a given seed value.
- **Dynamic gravity:** Each planet generates a gravity value between 10–35 units, varied per seed via `10 + |sin(seed)| * 25`.
- **Dynamic planetary color:** Planet base colour is deterministically generated per seed using three independent `sin(seed)` channels, guaranteeing a visually distinct world on every level.
- **Rim lighting shader:** Applied via `MeshStandardMaterial.onBeforeCompile`, injecting a custom GLSL fresnel rim that blends the surface edge to a cool blue-white glow (`vec3(0.8, 0.9, 1.0)`).
- **Bubble aura:** A `SphereGeometry` at 1.35× the planet radius is rendered with a custom fresnel `ShaderMaterial` using `AdditiveBlending` and `BackSide` rendering, tinted to match the planet colour, to create a glowing atmospheric bubble effect.
- **Surface query API:** `getSurfaceData(direction)` uses the same noise function and a finite-difference approximation to return the exact world-space surface `{point, normal}` for any direction vector, used by all entities for surface snapping and physics.

---

## 3. World Space and Physics (`Player.ts`)

- **Dynamic gravity vector:** Gravity always points from the player's current position toward the planet centre — `gravity = normalize(playerPos) * -gravityMagnitude`. No fixed world-space "down".
- **Surface alignment:** After each movement step, `getSurfaceData` is called and the player's local up-vector is aligned to the returned surface normal via `Quaternion.setFromUnitVectors`, keeping the character correctly oriented anywhere on the globe.
- **Jumping:** Spacebar triggers a vertical impulse (`jumpForce = 18`). A vertical velocity accumulator is updated each frame by the planet's gravity constant and resolved against the surface radius for landing detection.
- **Camera-relative movement:** Player movement directions (WASD / Arrow keys) are projected onto the tangent plane of the sphere at the player's position using the live camera forward vector, so controls always feel relative to what the player sees.
- **Camera follow:** The camera smoothly lerps its position and up-vector toward a target that is 10 units above and 15 units behind the player, resulting in a fluid third-person follow cam that respects spherical orientation.
- **Tree collision:** Radial push-back collision is resolved against all tree entities each frame, preventing the player from walking through scenery.

---

## 4. Player Character (`Player.ts`)

- **GLB model:** A custom rigged 3D character model loaded via `GLTFLoader`.
- **Three-state animation system:** Three separate GLB files (`stand`, `walk`, `jump`) are loaded simultaneously, and their animations are cross-faded using `THREE.AnimationMixer`:
  - **Idle:** Plays when the player is grounded and not moving.
  - **Walk:** Cross-fades in (0.2 s) when any movement key is held.
  - **Jump:** Plays `LoopOnce` (clamps on last frame) when the player leaves the ground; cross-fades back on landing.

---

## 5. Game Entities

### Stars (`Star.ts`)
- 5 stars placed per planet at random directions, snapped to terrain surface height and floating 1.5 units above it.
- Visual: `OctahedronGeometry` with a gold `MeshStandardMaterial` (`emissive: 0xffaa00`, `metalness: 0.8`).
- Animation: continuous Y-axis rotation and a sinusoidal bob.
- Collection: radial distance check (`< 2.5` units); collected stars are hidden immediately and the UI scoreboard updates.

### Unicorn (`Unicorn.ts`)
- **20% chance** to spawn one unicorn per planet, placed at a random surface point.
- Visual: custom GLB model (`MSB-Unicorn.glb`), scaled 1.5×, floating 2 units above surface.
- Animation: fast Y-axis spin and a sinusoidal bob.
- **Power-up effect:** Collecting the unicorn (distance `< 3.0` units) auto-collects all remaining stars and immediately triggers level progression.
- **Rainbow arc:** When a unicorn spawns, a `TorusGeometry` rainbow rendered with a custom `ShaderMaterial` (seven ROYGBIV colour bands, additive blending, alpha fade at edges) is oriented through the unicorn's position.

### Trees (`Tree.ts`)
- 15–30 trees placed per planet at random surface points.
- Visual: custom GLB model (`MSB-Tree.glb`) with randomised scale (0.8–1.4×) and random Y-rotation for variety.
- Physics: each tree has a `collisionRadius = 1.0`, used by the player's push-back collision system.

### Clouds (`Cloud.ts`)
- 8–15 clouds spawned per planet at 12–20 units above the planet surface.
- Visual: custom GLB model (`MSB-Cloud.glb`), randomised scale (3–7×) and initial rotation.
- Animation: each cloud drifts around the planet on a random world-axis at a slow, randomised speed (including random clockwise/counter-clockwise direction).

---

## 6. Game State & Progression (`GameState.ts`)

The `GameState` singleton tracks both per-level and global persistent stats:

| Property | Description |
|---|---|
| `starsCollected` | Stars collected in the current level (resets per level) |
| `totalStars` | Stars required to complete a level (always 5) |
| `level` | Current level number (increments on completion) |
| `seed` | Random seed for the current planet (new value each level) |
| `globalStars` | Total stars collected across all levels |
| `planetsVisited` | Total planets visited since game start |
| `unicornsCollected` | Total unicorns collected |
| `unicornsMissed` | Unicorns that were on a level but not collected before level end |

Level completion (`isLevelComplete`) fires when `starsCollected >= totalStars`, triggering an 800 ms delay then a full `initLevel()` reset and scene rebuild.

A unicorn is marked **missed** when all 5 stars are collected while the unicorn on that level is still present and uncollected.

---

## 7. UI Overlay (`index.html` + `style.css`)

All UI panels use a **glassmorphism** design language:
- `backdrop-filter: blur(12px)`, semi-transparent dark backgrounds, `rgba` border highlights, and `box-shadow`.

| Panel | Location | Content |
|---|---|---|
| Score board | Top-left | "Stars" label + 5 CSS star icons that animate (rotate, glow) when collected |
| Stats board | Top-right | Global stars, planets visited, unicorns collected/missed |
| Level indicator | Bottom-left area (flex end) | Current level number |
| Volume control | Bottom-right | Range slider for background music (pointer-events enabled) |

**Level flash:** On level transition, a CSS `@keyframes flash` animation fires on the UI layer for a white screen-flash transition effect.

---

## 8. Lighting Setup (`main.ts`)

| Light | Color | Intensity | Purpose |
|---|---|---|---|
| `AmbientLight` | White | 0.2 | Base fill |
| `DirectionalLight` (key) | Warm white `#ffeedd` | 1.0 | Main sun light |
| `DirectionalLight` (back/fill) | Cool blue `#4488ff` | 0.8 | Atmospheric back light |
| `DirectionalLight` (rim) | Purple `#6622aa` | 0.5 | Subtle bottom rim glow |

Scene uses `FogExp2` (exponential fog) matching the dark background color for atmospheric depth.

---

## 9. Audio (`main.ts`)

- Background track: `Risian-MapsWithoutNames.mp3`, looping via the HTML5 `Audio` API.
- Default volume: 20% (`bgMusic.volume = 0.2`).
- **Autoplay policy compliance:** Music only starts on the first user click or keydown event (`{ once: true }`).
- **Volume slider:** A `<input type="range">` in the UI maps 0–100 to `bgMusic.volume` 0.0–1.0 in real time.

---

## 10. Game Loop (`main.ts`)

Uses `renderer.setAnimationLoop` (preferred over `requestAnimationFrame` for WebXR compatibility). Each frame executes:

1. **Input** – captured via `keydown`/`keyup` event listeners stored in a key map.
2. **Player update** – movement, physics, animation state machine, tree collision.
3. **Cloud update** – drift orbit rotation applied per cloud.
4. **Star updates** – rotate/bob animation + radial collection check.
5. **Unicorn update** – spin/bob animation + radial collection check + power-up logic.
6. **Camera follow** – lerp toward behind-player target position and up-vector.
7. **Render** – `renderer.render(scene, camera)`.
