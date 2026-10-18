# Endless Arcade

A mobile-first React + TypeScript arcade with 15 playable games, local records, synthesized audio, haptics, and offline PWA support.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Node.js 20+ is recommended. Tests use Node's built-in test runner and esbuild, the transpiler used by Vite.

## Game room

Neon Snake, Fruit Fusion, Infinite Breaker, 2048 Unlimited, Cyber Sprint, Knife Strike, Stack Slice, Minesweeper Pulse, Flappy Orbit, Chroma Jump, Galaxia Void, Block Puzzle 1010, Helix Descent, Rhythm Fall, and Crossy Lane.

The lobby includes custom local SVG scenes, search, category filters, favorites, a random spotlight, light/dark themes, and responsive two-, three-, and four-column layouts. No external image requests are needed for game artwork.

## Difficulty and controls

Choose a pace in the lobby or Settings before starting:

- **Chill:** 80% action speed, eight Minesweeper mines, smaller Block Puzzle pieces, and more time before Fruit Fusion overflows.
- **Arcade:** standard action speed, ten mines, and balanced pieces.
- **Expert:** 120% action speed, fourteen mines, more large pieces, and a shorter overflow window.

2048 keeps classic rules at every setting. Personal bests and stars are shared across difficulty settings. Each game keeps its chosen difficulty for the entire session.

Snake waits for a direction before moving. Use keyboard arrows/WASD, touch gestures, or the on-screen controls. Other games show their controls on screen; pause for detailed instructions. Press Escape to pause/resume. Switching away from the app pauses an active game until explicitly resumed.

Flappy Orbit scales difficulty with gates passed rather than bonus points, bounds consecutive gap heights, and adapts openings to short screens. Snake, Cyber Sprint, and Rhythm Fall have gentler openings and gradual progression.

## Performance and persistence

Each game loads in its own JavaScript chunk. The service worker precaches all chunks for offline use after installation completes. Canvas engines cache viewport dimensions on resize, cap pixel density at 2x, and skip rendering while paused. UI callbacks stay current without restarting a game on score updates.

Scores, stars, favorites, recent games, and settings live in local storage. Resetting progress clears only this app's progress and favorites, preserving preferences and unrelated data. Invalid saved progress falls back to valid defaults.

## Verification

`npm test` covers every canvas engine's start/pause/resume/destroy lifecycle, duplicate animation loops, cached layout reads, Snake's initial-input behavior, tail collision and full-board handling, food overlap, Flappy gate bounds, difficulty snapshots, progress resets, and malformed saves. `npm run build` checks TypeScript and generates the production PWA.

## Custom in-game artwork

Game assets use original Canvas, SVG, and CSS geometry. No emoji glyphs, stock emoji images, or external asset requests appear in the application source. Key artwork includes:

- **Fruit Fusion:** eleven distinct fruit silhouettes (cherry through watermelon) with stems, seeds, rinds, and specular highlights, rasterized once per tier and reused during gameplay.
- **Helix Descent:** rear platform halves behind a solid metallic cylinder, front halves in front, proportional highlight arcs that avoid full-circle wrapping on narrow slices, and fading impact streaks instead of outlined circles.
- **Block Puzzle 1010:** beveled jewel tiles with inset facets; drag previews show only occupied cells with no rectangular backing.
- **Galaxia Void:** detailed player fighter, scout, cruiser, and flagship silhouettes with animated engine exhaust, aimed projectiles starting at wave 3, progressively faster and tougher enemies, and boss flagships every 8 waves.
- **Chroma Jump:** single camera transform, custom vector star collectibles, and matched visual/collision ring thickness with safe obstacle spacing.
- **Flappy Orbit:** detailed spacecraft with cockpit and exhaust, armored gate panels with illuminated caps, rotating star collectibles, and a distant crescent planet.
- **Cyber Sprint:** animated helmeted cyberpunk courier, layered parallax skyline with illuminated windows, dimensional warning crates, striped barricades, laser gates, and faceted coins.
- **Knife Strike:** wooden target with growth rings and radial cracks, steel blades with bevels, wrapped grips, and pommels, and vector apples on the wheel.
- **Stack Slice:** dimensional slabs with top faces, shaded fronts, edge highlights, matching debris, alignment guides, and a distant city backdrop.
- **Crossy Lane:** detailed vehicles with headlights and taillights, wood-grain logs, and a custom courier robot with visor eyes and antennae.
- **Infinite Breaker:** beveled enamel bricks with bottom shadow polygons.
- **Rhythm Fall:** drawn Bézier hearts instead of emoji for the life display.
- **Neon Snake:** dual-tone emerald body, directional head eyes, and glowing food orbs.
- **Lobby:** custom local SVG scenes for every game card; no external image requests.

For local visual QA, start Vite and open `/tests/art-review.html`. The selector previews all fruits and the major redesigned games in fixed scenes without affecting saved scores. `npm test` also checks Helix layer order and rotation bounds, sprite caching, Galaxia projectile integrity and difficulty ramp, Chroma spacing, puzzle drag geometry, and absence of emoji assets.

## Source map

- `src/App.tsx`: lobby, navigation, lazy game loading, session lifecycle
- `src/components`: artwork, cards, difficulty picker, HUD, dialogs, settings, statistics
- `src/engine`: storage, difficulty profiles, sound, haptics
- `src/games`: game registry, canvas engines, React board games and input views
- `tests/game-regressions.ts`: game and storage regression checks
