# Endless Arcade - Mobile Arcade PWA

"Endless Arcade" is a lightweight, mobile-first Progressive Web App (PWA) designed for instant arcade play on smartphones and touch devices. It supports offline play, sound synthesis, haptic feedback, local progression, and both endless and multi-level game modes.

---

## 🚀 Key Platform Features

1. **Mobile-First PWA**:
   - Installable on iOS (Add to Home Screen) and Android (Native Install prompt).
   - Full offline support with Service Worker and Cache Storage precaching.
   - Notch and safe-area inset aware (`env(safe-area-inset-*)`).
   - Single-handed thumb controls and gesture navigation.

2. **Zero-Asset Procedural Audio Engine (`src/engine/audio.ts`)**:
   - Synthesizes retro and modern game sound effects on the fly via the Web Audio API.
   - Zero sound file network requests or download delays.

3. **Haptic Vibration Driver (`src/engine/haptics.ts`)**:
   - Integrates with `navigator.vibrate` for tactile feedback on taps, impacts, combos, and game overs.

4. **Persistent Progress & Local Storage (`src/engine/storage.ts`)**:
   - Records personal bests, stars earned per level, favorites, total plays, and user settings.

5. **Pluggable Game Architecture (`src/types/game.ts`)**:
   - Standardized `GameEngine` lifecycle (`init`, `start`, `pause`, `resume`, `destroy`, `resize`).
   - Unified HUD overlay, pause modal, and game over screen with celebratory confetti.

---

## 🕹️ Included Showcase Game

- **Neon Snake**:
  - High-FPS canvas rendering with glowing neon aesthetics.
  - Multi-input support: **Touch Swipes anywhere**, **Virtual On-Screen D-Pad**, and **Keyboard Arrow Keys / WASD**.
  - Dynamic speed scaling, golden bonus orbs with countdown rings, and particle burst effects.
  - Endless survival scoring with high-score tracking.

---

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle with PWA service worker
npm run build

# Preview production build locally
npm run preview
```

---

## 📁 Project Structure

```
endless-arcade/
├── games.md                    # Master specification catalog for all game types
├── public/
│   ├── icons/                  # PWA icons & manifest assets
│   └── favicon.ico
├── src/
│   ├── components/             # Mobile shell UI (Header, BottomNav, GameCard, Modals)
│   ├── engine/                 # Audio synthesizer, Haptics driver, Storage engine
│   ├── games/
│   │   ├── registry.ts         # Master game catalog registry
│   │   └── snake/              # Neon Snake game engine & view
│   ├── types/
│   │   └── game.ts             # Platform interfaces & type definitions
│   ├── App.tsx                 # Main routing & state coordinator
│   ├── index.css               # Tailwind CSS & mobile safe-area styling
│   └── main.tsx                # App entry & Service Worker registration
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts              # Vite & VitePWA configuration
```
