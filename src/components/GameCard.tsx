import React from 'react';
import { Play, Heart, Trophy, Sparkles } from 'lucide-react';
import { GameMetadata, UserGameProgress } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface GameCardProps {
  game: GameMetadata;
  progress: UserGameProgress;
  isFavorite: boolean;
  isPlayable: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onSelectGame: (game: GameMetadata) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  progress,
  isFavorite,
  isPlayable,
  onToggleFavorite,
  onSelectGame
}) => {
  const isHotOrNew = game.badge === 'HOT' || game.badge === 'NEW';

  return (
    <div
      onClick={() => {
        if (isPlayable) {
          sounds.playTap();
          haptics.bump();
          onSelectGame(game);
        }
      }}
      className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-[#14192b] border-2 border-black shadow-pop transition-all duration-200 ${
        isPlayable
          ? 'cursor-pointer hover:shadow-pop-lg hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-xs'
          : 'opacity-70 cursor-default'
      }`}
    >
      {/* Top Banner & Gradient Art with Ben-Day Halftone */}
      <div className={`h-24 w-full bg-gradient-to-br ${game.color} relative p-3 flex flex-col justify-between overflow-hidden border-b-2 border-black pop-dots-dense`}>
        {/* Large Game Illustration Graphic Watermark */}
        <div className="absolute right-1 -bottom-3 text-6xl sm:text-7xl font-black text-black/25 select-none pointer-events-none drop-shadow-md transform group-hover:scale-115 group-hover:rotate-6 transition-all duration-300">
          {game.illustration || '🎮'}
        </div>

        {/* Top Badges & Favorite Button */}
        <div className="flex items-center justify-between z-10">
          <div>
            {isHotOrNew && (
              <span className={`text-[9px] font-bungee px-2.5 py-0.5 rounded border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-wider inline-block ${
                game.badge === 'HOT'
                  ? 'bg-pop-pink text-white -rotate-3'
                  : 'bg-pop-cyan text-black rotate-3'
              }`}>
                {game.badge}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              sounds.playTap();
              haptics.tap();
              onToggleFavorite(e);
            }}
            className="w-7 h-7 rounded-xl bg-black/70 border border-black flex items-center justify-center text-white/90 hover:text-white hover:scale-110 active:scale-125 transition-transform shadow-[1px_1px_0px_#000]"
            aria-label="Toggle Favorite"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-pop-pink text-pop-pink' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Game Title with mini illustration badge */}
        <div className="z-10 flex items-center space-x-1.5">
          <span className="text-lg drop-shadow select-none group-hover:scale-110 transition-transform">
            {game.illustration}
          </span>
          <h3 className="text-base font-pop font-black text-white pop-text-shadow leading-tight">
            {game.title}
          </h3>
        </div>
      </div>

      {/* Card Body Info */}
      <div className="p-3.5 flex flex-col justify-between space-y-3 bg-white dark:bg-[#14192b]">
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
          {game.tagline}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-1 border-t-2 border-black/20 dark:border-black/40 text-xs">
          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-pop-yellow fill-pop-yellow" />
            <span className="font-bungee text-[11px] text-slate-900 dark:text-white">
              {progress.highScore > 0 ? progress.highScore.toLocaleString() : '---'}
            </span>
          </div>

          {game.totalLevels && (
            <div className="flex items-center space-x-1 text-pop-purple dark:text-pop-cyan text-[11px] font-pop font-black">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>
                LVL {progress.highestLevelUnlocked}/{game.totalLevels}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {isPlayable ? (
            <button
              className="w-full py-2.5 px-3 rounded-xl bg-pop-yellow hover:bg-yellow-300 text-black font-pop font-black text-xs flex items-center justify-center space-x-1.5 border-2 border-black shadow-pop-sm group-hover:shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-black stroke-[2]" />
              <span>PLAY NOW</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-[#1c233c] text-slate-500 dark:text-slate-400 font-pop font-bold text-xs text-center border-2 border-black/60 uppercase tracking-wider">
              COMING SOON
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
