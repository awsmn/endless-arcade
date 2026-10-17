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
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-pop flex items-center space-x-1.5 transition-all duration-150 ${
                isSelected
                  ? 'bg-pop-pink text-white border-2 border-black shadow-pop-sm scale-105 -rotate-1'
                  : 'bg-white dark:bg-[#151b30] text-slate-800 dark:text-slate-300 border-2 border-black hover:bg-slate-100 dark:hover:bg-[#1d2542] hover:text-black dark:hover:text-white shadow-[1.5px_1.5px_0px_#000] active:scale-95'
              }`}
            >
              <span className="text-sm">{cat.emoji}</span>
              <span className="font-black uppercase tracking-wider text-[11px]">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
