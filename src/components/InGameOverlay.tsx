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
          className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-transform"
          aria-label="Exit Game"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center: Live Score Display */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1 rounded-2xl glass-panel border border-white/10 shadow-lg flex items-center space-x-2">
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tight">
              {score.toLocaleString()}
            </span>
            {highScore > 0 && (
              <div className="flex items-center space-x-1 pl-2 border-l border-white/10 text-[11px] text-amber-400 font-bold">
                <Trophy className="w-3 h-3" />
                <span>{highScore.toLocaleString()}</span>
              </div>
            )}
          </div>
          {level && (
            <span className="text-[10px] font-bold text-game-neonCyan tracking-widest uppercase mt-0.5">
              Level {level}
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
            className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-transform"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-game-neonCyan" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onPause();
            }}
            className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition-transform"
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
