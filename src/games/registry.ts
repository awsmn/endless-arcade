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
    badge: 'POPULAR',
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
    badge: 'ENDLESS',
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
    badge: 'POPULAR',
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
    tagline: 'Tactile logic deduction with haptic feedback & guaranteed solvable boards',
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
  }
];

export function getGameById(id: string): GameMetadata | undefined {
  return GAME_CATALOG.find(game => game.id === id);
}
