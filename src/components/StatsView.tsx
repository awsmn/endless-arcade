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
        <h2 className="text-2xl font-pop font-black text-white pop-text-shadow">
          ARCADE <span className="text-pop-yellow">STATS</span>
        </h2>
        <p className="text-xs text-slate-300">Track your records, stars, and milestones</p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-pop-yellow text-black border-2 border-black rounded-2xl p-4 shadow-pop -rotate-1">
          <div className="flex items-center space-x-1.5 text-xs font-pop font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-black text-black" />
            <span>STARS COLLECTED</span>
          </div>
          <div className="text-3xl font-bungee text-black pt-1">{totalStars}</div>
        </div>

        <div className="bg-pop-cyan text-black border-2 border-black rounded-2xl p-4 shadow-pop rotate-1">
          <div className="flex items-center space-x-1.5 text-xs font-pop font-black uppercase tracking-wider">
            <Flame className="w-4 h-4 fill-black text-black" />
            <span>SESSIONS PLAYED</span>
          </div>
          <div className="text-3xl font-bungee text-black pt-1">{totalPlays}</div>
        </div>
      </div>

      {/* Per Game High Scores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-pop font-black uppercase tracking-wider text-pop-pink pop-text-shadow">
            ★ PERSONAL BEST RECORDS ★
          </h3>
        </div>

        <div className="space-y-2">
          {gameStats.map(({ game, progress }) => (
            <div
              key={game.id}
              className="bg-[#14192b] p-3 rounded-2xl border-2 border-black shadow-pop-xs flex items-center justify-between hover:translate-x-0.5 hover:shadow-pop-sm transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${game.color} border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-bungee text-xs text-white`}>
                  {game.title.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-pop font-black text-white">{game.title}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Played {progress.playCount} times</span>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-xs font-bungee text-pop-yellow bg-black/70 px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0px_#000]">
                <Trophy className="w-3.5 h-3.5 fill-pop-yellow text-pop-yellow" />
                <span>{progress.highScore > 0 ? progress.highScore.toLocaleString() : '---'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
