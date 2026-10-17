import React from 'react';
import { Play, Heart, Trophy, Sparkles, Zap, Flame, Infinity as InfinityIcon } from 'lucide-react';
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
  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case 'HOT':
        return 'bg-rose-500 text-white';
      case 'NEW':
        return 'bg-game-neonCyan text-game-dark';
      case 'POPULAR':
        return 'bg-amber-400 text-game-dark';
      case 'ENDLESS':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-slate-700 text-slate-200';
    }
  };

  return (
    <div
      onClick={() => {
        if (isPlayable) {
          sounds.playTap();
          haptics.bump();
          onSelectGame(game);
        }
      }}
      className={`group relative overflow-hidden rounded-2xl glass-panel border border-game-border transition-all duration-300 ${
        isPlayable
          ? 'cursor-pointer hover:border-game-accent/50 hover:shadow-neon-indigo active:scale-[0.98]'
          : 'opacity-75 cursor-default'
      }`}
    >
      {/* Top Banner & Gradient Art */}
      <div className={`h-24 w-full bg-gradient-to-r ${game.color} relative p-3 flex flex-col justify-between overflow-hidden`}>
        {/* Subtle background glow circle */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {/* Top Badges & Favorite Button */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center space-x-1.5">
            {game.badge && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${getBadgeStyle(game.badge)}`}>
                {game.badge}
              </span>
            )}
            {game.modes.includes('endless') && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/40 text-white flex items-center space-x-0.5">
                <InfinityIcon className="w-2.5 h-2.5" />
                <span>Endless</span>
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
            className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white transition-transform active:scale-125"
            aria-label="Toggle Favorite"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-game-neonPink text-game-neonPink' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Game Title inside Banner */}
        <div className="z-10">
          <h3 className="text-lg font-black text-white drop-shadow-md leading-tight">
            {game.title}
          </h3>
        </div>
      </div>

      {/* Card Body Info */}
      <div className="p-3.5 flex flex-col justify-between space-y-3">
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {game.tagline}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-1 text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-200">
              {progress.highScore > 0 ? progress.highScore.toLocaleString() : '---'}
            </span>
          </div>

          {game.totalLevels && (
            <div className="flex items-center space-x-1 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-game-neonCyan" />
              <span>
                Lvl {progress.highestLevelUnlocked}/{game.totalLevels}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          {isPlayable ? (
            <button
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-game-accent to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md group-hover:shadow-neon-indigo transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PLAY NOW</span>
            </button>
          ) : (
            <div className="w-full py-2 px-3 rounded-xl bg-slate-800/80 text-slate-400 font-semibold text-xs text-center border border-slate-700/50">
              COMING NEXT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
