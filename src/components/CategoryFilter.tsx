import React from 'react';
import { GameCategory } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (category: GameCategory) => void;
}

const CATEGORIES: { id: GameCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'All Games', emoji: '✨' },
  { id: 'endless', label: 'Endless', emoji: '♾️' },
  { id: 'levels', label: 'Campaign', emoji: '🎯' },
  { id: 'retro', label: 'Retro', emoji: '👾' },
  { id: 'reflex', label: 'Reflex', emoji: '⚡' },
  { id: 'arcade', label: 'Arcade', emoji: '🕹️' },
  { id: 'puzzle', label: 'Puzzle', emoji: '🧩' },
  { id: 'merge', label: 'Merge', emoji: '🍉' },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 px-4">
      <div className="flex items-center space-x-2 max-w-md mx-auto">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onSelectCategory(cat.id);
              }}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-r from-game-accent to-game-accentGlow text-white shadow-neon-indigo scale-105'
                  : 'glass-pill text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
