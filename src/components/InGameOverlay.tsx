import React from 'react';
import { Pause, Volume2, VolumeX, ArrowLeft, Trophy, Sun, Moon } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { GameMetadata } from '../types/game';

interface InGameOverlayProps {
  difficulty: string;
  game: GameMetadata;
  score: number;
  highScore: number;
  level?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light' | 'neon' | 'cyber';
  onToggleTheme: () => void;
  onPause: () => void;
  onExit: () => void;
}

export const InGameOverlay: React.FC<InGameOverlayProps> = ({
  difficulty,
  game,
  score,
  highScore,
  level,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  onPause,
  onExit
}) => {
  const isLight = theme === 'light';

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 safe-top">
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto pointer-events-auto px-1 sm:px-3">
        {/* Left: Back / Exit Button */}
        <button
          onClick={() => {
            sounds.playTap();
            haptics.tap();
            onExit();
          }}
          className="w-9 h-9 rounded-xl bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 active:scale-95 transition-all"
          aria-label="Exit Game"
          title="Exit to lobby"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Center: Live Score Display */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{difficulty}</span>
          <div className="px-4 py-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center space-x-2 transition-colors">
            <span className="text-xl font-bungee text-amber-500 dark:text-amber-400 tracking-wider">
              {score.toLocaleString()}
            </span>
            {highScore > 0 && (
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-700 text-[11px] text-sky-500 dark:text-sky-400 font-pop font-bold">
                <Trophy className="w-3.5 h-3.5 fill-current" />
                <span>{highScore.toLocaleString()}</span>
              </div>
            )}
          </div>
          {level && (
            <span className="text-[9px] font-bungee text-rose-500 dark:text-rose-400 tracking-wider uppercase mt-0.5">
              LVL {level}
            </span>
          )}
        </div>

        {/* Right: Controls (Sound, Light/Dark Theme, Pause) */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Sound Mute/Unmute */}
          <button
            onClick={() => {
              onToggleSound();
              haptics.tap();
            }}
            className={`w-9 h-9 rounded-xl border backdrop-blur-md shadow-sm flex items-center justify-center transition-all ${
              soundEnabled
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/40 hover:bg-sky-500/25'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700/80 hover:text-slate-600 dark:hover:text-slate-200'
            } active:scale-95`}
            aria-label="Toggle Sound"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <VolumeX className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          {/* Light / Dark Theme Toggle Button */}
          <button
            onClick={() => {
              onToggleTheme();
              haptics.tap();
            }}
            className={`w-9 h-9 rounded-xl border backdrop-blur-md shadow-sm flex items-center justify-center transition-all ${
              isLight
                ? 'bg-amber-100/90 text-amber-700 border-amber-300/80 hover:bg-amber-200/90'
                : 'bg-slate-800/85 text-amber-300 border-slate-700/80 hover:bg-slate-700/90'
            } active:scale-95`}
            aria-label="Toggle Light/Dark Theme"
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <Sun className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2.2]" />
            )}
          </button>

          {/* Pause Button */}
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onPause();
            }}
            className="w-9 h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-sm flex items-center justify-center active:scale-95 transition-all"
            aria-label="Pause Game"
            title="Pause game"
          >
            <Pause className="w-4 h-4 stroke-[2.5] fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
