# Endless Arcade - Master Game Catalog & Mechanics Specification

> **Platform Vision**: "Endless Arcade" is a lightweight, mobile-first Progressive Web App (PWA) delivering an extensive library of instant-play games. The platform features two core pillars:
> 1. **Endless / Infinite Games**: Procedurally generated, scaling difficulty, high-score chasing that can literally be played forever.
> 2. **Multi-Level / Campaign Games**: Structured progressions with hundreds of crafted stages, 3-star rating mechanics, milestones, and unlockable themes.
>
> All games are designed for frictionless touch controls (one-thumb/two-thumb), instant load times (<1s), offline capability via Service Workers, and low battery consumption.

---

## Table of Contents
1. [Core Platform Architecture & Design Principles](#core-platform-architecture--design-principles)
2. [Category 1: Endless Runners & Reflex Dodging](#category-1-endless-runners--reflex-dodging)
3. [Category 2: Hyper-Casual & Physics Arcade](#category-2-hyper-casual--physics-arcade)
4. [Category 3: Grid Puzzles & Brain Teasers](#category-3-grid-puzzles--brain-teasers)
5. [Category 4: Match, Merge & Physics Drop](#category-4-match-merge--physics-drop)
6. [Category 5: Modern Retro & Arcade Classics](#category-5-modern-retro--arcade-classics)
7. [Category 6: Rhythm, Timing & Precision](#category-6-rhythm-timing--precision)
8. [Category 7: Strategy, Idle & Micro-Roguelikes](#category-7-strategy-idle--micro-roguelikes)
9. [Universal Meta-Systems & PWA Feature Set](#universal-meta-systems--pwa-feature-set)
10. [Implementation Priority & Roadmap](#implementation-priority--roadmap)

---

## Core Platform Architecture & Design Principles

### Mobile-First UX Constraints
- **Orientation**: Default portrait mode (single-handed thumb reach zone), with auto-adaptation for landscape where appropriate.
- **Input Philosophy**: Low-latency touch gestures:
  - *Single Tap*: Jump, rotate, shoot, confirm.
  - *Swipe (Cardinal)*: 4-way direction shifts, lane switches.
  - *Drag / Aim Pointer*: Trajectory projection, steering, paddle movement.
  - *Hold & Release*: Charge shots, continuous acceleration.
- **Haptic & Audio Engine**:
  - Web Audio API synthesizer for zero-latency, procedural 8-bit/synth audio (minimal asset download sizes).
  - Navigator `vibrate()` integration for tactile feedback on bumps, score milestones, and collisions.
- **Performance Budget**:
  - Target: 60 FPS constant on mid-tier mobile hardware.
  - Initial Shell Download: < 2MB.
  - Individual Game Footprint: 200KB - 800KB bundle size.
  - Full Offline Support: Pre-cached through Service Worker and Cache Storage.
  - State Persistence: `IndexedDB` for game saves, records, replay data, and user preferences.

---

## Category 1: Endless Runners & Reflex Dodging

### 1.1 Cyber Sprint (3-Lane Endless Runner)
* **Core Concept**: High-speed, neon-drenched infinite runner where the player navigates a character or hover-cycle across 3 lanes avoiding barriers, trains, and laser gates.
* **Game Mechanics**:
  - **Lanes**: 3 vertical tracks.
  - **Inputs**:
    - Swipe Left / Right: Instant lane shift with snappy interpolation.
    - Swipe Up: Jump over low obstacles.
    - Swipe Down: Slide under overhead barriers.
  - **Dynamic Elements**: Speed increases asymptotically ($v(t) = v_0 + \alpha \cdot \log(1 + \beta t)$).
  - **Pickups**: Shield bubble, Coin Magnet (attracts coins across all lanes), Multiplier x2, Super Jump boots.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Seeded procedural generation. High-score chase with milestone speed tiers.
  - *Level Mode*: 100 levels with distinct stage goals (e.g., "Collect 150 coins without jumping", "Survive for 60 seconds with inverted controls").
* **Juice & Feel**: Motion blur lines, camera FOV kicks on speed boosts, bass pulse on obstacle dodge.

### 1.2 Flappy Orbit (Impulse Orbit Glide)
* **Core Concept**: A celestial body or spaceship orbiting gravity wells. Tapping creates an impulse thrust to navigate through asteroid fields and planetary rings.
* **Game Mechanics**:
  - **Physics**: Constant gravity vector pulling downward or towards planetary bodies; tap applies instantaneous upward vector impulse ($v_y = -jumpForce$).
  - **Procedural Obstacles**: Dynamic gap heights, oscillating pillars, floating mines, and atmospheric drag zones.
  - **One-Thumb Control**: Pure single-tap screen interaction.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Endless gap navigation with changing color palettes and shrinking gap margins.
  - *Level Mode*: 80 challenge stages with fixed obstacle layouts, puzzle paths, moving gates, and portal warp checkpoints.

### 1.3 Helix Descent (Spiral Tower Drop)
* **Core Concept**: A bouncing ball on top of a multi-tiered spiral helix cylinder. The player rotates the tower to guide the ball through gaps in the platforms while avoiding danger zones.
* **Game Mechanics**:
  - **Physics**: Ball bounces continuously on platforms at a fixed frequency. Falling through 3 or more consecutive levels without hitting triggers "Destroyer Mode" (smashes the next platform regardless of hazard color).
  - **Inputs**: Horizontal drag / touch slide rotates the helix tower.
  - **Hazard Blocks**: Red/danger tiles kill the ball on contact unless in Destroyer Mode.
* **Level vs. Endless Structure**:
  - *Endless Mode*: An infinite tower descending deeper into the abyss with narrower gaps and rotating hazard tiles.
  - *Level Mode*: 150 levels with target bottom platforms and star ratings based on bounce count and speed.

### 1.4 Crossy Lane (Endless Hop Highway)
* **Core Concept**: An isometric or top-down grid-hopper navigating busy roads, roaring rivers with drifting logs, and train tracks.
* **Game Mechanics**:
  - **Inputs**: Tap to advance one grid tile forward; swipe left, right, or down to step sideways or retreat.
  - **Pressure Timer**: An eagle/shadow swoops in if the player idles in one spot for more than 4 seconds.
  - **Environmental Hazards**: Variable-speed cars, logging floats, high-speed warning lights on railway lines.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Pure infinite distance tracker with biome changes every 100 hops (City -> Forest -> Cyberpunk -> Desert).
  - *Level Mode*: 50 puzzle levels where players must reach an exit portal with limited moves or within strict time limits.

---

## Category 2: Hyper-Casual & Physics Arcade

### 2.1 Infinite Brick Breaker (Physics Ball Swarm)
* **Core Concept**: A modern evolution of breakout and Ballz. The player launches an ever-growing volley of hundreds of physics balls at numbered blocks descending one row per turn.
* **Game Mechanics**:
  - **Aim & Shoot**: Touch and drag backwards to pull an aiming trajectory dotted line; release to fire all accumulated balls in rapid succession.
  - **Block Health**: Each block has a counter (e.g., 50). Each ball impact decrements the counter by 1. When it hits 0, the block shatters.
  - **Ball Upgrades**: Hitting '+' or ball powerups permanently increases the total ball count for subsequent turns.
  - **Special Blocks**: Horizontal/Vertical laser blocks, bomb blocks that explode in a 3x3 radius, bouncy bumpers.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Blocks descend one row after every volley. Game over occurs if any block reaches the bottom baseline.
  - *Level Mode*: 200 puzzle levels with shaped brick formations (hearts, skulls, castles) requiring targeted ricochet angles.

### 2.2 Knife Strike (Spinning Target Pin)
* **Core Concept**: Throw blades into a spinning target (wooden log, fruit, gear) to break it, without striking any already embedded knives.
* **Game Mechanics**:
  - **Input**: Single tap fires a knife instantly straight up into the 6 o'clock position of the rotating wheel.
  - **Target Dynamics**: Target rotation changes speed, reverses direction unpredictably, and halts in stutter bursts.
  - **Apples / Collectibles**: Embedded gems or fruits can be sliced by hitting their specific angle.
* **Level vs. Endless Structure**:
  - *Boss & Level Mode*: Stages arranged in sets of 5 (4 regular stages + 1 unique Boss like "Shield Boss", "Cheese Wheel", "Gatling Core").
  - *Endless Survival*: Single continuous spinning target that gets faster and adds more pre-installed hazard spikes with each clean clear.

### 2.3 Chroma Jump (Color Match Gateway)
* **Core Concept**: A colored sphere floats upward through rotating geometric obstacles. The sphere can only pass through barrier segments that match its current color.
* **Game Mechanics**:
  - **Input**: Tap to flap upwards against gravity.
  - **Color Shifter**: Passing through color-wheel icons randomly swaps the ball's color among 4 options (Cyan, Magenta, Yellow, Purple).
  - **Obstacles**: Rotating circles, concentric squares, spinning crosses, and oscillating horizontal bars.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Infinitely vertical ascent with high-score tracking and color combo streaks.
  - *Level Mode*: 120 curated levels with complex multi-stage obstacles, gravity-reverse orbs, and dark fog zones.

### 2.4 Stack Slice (Tower Precision Balance)
* **Core Concept**: Rectangular slabs slide back and forth across a tower. The player taps to drop each slab. Any portion overhanging the edge is sliced off and falls away.
* **Game Mechanics**:
  - **Input**: Single tap drops the moving block.
  - **Precision Trimming**: If the player doesn't align perfectly, the overhang is cut off, making the new foundation smaller.
  - **Perfect Streak**: Hitting 5+ perfect alignments in a row starts growing the block dimensions back to original size, accompanied by rising musical pitches on each consecutive perfect placement.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Continue stacking as high as humanly possible until the block width reaches zero.
  - *Level Mode*: 60 architectural challenges (e.g., "Build a tower 40 blocks high with at least 50% surface area remaining").

---

## Category 3: Grid Puzzles & Brain Teasers

### 3.1 2048 Unlimited (Adaptive Number Fusion)
* **Core Concept**: Slide numbered tiles on a grid to combine matching numbers into powers of two, extending beyond 2048 to 4096, 8192, and infinity.
* **Game Mechanics**:
  - **Input**: Cardinal swipe (Up, Down, Left, Right). All tiles slide until stopped by a wall or another tile. Matching pairs merge into their sum.
  - **Board Configurations**: 4x4 (Classic), 5x5 (Extended), 6x6 (Super), and Hexagonal grid variations.
  - **Special Undo & Tools**: Rewind 1 step (earn via combo), Tile Bomb (destroys a deadlocked tile), Swap Tool.
* **Level vs. Endless Structure**:
  - *Endless Sandbox*: Play until no valid moves remain; automatic save/resume anytime.
  - *Level Mode*: 100 level puzzles with preset boards, obstacle blocks (unbreakable rocks), and target sums to generate in under $N$ moves.

### 3.2 Block Puzzle 1010 (Jewel Grid Collapse)
* **Core Concept**: A 10x10 empty grid where players place polyomino blocks (Tetris-like shapes) to complete rows and columns, which then clear and grant score.
* **Game Mechanics**:
  - **Input**: Drag shapes from a bottom tray of 3 choices onto the 10x10 board.
  - **Line Clear**: Complete horizontal or vertical lines are removed immediately. Clearing multiple lines in a single drop triggers combo multipliers.
  - **No Gravity**: Pieces remain exactly where placed; they do not fall down.
  - **Turn Rules**: 3 pieces must all be placed before a new set of 3 is generated. If no board space can accommodate any of the current 3 pieces, the game ends.
* **Level vs. Endless Structure**:
  - *Classic Endless*: Score survival mode.
  - *Adventure Mode*: 150 levels with locked ice blocks (must clear rows adjacent to ice twice to melt them) and collectible gems embedded in the grid.

### 3.3 Pipe Weaver (Fluid Circuit Connector)
* **Core Concept**: Rotate scrambled pipe and circuit tiles on a grid to connect the energy source to all sink nodes without leaks.
* **Game Mechanics**:
  - **Input**: Tap on any tile to rotate it 90 degrees clockwise.
  - **Tile Types**: Straight, Elbow, T-junction, Cross, Teleport Portals, and Color-filter splitters.
  - **Flow Animation**: Once a continuous path forms, glowing fluid or electrical charge ripples from the source to illuminate the circuit.
* **Level vs. Endless Structure**:
  - *Level Progression*: 200 handcrafted stages scaling from 3x3 grids to complex 8x12 multi-source systems.
  - *Endless Daily Generator*: Algorithmically generated random solvable grid every single day with timer leaderboards.

### 3.4 Mini Nonogram (Pixel Picross)
* **Core Concept**: Japanese logic puzzle where numerical clues along rows and columns dictate which cells to shade, ultimately revealing a charming pixel art icon.
* **Game Mechanics**:
  - **Input**: Tap mode toggle (Draw vs. X-Mark) or two-finger multi-touch for quick marking.
  - **Feedback**: Instant error-checking mode or classic pen-and-paper mode with 3 allowed mistakes.
* **Level vs. Endless Structure**:
  - 150+ themed levels (Animals, Retro Games, Space, Food) spanning 5x5, 10x10, and 15x15 sizes.
  - Infinite procedural nonogram generator with guaranteed unique logical solvability without guessing.

---

## Category 4: Match, Merge & Physics Drop

### 4.1 Fruit Fusion (The Watermelon Physics Drop)
* **Core Concept**: Drop physics-driven fruits into a jar. When two identical fruits touch, they fuse into the next larger fruit (Cherry -> Strawberry -> Grape -> Orange -> ... -> Watermelon).
* **Game Mechanics**:
  - **Input**: Horizontal drag to position the fruit dropper, release to let gravity drop it into the container.
  - **Physics Engine**: Circular rigid body simulation with restitution, friction, and angular momentum.
  - **Chain Reactions**: Merging pushes adjacent fruits away due to pop impulses, often triggering cascading combinations.
  - **Game Over**: If fruit remains stacked above the red limit line for more than 3 seconds.
* **Level vs. Endless Structure**:
  - *Endless Mode*: Pure high-score chase aiming for double Watermelons.
  - *Challenge Mode*: Different container shapes (Funnel, Divided Box, Hexagon) and gravity anomalies (Anti-gravity bubbles, earthquake shakes).

### 4.2 Match-3 Gem Blitz
* **Core Concept**: Fast-paced swap-and-match puzzle featuring jewel destruction, cascades, and explosive super-gems.
* **Game Mechanics**:
  - **Input**: Swipe adjacent gems to swap positions.
  - **Combinations**:
    - Match 4: Line-clearing Flame Gem.
    - Match 5 in T/L shape: Bomb Gem (3x3 blast).
    - Match 5 in a row: Hypercube (destroys all gems of chosen color).
* **Level vs. Endless Structure**:
  - *Endless Blitz*: 60-second frenzy with time-extension combos, fever modes, and limitless resets.
  - *Saga Campaign*: 200 levels with diverse win conditions (clear jelly, bring ingredients to bottom, defeat the slime boss).

### 4.3 Turret Merge Defense
* **Core Concept**: Merge identical defensive turrets on a bench grid and deploy them along a winding road to repel endless incoming waves of creeps.
* **Game Mechanics**:
  - **Input**: Drag and drop turret $N$ onto another turret $N$ to create turret $N+1$ with double attack damage and new projectile properties (freeze, burn, pierce).
  - **Automated Combat**: Turrets automatically acquire and fire at targets within their range radius.
  - **Economy**: Defeated creeps yield coins to purchase new Level-1 turrets or unlock additional grid slots.
* **Level vs. Endless Structure**:
  - *Wave Survival (Infinite)*: Creep health scales exponentially. Every 10 waves features an epic boss with special abilities (healing, speed boost, stun aura).
  - *Campaign*: 50 distinct maps with varied choke points and elemental enemy immunities.

---

## Category 5: Modern Retro & Arcade Classics

### 5.1 Snake Neon 360
* **Core Concept**: Modern reboot of the legendary Snake with fluid, buttery 360-degree analog steering or classic 4-directional grid modes, glowing neon aesthetics, and powerup orbs.
* **Game Mechanics**:
  - **Controls**:
    - Mode A: Touch virtual floating joystick / drag-to-steer for smooth continuous angular heading.
    - Mode B: Rapid directional swipe for snappy 90-degree grid movements.
  - **Mechanics**: Eat neon pellets to grow. Collect speed boost pellets, ghost pass-through pellets, and tail-shortening scissors.
* **Level vs. Endless Structure**:
  - *Classic Endless*: Open arena, high score based on length and speed multipliers.
  - *Maze Levels*: 80 levels with intricate walls, moving portals, laser barriers, and shrinking boundaries.

### 5.2 Galaxia Void (One-Finger Space Shooter)
* **Core Concept**: Vertical arcade shmup / bullet hell where players pilot a starship through waves of alien swarms and colossal flagship bosses.
* **Game Mechanics**:
  - **Input**: Direct 1:1 finger tracking — ship moves directly under or slightly offset above the user's thumb for clear visibility.
  - **Auto-Fire**: Ship shoots lasers continuously; focus is entirely on dodging bullet patterns and catching scrap metal.
  - **Weapon Progression**: Pickups upgrade primary spread cannons, homing missiles, side drones (options), and defensive shields.
* **Level vs. Endless Structure**:
  - *Endless Sector*: Endless escalating waves with procedural bullet patterns and random elite mini-boss encounters.
  - *Star System Campaign*: 60 missions with distinct boss encounters requiring targeted weak-point destruction.

### 5.3 Minesweeper Pulse
* **Core Concept**: The timeless deduction puzzle rebuilt with modern tactile mobile controls, pinch-to-zoom, and zero-guess algorithmic generation.
* **Game Mechanics**:
  - **Controls**:
    - Quick Tap: Reveal tile.
    - Long Press (with haptic buzz): Plant/remove caution flag.
    - Number Chord Tap: Tapping a satisfied revealed number clears all unflagged adjacent tiles instantly.
  - **Zero-Guess Guarantee**: All boards generated are mathematically solvable without coin-flip guesswork.
* **Level vs. Endless Structure**:
  - *Level Journey*: From 6x6 beginner grids to massive 30x30 scrolling minefields.
  - *Speed-Rush Endless*: Clear small 8x8 boards in rapid succession against an accelerating countdown clock.

### 5.4 Pong Wars (Territory Bouncer)
* **Core Concept**: Two balls (one dark, one light) bounce in a partitioned arena, changing the color of any tile they touch. Players control paddles or boost fields to conquer the entire canvas territory.
* **Game Mechanics**:
  - **Input**: Drag paddle along screen boundary or tap to spawn deflection shockwaves.
  - **Physics**: Fast angular ball bounces off tile borders, inverting tile states upon impact.
* **Level vs. Endless Structure**:
  - *Endless Zen*: Hypnotic continuous territory toggle with ambient generative audio chords.
  - *Arcade Battle*: Player vs CPU AI in a battle to claim 100% of the board before time runs out.

---

## Category 6: Rhythm, Timing & Precision

### 6.1 Rhythm Fall (Piano Neon Tiles)
* **Core Concept**: Musical rhythm game where colored notes cascade down 4 vertical tracks in sync with upbeat chiptune and synthesizer melodies.
* **Game Mechanics**:
  - **Input**: Tap the corresponding column exactly as the note crosses the judgment line.
  - **Note Types**: Single tap, long hold note, sliding vibrato notes.
  - **Scoring**: *Perfect*, *Great*, *Good*, *Miss*. Missing a note breaks the combo and depletes the life gauge.
* **Level vs. Endless Structure**:
  - *Song Catalog*: 40+ royalty-free upbeat tracks with Easy, Medium, Hard, and Extreme note charts.
  - *Endless Speed Run*: Single infinite track where tempo ($BPM$) increases by 2% every 15 seconds until the player misses.

### 6.2 Perfect Slice (ASMR Kitchen Chopper)
* **Core Concept**: An endless conveyor belt brings vegetables, cakes, and wacky objects toward a chef's knife. The player taps in rapid rhythm to chop items while avoiding steel plates.
* **Game Mechanics**:
  - **Input**: Rapid tap or hold to perform rapid chopping down-strokes.
  - **Obstacles**: Hard metal blocks and brick sections cause the knife to shatter instantly if hit.
  - **Haptic Euphoria**: Crisp micro-vibrations for every clean slice, generating satisfying tactile rhythms.
* **Level vs. Endless Structure**:
  - *Endless Conveyor*: Procedurally generated stream of sliceable goods with sudden deceptive metal traps.
  - *Recipe Campaign*: 80 levels requiring exact target gram weights or slice counts to earn 3 Michelin stars.

---

## Category 7: Strategy, Idle & Micro-Roguelikes

### 7.1 Pocket Dungeon (Turn-Based Micro Rogue)
* **Core Concept**: A 3x3 or 4x4 card grid dungeon crawler. The player moves their hero card onto adjacent cards (monsters, potions, shields, coins, traps) in step-by-step tactical encounters.
* **Game Mechanics**:
  - **Input**: Swipe the hero card to swap with an adjacent card.
  - **Combat Logic**:
    - Moving into a monster deals monster attack damage to the hero's shield/health, while defeating the monster and dropping loot.
    - Potions restore HP; Shields absorb incoming damage; Weapon cards boost the hero's next attack value.
* **Level vs. Endless Structure**:
  - *Endless Descent*: Clear cards to drop deeper into the dungeon; monster stats scale progressively with deeper dungeon floors.
  - *Rogue Quests*: 50 curated puzzle scenarios with specific deck configurations and objective requirements.

### 7.2 Tap Empire (Incremental Forge & Idle Tycoon)
* **Core Concept**: Casual incremental game where players tap to mine energy or produce goods, hire automated managers, and scale production exponentially into scientific notations ($10^{15}$, $10^{30}$, etc.).
* **Game Mechanics**:
  - **Input**: Rapid tap boosts active production rate; management UI lets players allocate capital between factories.
  - **Prestige Loop**: Reset empire progress in exchange for permanent cosmic gems, unlocking massive universal multipliers ($2x$, $10x$, $100x$).
  - **Offline Calculation**: When the PWA is closed, a background timestamp check accurately credits offline earnings up to 8 hours.

---

## Universal Meta-Systems & PWA Feature Set

To ensure "Endless Arcade" functions as a cohesive, world-class mobile app rather than just a loose collection of demos, the following shared platform services will be baked into the architecture:

```
+-----------------------------------------------------------------------+
|                        ENDLESS ARCADE PLATFORM                        |
+-----------------------------------------------------------------------+
|  [PWA Shell & Service Worker]  |  [Offline Cache]  |  [Install Prompt] |
+-----------------------------------------------------------------------+
|  [Shared Game Engine Services]                                        |
|   - Web Audio FX Synthesizer    - Touch & Gesture Dispatcher          |
|   - Dynamic Particle Engine     - High-Performance RAF Loop           |
|   - Vibration / Haptic Driver   - IndexedDB Save / High-Score Store   |
+-----------------------------------------------------------------------+
|                       PLUGGABLE GAME MODULES                          |
|  [Cyber Sprint]  [Fruit Fusion]  [2048]  [Brick Breaker]  [Etc...]    |
+-----------------------------------------------------------------------+
```

### 1. Unified Game Shell (Lobby & Navigation)
* **Bottom Navigation Bar**:
  - **Arcade / Home**: Quick-launch carousel of featured, trending, and recently played games.
  - **Categories**: Filter by *Reflex*, *Brain*, *Casual*, *Retro*, *Rhythm*.
  - **Favorites & Offline**: Pin preferred games for one-tap instant offline access.
  - **Trophies / Profile**: Global level, total stars collected, achievement badges.
* **In-Game Overlay UI**:
  - Instant Pause / Resume menu.
  - Sound FX & Music toggles.
  - Haptic feedback toggle.
  - "Restart", "Change Game", and "Share High Score" (Web Share API).

### 2. High Score & Progression Architecture
* **Unified Save Format**: All games report scores, stars, and records through a standardized `GameScoreManager` contract:
  ```typescript
  interface GameMetadata {
    id: string;
    title: string;
    category: 'reflex' | 'casual' | 'puzzle' | 'merge' | 'retro' | 'rhythm' | 'strategy';
    icon: string;
    modes: ('endless' | 'levels')[];
    supportsHaptics: boolean;
  }

  interface UserGameProgress {
    gameId: string;
    highScore: number;
    highestLevelUnlocked: number;
    starsEarned: Record<number, number>; // levelIndex -> stars (1-3)
    timePlayedSeconds: number;
    gamesPlayed: number;
  }
  ```

### 3. PWA Capabilities & Mobile Optimizations
* **Web App Manifest**:
  - `display: standalone` for full-screen immersive app experience without browser URL bars.
  - `theme_color`: Dark cyberpunk / sleek modern palette (`#0f172a`).
  - Icons configured for all standard iOS/Android splash screens (maskable icons).
* **Service Worker Caching Strategy**:
  - **App Shell**: Cache-First strategy for core HTML/CSS/JS and sounds.
  - **Game Bundles**: Stored in Cache Storage dynamically so every game loaded once remains playable completely offline in airplane mode.
* **Battery & Performance Guard**:
  - Auto-pauses `requestAnimationFrame` loop when `document.visibilityState === 'hidden'`.
  - Disables heavy post-processing effects (glow, high particle count) if framerate dips below 50 FPS.

---

## Implementation Priority & Roadmap

To launch the PWA rapidly and build momentum, games will be delivered in phased milestones:

| Phase | Milestone | Games Included | Platform Features |
| :--- | :--- | :--- | :--- |
| **Phase 1: Foundation & Core 4** | Launch Ready MVP | 1. **Fruit Fusion** (Suika Physics)<br>2. **Infinite Brick Breaker** (Physics Balls)<br>3. **2048 Unlimited** (Adaptive Grid)<br>4. **Snake Neon 360** (Fluid Arcade) | • PWA App Shell + Service Worker<br>• Touch Gesture Engine<br>• Web Audio Synthesizer<br>• Local High-Scores & Favorites |
| **Phase 2: Reflex & Action Surge** | First Major Expansion | 5. **Cyber Sprint** (3-Lane Runner)<br>6. **Helix Descent** (Tower Drop)<br>7. **Block Puzzle 1010** (Jewel Grid)<br>8. **Knife Strike** (Spinning Target) | • Level Campaign Framework (Stars)<br>• Haptic Feedback Profiles<br>• Daily Challenge Generator |
| **Phase 3: Variety & Retro Classics** | Library Deepening | 9. **Minesweeper Pulse**<br>10. **Galaxia Void** (Shmup)<br>11. **Chroma Jump** (Color Obstacles)<br>12. **Pocket Dungeon** (Rogue Cards) | • Global Achievement Badges<br>• Custom Theme Switcher<br>• Web Share Scorecards |
| **Phase 4: Infinite Polish** | Long-Term Engagement | 13. **Rhythm Fall**<br>14. **Turret Merge Defense**<br>15. **Crossy Lane**<br>16. **Pipe Weaver** | • Cloud Backup / Sync<br>• Game-of-the-Day Push Notifications |

---

*Document Version: 1.0.0*  
*Project: Endless Arcade Mobile PWA*
