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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in pop-dots-dense">
      <div className="w-full max-w-sm bg-[#14192b] border-2 border-black p-6 rounded-3xl shadow-pop-lg flex flex-col items-center space-y-5">
        {/* Title */}
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <span className="text-[10px] font-bungee uppercase tracking-widest bg-pop-yellow text-black px-3 py-0.5 rounded border-2 border-black shadow-pop-xs -rotate-2 inline-block">
            GAME PAUSED
          </span>
          <h2 className="text-2xl font-pop font-black text-white pop-text-shadow">{game.title}</h2>
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
            className="w-full py-3.5 px-4 rounded-2xl bg-pop-yellow hover:bg-yellow-300 text-black font-pop font-black text-sm flex items-center justify-center space-x-2 border-2 border-black shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            <Play className="w-4 h-4 fill-black stroke-[2]" />
            <span>RESUME PLAY</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-pop-cyan hover:bg-cyan-300 text-black font-pop font-black text-sm flex items-center justify-center space-x-2 border-2 border-black shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>RESTART</span>
          </button>

          {/* Exit to Lobby */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              onExit();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-pop-pink hover:bg-pink-400 text-white font-pop font-black text-sm flex items-center justify-center space-x-2 border-2 border-black shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            <Home className="w-4 h-4 stroke-[2.5]" />
            <span>EXIT TO LOBBY</span>
          </button>
        </div>

        {/* Quick Instructions Card */}
        {game.instructions && game.instructions.length > 0 && (
          <div className="w-full bg-[#0d111f] rounded-2xl p-4 border-2 border-black shadow-pop-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-pop font-black text-pop-yellow">
              <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="uppercase">HOW TO PLAY</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
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
