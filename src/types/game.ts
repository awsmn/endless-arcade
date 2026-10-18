export type GameCategory = 
  | 'all'
  | 'endless'
  | 'levels'
  | 'reflex'
  | 'arcade'
  | 'puzzle'
  | 'retro'
  | 'merge';

export type GameMode = 'endless' | 'levels';

export interface GameMetadata {
  id: string;
  title: string;
  tagline: string;
  category: GameCategory;
  modes: GameMode[];
  badge?: 'HOT' | 'NEW';
  color: string; // Tailwind gradient or accent
  accentColor: string;
  iconName: string;
  description: string;
  instructions: string[];
  totalLevels?: number;
}

export interface UserGameProgress {
  gameId: string;
  highScore: number;
  highestLevelUnlocked: number;
  starsEarned: Record<number, number>; // levelNumber -> stars (1..3)
  playCount: number;
  lastPlayed: number;
}

export interface PlatformSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  vibrationIntensity: 'light' | 'medium' | 'strong';
  theme: 'dark' | 'light' | 'neon' | 'cyber';
}

export interface GameScoreUpdate {
  score: number;
  level?: number;
  stars?: number;
  stats?: Record<string, number | string>;
}

export interface GameEngine {
  init(canvas: HTMLCanvasElement, container: HTMLElement): void;
  start(mode: GameMode, level?: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  onScoreUpdate?: (update: GameScoreUpdate) => void;
  onGameOver?: (finalScore: number, isNewHighScore: boolean, stars?: number) => void;
}
