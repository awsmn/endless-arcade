import React, { useState } from 'react';
import { GameMetadata } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { Dices, Play, Sparkles } from 'lucide-react';

interface RandomHeroPickerProps {
  catalog: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  isLight?: boolean;
}

export const RandomHeroPicker: React.FC<RandomHeroPickerProps> = ({
  catalog,
  onSelectGame,
  isLight = false
}) => {
  // Start with a random game from the catalog
  const [selectedGame, setSelectedGame] = useState<GameMetadata>(() => {
    const randomIndex = Math.floor(Math.random() * catalog.length);
    return catalog[randomIndex] || catalog[0];
  });
  const [isRolling, setIsRolling] = useState(false);

  const handleRollRandom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRolling || catalog.length <= 1) return;

    setIsRolling(true);
    sounds.playTap();
    haptics.tap();

    let rollCount = 0;
    const maxRolls = 6;
    const interval = setInterval(() => {
      rollCount++;
      sounds.playShuffle(1 + (rollCount / maxRolls) * 0.5);
      haptics.tap();

      const nextIndex = Math.floor(Math.random() * catalog.length);
      setSelectedGame(catalog[nextIndex]);

      if (rollCount >= maxRolls) {
        clearInterval(interval);
        // Ensure final game is different from original if possible
        const finalChoices = catalog.filter((g) => g.id !== selectedGame.id);
        const finalGame = finalChoices[Math.floor(Math.random() * finalChoices.length)] || catalog[0];
        setSelectedGame(finalGame);
        setIsRolling(false);
        sounds.playCollect(1.5);
        haptics.bump();
      }
    }, 60);
  };

  return (
    <div className="px-4">
      <div
        onClick={() => {
          if (!isRolling) {
            sounds.playTap();
            haptics.bump();
            onSelectGame(selectedGame);
          }
        }}
        className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br ${selectedGame.color} border-2 border-black shadow-pop-lg cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-sm transition-all duration-300 pop-dots-dense group`}
      >
        <div className="relative z-10 space-y-2.5">
          {/* Top Badges & Random Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded bg-pop-pink text-white text-[9px] font-bungee uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] -rotate-3 inline-block">
                🎲 SURPRISE PICK
              </span>
              {selectedGame.badge && (
                <span className="px-2 py-0.5 rounded bg-pop-yellow text-black text-[9px] font-bungee uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] rotate-2 inline-block">
                  {selectedGame.badge}
                </span>
              )}
            </div>

            <span className="text-[10px] font-bungee text-white/80 uppercase tracking-widest flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 fill-pop-yellow text-pop-yellow animate-spin" style={{ animationDuration: '4s' }} />
              <span>ARCADE WHEEL</span>
            </span>
          </div>

          {/* Game Title */}
          <h2 className={`text-2xl sm:text-3xl font-pop font-black text-white pop-text-shadow leading-tight transition-transform duration-150 ${isRolling ? 'scale-95 opacity-80' : 'scale-100'}`}>
            {selectedGame.title}
          </h2>

          {/* Tagline */}
          <p className="text-xs text-white/90 line-clamp-2 max-w-[280px] leading-relaxed font-medium">
            {selectedGame.tagline}
          </p>

          {/* Actions Row: Play Now + Pick Random */}
          <div className="pt-2 flex items-center space-x-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                sounds.playTap();
                haptics.bump();
                onSelectGame(selectedGame);
              }}
              className="py-2.5 px-4 rounded-xl bg-pop-yellow hover:bg-yellow-300 text-black font-pop font-black text-xs flex items-center space-x-1.5 border-2 border-black shadow-pop hover:shadow-pop-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-black stroke-[2.5]" />
              <span>PLAY NOW</span>
            </button>

            <button
              onClick={handleRollRandom}
              disabled={isRolling}
              title="Click to roll another random game"
              className={`py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-black font-pop font-black text-xs flex items-center space-x-1.5 border-2 border-black shadow-pop hover:shadow-pop-md active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider ${
                isRolling ? 'opacity-70 animate-pulse' : ''
              }`}
            >
              <Dices className={`w-4 h-4 text-pop-pink stroke-[2.5] ${isRolling ? 'animate-spin' : ''}`} />
              <span>{isRolling ? 'ROLLING...' : 'RANDOM'}</span>
            </button>
          </div>
        </div>

        {/* Ambient background illustration graphic */}
        <div className={`absolute right-2 -bottom-4 text-8xl sm:text-9xl font-black text-black/25 select-none pointer-events-none drop-shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${isRolling ? 'scale-75 rotate-180 opacity-10' : ''}`}>
          {selectedGame.illustration || '🎮'}
        </div>
      </div>
    </div>
  );
};
