import React from 'react';
import { Pause, Volume2, VolumeX, ArrowLeft, Trophy } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { GameMetadata } from '../types/game';

interface InGameOverlayProps {
  game: GameMetadata;
  score: number;
  highScore: number;
  level?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onPause: () => void;
  onExit: () => void;
}

export const InGameOverlay: React.FC<InGameOverlayProps> = ({
  game,
  score,
  highScore,
  level,
  soundEnabled,
  onToggleSound,
  onPause,
  onExit
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 safe-top">
      <div className="flex items-center justify-between max-w-md mx-auto pointer-events-auto">
        {/* Left: Back / Exit Button */}
        <button
          onClick={() => {
            sounds.playTap();
            haptics.tap();
            onExit();
          }}
          className="w-9 h-9 rounded-xl bg-[#14192b] border-2 border-black shadow-pop-xs flex items-center justify-center text-white hover:text-pop-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          aria-label="Exit Game"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Center: Live Score Display */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 rounded-2xl bg-[#0e1222] border-2 border-black shadow-pop-sm flex items-center space-x-2">
            <span className="text-xl font-bungee text-pop-yellow tracking-wider">
              {score.toLocaleString()}
            </span>
            {highScore > 0 && (
              <div className="flex items-center space-x-1 pl-2 border-l-2 border-black/80 text-[11px] text-pop-cyan font-pop font-black">
                <Trophy className="w-3.5 h-3.5 fill-pop-cyan" />
                <span>{highScore.toLocaleString()}</span>
              </div>
            )}
          </div>
          {level && (
            <span className="text-[9px] font-bungee text-pop-pink tracking-widest uppercase mt-0.5 drop-shadow">
              LVL {level}
            </span>
          )}
        </div>

        {/* Right: Controls (Mute & Pause) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              onToggleSound();
              haptics.tap();
            }}
            className={`w-9 h-9 rounded-xl border-2 border-black shadow-pop-xs flex items-center justify-center transition-all ${
              soundEnabled
                ? 'bg-pop-cyan text-black'
                : 'bg-[#14192b] text-slate-400 hover:text-white'
            } active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <VolumeX className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onPause();
            }}
            className="w-9 h-9 rounded-xl bg-pop-pink text-white border-2 border-black shadow-pop-xs flex items-center justify-center hover:bg-pink-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 stroke-[2.5] fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
