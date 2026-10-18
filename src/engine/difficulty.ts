import { storage } from './storage';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES = {
  easy: { label: 'Chill', pace: 0.8, mines: 8, description: 'More time to react. A gentler start.' },
  normal: { label: 'Arcade', pace: 1, mines: 10, description: 'The original challenge, with a smoother ramp.' },
  hard: { label: 'Expert', pace: 1.2, mines: 14, description: 'Faster action. Tighter decisions.' }
} as const;

// A session keeps its chosen pace until the player starts another game.
export const getDifficulty = () => DIFFICULTIES[storage.getSettings().difficulty];
