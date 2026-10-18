import React from 'react';
import { Play, RotateCcw, Home, HelpCircle } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { GameMetadata } from '../types/game';

interface PauseModalProps {
  game: GameMetadata;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  game,
  onResume,
  onRestart,
  onExit
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in pop-dots-dense">
      <div role="dialog" aria-modal="true" aria-label="Game paused" className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-700/80 p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-5 transition-colors">
        {/* Title */}
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <span className="text-[10px] font-bungee uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-400/40 px-3 py-0.5 rounded-full shadow-sm inline-block">
            GAME PAUSED
          </span>
          <h2 className="text-2xl font-pop font-black text-slate-900 dark:text-white">{game.title}</h2>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          {/* Resume */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onResume();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-pop font-black text-sm flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all tracking-wider"
          >
            <Play className="w-4 h-4 fill-current stroke-[2]" />
            <span>RESUME PLAY</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-400/40 font-pop font-bold text-sm flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all tracking-wider"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.2]" />
            <span>RESTART</span>
          </button>

          {/* Exit to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-pop font-bold text-sm flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all tracking-wider"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>EXIT TO LOBBY</span>
          </button>
        </div>

        {/* Quick Instructions Card */}
        {game.instructions && game.instructions.length > 0 && (
          <div className="w-full bg-slate-50 dark:bg-[#0c101c] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-pop font-black text-amber-600 dark:text-amber-400">
              <HelpCircle className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="uppercase">HOW TO PLAY</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              {game.instructions.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
