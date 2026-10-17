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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-panel border border-game-border p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-6">
        {/* Title */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-game-neonCyan">
            Game Paused
          </span>
          <h2 className="text-2xl font-black text-white">{game.title}</h2>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          {/* Resume */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onResume();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-game-accent to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-neon-indigo active:scale-95 transition-transform"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-2xl glass-pill hover:bg-white/10 text-slate-200 font-bold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          {/* Exit to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-3 px-4 rounded-2xl glass-pill hover:bg-rose-500/20 text-rose-300 font-bold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform"
          >
            <Home className="w-4 h-4" />
            <span>EXIT TO LOBBY</span>
          </button>
        </div>

        {/* Quick Instructions Card */}
        {game.instructions && game.instructions.length > 0 && (
          <div className="w-full bg-slate-900/60 rounded-2xl p-3.5 border border-white/5 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-game-neonCyan" />
              <span>How To Play:</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
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
