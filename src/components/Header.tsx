import React from 'react';
import { Volume2, VolumeX, Sparkles, Download, Smartphone } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  totalStars: number;
  installPrompt: any;
  onInstall: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  totalStars,
  installPrompt,
  onInstall
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-game-border safe-top px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-game-neonCyan via-game-accent to-game-neonPink p-0.5 shadow-neon-indigo flex items-center justify-center">
            <div className="w-full h-full bg-game-dark rounded-[10px] flex items-center justify-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-game-neonCyan to-game-neonPink font-black text-lg">
                ∞
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider leading-none uppercase bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Unlimited
            </h1>
            <span className="text-[10px] font-semibold text-game-neonCyan tracking-widest uppercase">
              Games Hub
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2">
          {/* Star Counter */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{totalStars}</span>
          </div>

          {/* Install PWA Button (if available) */}
          {installPrompt && (
            <button
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onInstall();
              }}
              className="px-2.5 py-1 rounded-full bg-game-accent hover:bg-game-accentGlow text-white text-xs font-semibold flex items-center space-x-1 shadow-neon-indigo animate-pulse"
              title="Install Unlimited Games App"
            >
              <Download className="w-3 h-3" />
              <span>Install</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              haptics.tap();
            }}
            className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-game-neonCyan" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Haptics Toggle (if supported on mobile) */}
          {haptics.isSupported() && (
            <button
              onClick={() => {
                onToggleHaptics();
                haptics.tap();
              }}
              className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle Haptics"
            >
              <Smartphone className={`w-4 h-4 ${hapticsEnabled ? 'text-game-neonPink' : 'text-slate-500'}`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
