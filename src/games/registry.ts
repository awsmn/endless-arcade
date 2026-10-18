import { GameMetadata } from '../types/game';

export const GAME_CATALOG: GameMetadata[] = [
  {
    id: 'neon-snake',
    title: 'Neon Snake',
    tagline: 'Hyper-responsive glowing arcade snake with speed scaling & endless mode',
    category: 'retro',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-emerald-500 to-teal-700',
    accentColor: '#10b981',
    iconName: 'Zap',
    description: 'Slither through a cyberpunk grid, consume energy power orbs, and grow your glowing tail while dodging walls and your own body.',
    instructions: [
      'Swipe anywhere or use the D-Pad to change direction',
      'Eat glowing green energy orbs to score and grow',
      'Watch out for the speed increase as your score climbs',
      'Do not collide with walls or your own tail!'
    ],
    totalLevels: 50
  },
  {
    id: 'fruit-fusion',
    title: 'Fruit Fusion',
    tagline: 'Physics-based drop & merge - combine fruits to create the Giant Watermelon',
    category: 'merge',
    modes: ['endless'],
    color: 'from-pink-500 to-rose-700',
    accentColor: '#ec4899',
    iconName: 'Apple',
    description: 'Drop juicy fruits into the jar. When two identical fruits touch, they fuse into a bigger fruit! Avoid overflowing.',
    instructions: [
      'Drag horizontally across the top to align your dropper',
      'Release your touch to drop the fruit',
      'Merge two matching fruits to evolve them to the next tier',
      'Do not let the fruit stack exceed the danger line for more than 3 seconds'
    ]
  },
  {
    id: 'brick-breaker',
    title: 'Infinite Breaker',
    tagline: 'Launch volleys of 100+ physics balls at descending numbered blocks',
    category: 'arcade',
    modes: ['endless', 'levels'],
    color: 'from-indigo-500 to-blue-700',
    accentColor: '#6366f1',
    iconName: 'Boxes',
    description: 'Aim your trajectory and unleash a swarm of bouncy balls to shatter brick defenses before they hit the ground line.',
    instructions: [
      'Drag backwards to aim the dotted trajectory line',
      'Release to fire your entire volley of balls',
      'Collect (+) powerups to add more balls to your next turn',
      'Clear all numbered bricks before they descend to the bottom line'
    ],
    totalLevels: 100
  },
  {
    id: '2048-unlimited',
    title: '2048 Unlimited',
    tagline: 'The iconic number merge puzzle scaling beyond 2048 into infinity',
    category: 'puzzle',
    modes: ['endless', 'levels'],
    color: 'from-amber-500 to-orange-700',
    accentColor: '#f59e0b',
    iconName: 'Grid',
    description: 'Swipe to slide tiles across the board. Matching numbers merge into their sum. How high can your powers of two go?',
    instructions: [
      'Swipe Up, Down, Left, or Right to slide all tiles',
      'Tiles with identical numbers merge when they collide',
      'Create 2048, 4096, 8192, and push for the ultimate high score'
    ]
  },
  {
    id: 'cyber-sprint',
    title: 'Cyber Sprint',
    tagline: 'Endless 3-lane reflex runner with high-speed jumps and slides',
    category: 'reflex',
    modes: ['endless', 'levels'],
    badge: 'NEW',
    color: 'from-cyan-500 to-blue-600',
    accentColor: '#06b6d4',
    iconName: 'Activity',
    description: 'Dodge trains, leap over barricades, and slide beneath laser barriers at blistering speeds.',
    instructions: [
      'Swipe Left/Right to shift lanes',
      'Swipe Up to jump over obstacles',
      'Swipe Down to slide under overhead barriers'
    ],
    totalLevels: 60
  },
  {
    id: 'knife-strike',
    title: 'Knife Strike',
    tagline: 'Precision timing tap - pin all blades into spinning targets',
    category: 'arcade',
    modes: ['levels', 'endless'],
    color: 'from-violet-500 to-purple-700',
    accentColor: '#8b5cf6',
    iconName: 'Crosshair',
    description: 'Tap to launch blades into the rotating core without hitting any existing knives. Slices apples for bonus gems.',
    instructions: [
      'Tap anywhere to throw a knife straight up',
      'Never hit any knife that is already embedded',
      'Defeat unique boss targets every 5 stages'
    ],
    totalLevels: 80
  },
  {
    id: 'stack-slice',
    title: 'Stack Slice',
    tagline: 'Drop sliding blocks with razor precision to build towering sky-rises',
    category: 'reflex',
    modes: ['endless', 'levels'],
    color: 'from-fuchsia-500 to-pink-600',
    accentColor: '#d946ef',
    iconName: 'Layers',
    description: 'Time your tap as slabs slide across the screen. Overhangs are sliced away. Chain perfect drops to expand your base!',
    instructions: [
      'Tap when the moving block overlaps the tower base',
      'Any overhanging portion gets trimmed off',
      'Get consecutive perfect drops to trigger width recovery combos'
    ],
    totalLevels: 50
  },
  {
    id: 'minesweeper-pulse',
    title: 'Minesweeper Pulse',
    tagline: 'A safe opening, tactile flags, and a fresh logic challenge every round',
    category: 'puzzle',
    modes: ['levels', 'endless'],
    color: 'from-slate-600 to-slate-800',
    accentColor: '#94a3b8',
    iconName: 'Flag',
    description: 'Clear the minefield using mathematical deduction. Zero guesswork required with our smart generator.',
    instructions: [
      'Tap to reveal a safe tile',
      'Long-press with haptic vibration to plant or remove a danger flag',
      'Clear all safe tiles to claim victory'
    ],
    totalLevels: 100
  },
  {
    id: 'flappy-orbit',
    title: 'Flappy Orbit',
    tagline: 'Impulse thruster navigation through neon gravity fields & orbital asteroid gates',
    category: 'reflex',
    modes: ['endless', 'levels'],
    badge: 'NEW',
    color: 'from-sky-500 to-blue-700',
    accentColor: '#0ea5e9',
    iconName: 'Rocket',
    description: 'Pilot an agile orbital space probe through planetary debris and laser gates using one-tap gravitational impulse thrusts.',
    instructions: [
      'Tap anywhere or press Space/Up to thrust upward',
      'Navigate cleanly through asteroid pylons and planetary rings',
      'Collect bonus energy stars inside gaps for extra points',
      'Do not collide with pylons or crash into the ground'
    ],
    totalLevels: 80
  },
  {
    id: 'chroma-jump',
    title: 'Chroma Jump',
    tagline: 'Color match reflex jump - pass through spinning obstacles matching your hue',
    category: 'arcade',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-purple-500 via-pink-600 to-cyan-500',
    accentColor: '#a855f7',
    iconName: 'CircleDot',
    description: 'Bounce your color sphere upward through rotating multi-colored rings and crosses. Only matching color segments are permeable!',
    instructions: [
      'Tap anywhere or press Space/Up to bounce upward',
      'Pass through barriers only when their color matches your sphere',
      'Pass through multi-color switchers to adapt to new hues',
      'Collect golden stars inside obstacles to boost your score'
    ],
    totalLevels: 60
  },
  {
    id: 'galaxia-void',
    title: 'Galaxia Void',
    tagline: 'Classic 90s neon space shooter - pilot your starship against alien swarms',
    category: 'retro',
    modes: ['endless', 'levels'],
    color: 'from-blue-600 via-indigo-700 to-purple-800',
    accentColor: '#38bdf8',
    iconName: 'Crosshair',
    description: 'Pilot an advanced starfighter through bullet-hell space sectors. Dodge diving alien squadrons, collect weapon upgrades, and destroy massive flagship bosses.',
    instructions: [
      'Drag anywhere or use WASD/Arrows to steer starfighter',
      'Twin plasma lasers fire continuously automatically',
      'Collect lightning powerups for spread cannons and shields',
      'Defeat colossal flagship bosses every 10 waves'
    ],
    totalLevels: 50
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle 1010',
    tagline: 'Fit polyomino jewel blocks onto the grid to collapse rows & columns',
    category: 'puzzle',
    modes: ['endless'],
    badge: 'NEW',
    color: 'from-amber-500 via-rose-500 to-purple-600',
    accentColor: '#f59e0b',
    iconName: 'Grid',
    description: 'Relaxing yet deep spatial puzzle. Drag gem blocks from your bottom tray into the 8x8 grid. Complete lines to trigger explosive jewel collapses.',
    instructions: [
      'Drag shapes from the bottom tray onto the board',
      'Fill complete horizontal rows or vertical columns to clear them',
      'Clear multiple lines simultaneously for exponential combo multipliers',
      'Plan ahead! If no current piece can fit, the game ends'
    ]
  },
  {
    id: 'helix-descent',
    title: 'Helix Descent',
    tagline: 'Rotate the spiral helix tower, dive through tier gaps, and smash platforms!',
    category: 'reflex',
    modes: ['endless', 'levels'],
    badge: 'NEW',
    color: 'from-orange-500 via-rose-600 to-purple-700',
    accentColor: '#f97316',
    iconName: 'RotateCw',
    description: 'Descend an infinite spiral tower cylinder. Drag horizontally or use A/D to rotate the helix, guiding the bouncing ball through gaps. Plunge through multiple tiers to activate Destroyer Mode and smash platforms!',
    instructions: [
      'Drag horizontally or use Left/Right / A/D to rotate the spiral tower',
      'Guide the bouncing ball through open gaps in platforms',
      'Never land on red hazard segments!',
      'Drop 3+ tiers without bouncing to ignite Destroyer Mode and smash whatever platform you hit!'
    ],
    totalLevels: 60
  },
  {
    id: 'rhythm-fall',
    title: 'Rhythm Fall',
    tagline: 'Tap falling neon musical beats across 4 lanes with rhythm and timing!',
    category: 'arcade',
    modes: ['endless'],
    badge: 'HOT',
    color: 'from-violet-600 via-fuchsia-600 to-cyan-500',
    accentColor: '#8b5cf6',
    iconName: 'Music',
    description: 'Fast-paced cyber rhythm challenge. 4 vertical tracks stream neon musical notes downward to a bottom judgment line. Tap lane buttons or keys D, F, J, K in time with the music to build massive combos!',
    instructions: [
      'Tap the 4 lanes or use keys D, F, J, K (or 1, 2, 3, 4) on your keyboard',
      'Hit each note as it reaches the glowing judgment line',
      'Time your taps for PERFECT and GREAT ratings',
      'Keep your combo alive to multiply your score!'
    ]
  },
  {
    id: 'crossy-lane',
    title: 'Crossy Lane',
    tagline: 'Hop across high-speed cyber traffic, dodge speeding cars and trains!',
    category: 'retro',
    modes: ['endless'],
    badge: 'NEW',
    color: 'from-emerald-500 via-teal-600 to-cyan-700',
    accentColor: '#10b981',
    iconName: 'Footprints',
    description: 'The ultimate hop adventure! Guide your neon hopper across multi-lane highways packed with sports cars, semi-trucks, high-speed train tracks with warning signals, and river log crossings.',
    instructions: [
      'Tap anywhere or press Up / W to hop forward one lane',
      'Swipe or use Left/Right arrows to move sideways; Down to back up',
      'Watch out for speeding cars and warning bells on railway tracks',
      'Collect gold coins along the road and set a new distance record!'
    ]
  },
  {
    id: 'tetris-neon',
    title: 'Neon Tetris',
    tagline: 'Classic falling polyomino puzzle with ghost piece projection & line clearing combos',
    category: 'retro',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-cyan-500 via-blue-600 to-purple-700',
    accentColor: '#06b6d4',
    iconName: 'Layers',
    description: 'Stack, rotate, and slam neon tetrominoes into complete horizontal lines to collapse rows and score massive combo bonuses.',
    instructions: [
      'Use Left/Right arrows or buttons to shift falling blocks',
      'Up Arrow or Rotate button spins the piece with wall-kick clearance',
      'Down Arrow soft drops; Spacebar or SLAM button instantly drops',
      'C key or HOLD button reserves a piece for later'
    ],
    totalLevels: 30
  },
  {
    id: 'sudoku-pulse',
    title: 'Sudoku Pulse',
    tagline: '9x9 pure number logic with 3 difficulty tiers & candidate notes mode',
    category: 'puzzle',
    modes: ['levels', 'endless'],
    badge: 'NEW',
    color: 'from-blue-600 via-indigo-600 to-cyan-500',
    accentColor: '#38bdf8',
    iconName: 'Grid',
    description: 'Deduce missing numbers across the 9x9 grid. Fill every row, column, and 3x3 box with digits 1 through 9 with zero conflicts.',
    instructions: [
      'Tap any cell to select it and view row/col/box coordinates',
      'Use number keys or bottom keypad (1-9) to enter digits',
      'Toggle NOTES mode to draft pencil candidates in empty cells',
      'Avoid mistakes! 3 wrong inputs trigger system overload'
    ],
    totalLevels: 100
  },
  {
    id: 'memory-matrix',
    title: 'Memory Matrix',
    tagline: 'Cognitive spatial working-memory challenge scaling from 3x3 to 6x6',
    category: 'puzzle',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-purple-600 via-pink-600 to-cyan-500',
    accentColor: '#a855f7',
    iconName: 'Brain',
    description: 'Test and expand your visual working memory. A matrix of neon tiles flashes briefly; recall and tap all active positions from memory.',
    instructions: [
      'Observe the illuminated tile pattern during the 1.4s preview phase',
      'Tap all target tiles from memory once the grid goes dark',
      'Build uninterrupted recall streaks to multiply your brain power score',
      'Grid expands dynamically from 3x3 up to 6x6 as you advance'
    ],
    totalLevels: 50
  },
  {
    id: 'gem-slide-15',
    title: 'Gem Slide 15',
    tagline: 'The legendary 15-puzzle sliding block challenge with neon gemstone tiles',
    category: 'puzzle',
    modes: ['endless', 'levels'],
    color: 'from-emerald-500 via-teal-600 to-indigo-700',
    accentColor: '#10b981',
    iconName: 'Grid',
    description: 'Slide glowing numbered gemstone tiles into adjacent empty spaces to sort all tiles sequentially from 1 to 15 in the fewest moves.',
    instructions: [
      'Tap any tile adjacent to the empty slot to slide it into the gap',
      'Use Arrow keys or WASD on keyboard to navigate tiles',
      'Plan multi-step sliding paths to minimize total moves',
      'Complete the puzzle in record time for a 3-star rating'
    ]
  },
  {
    id: 'cyber-lights',
    title: 'Cyber Lights Out',
    tagline: 'Electronic circuit deduction - toggle connected nodes to extinguish all lights',
    category: 'puzzle',
    modes: ['levels', 'endless'],
    color: 'from-amber-500 via-yellow-600 to-rose-600',
    accentColor: '#f59e0b',
    iconName: 'Zap',
    description: 'Pure binary logic deduction. Tapping a node in the 5x5 cyber circuit inverts its light state along with its 4 orthogonal neighbors.',
    instructions: [
      'Tap any node to flip its illumination and all 4 adjacent neighbors',
      'Work systematically to turn off all 25 circuit lights',
      'Use the UNDO button to reverse unintended moves',
      'Solve in the minimum target moves to earn bonus energy stars'
    ],
    totalLevels: 20
  },
  {
    id: 'word-pulse',
    title: 'Word Pulse',
    tagline: '5-letter cyber word deduction with real-time feedback & virtual keyboard',
    category: 'puzzle',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-teal-500 via-emerald-600 to-cyan-600',
    accentColor: '#10b981',
    iconName: 'Type',
    description: 'Crack the secret 5-letter cyber code word in 6 tries or fewer. High-tech feedback colors highlight correct positions and candidate letters.',
    instructions: [
      'Type any valid 5-letter word using on-screen keyboard or typing',
      'Green tile indicates correct letter in the exact spot',
      'Yellow tile indicates letter is in the word but different spot',
      'Gray tile indicates letter is not in the secret word'
    ]
  },
  {
    id: 'neon-connect',
    title: 'Neon Connect',
    tagline: 'Connect matching neon circuit terminals with non-overlapping pipe paths',
    category: 'puzzle',
    modes: ['levels', 'endless'],
    badge: 'NEW',
    color: 'from-rose-500 via-purple-600 to-cyan-500',
    accentColor: '#f43f5e',
    iconName: 'GitCommit',
    description: 'Link pairs of matching neon color nodes across the grid. Form continuous electrical paths without overlapping pipes to energize the board.',
    instructions: [
      'Tap or drag from a colored terminal to begin drawing a pipe',
      'Guide the pipe to its matching color terminal',
      'Never cross or intersect another active color pipe',
      'Connect all pairs to complete the circuit and advance'
    ],
    totalLevels: 30
  },
  {
    id: 'simon-echo',
    title: 'Simon Echo',
    tagline: 'Audiovisual sequence memory - repeat expanding melodic synthesizer loops',
    category: 'arcade',
    modes: ['endless', 'levels'],
    badge: 'HOT',
    color: 'from-cyan-500 via-rose-600 to-amber-500',
    accentColor: '#06b6d4',
    iconName: 'Music',
    description: 'Echo the cyber melody! 4 vibrant quadrant pads flash and chime harmonic musical tones in an ever-growing sequence. Repeat the melody without mistakes.',
    instructions: [
      'Watch and listen closely as the pads chime in sequence',
      'Tap the 4 pads in the exact matching order',
      'Each round adds a new note to the melody and quickens tempo',
      'Survive 12+ notes to achieve master synthesizer status'
    ]
  }
];

export function getGameById(id: string): GameMetadata | undefined {
  return GAME_CATALOG.find(game => game.id === id);
}
