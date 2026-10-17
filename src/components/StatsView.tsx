import React from 'react';
import { Trophy, Sparkles, Flame, Clock, Award } from 'lucide-react';
import { GAME_CATALOG } from '../games/registry';
import { storage } from '../engine/storage';

export const StatsView: React.FC = () => {
  const totalStars = storage.getTotalStars();
  let totalPlays = 0;
  const gameStats = GAME_CATALOG.map((g) => {
    const prog = storage.getProgress(g.id);
    totalPlays += prog.playCount;
    return {
      game: g,
      progress: prog
    };
  });

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5 animate-fade-in pb-24">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-white">Arcade Statistics</h2>
        <p className="text-xs text-slate-400">Track your records, stars, and milestones</p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Stars Collected</span>
          </div>
          <div className="text-2xl font-black text-white">{totalStars}</div>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-white/5 space-y-1">
          <div className="flex items-center space-x-1.5 text-game-neonCyan text-xs font-bold">
            <Flame className="w-4 h-4" />
            <span>Total Sessions</span>
          </div>
          <div className="text-2xl font-black text-white">{totalPlays}</div>
        </div>
      </div>

      {/* Per Game High Scores */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Personal Best Records
        </h3>

        <div className="space-y-2">
          {gameStats.map(({ game, progress }) => (
            <div
              key={game.id}
              className="glass-panel p-3 rounded-2xl border border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${game.color} flex items-center justify-center font-bold text-xs text-white`}>
                  {game.title.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{game.title}</h4>
                  <span className="text-[10px] text-slate-400">Played {progress.playCount} times</span>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-xs font-black text-amber-400">
                <Trophy className="w-3.5 h-3.5" />
                <span>{progress.highScore > 0 ? progress.highScore.toLocaleString() : '---'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
