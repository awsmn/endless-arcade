import React from 'react';
import { Volume2, VolumeX, Sparkles, Download, Smartphone, Sun, Moon } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  theme: 'dark' | 'light' | 'neon' | 'cyber';
  onToggleTheme: () => void;
  totalStars: number;
  installPrompt: any;
  onInstall: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  theme,
  onToggleTheme,
  totalStars,
  installPrompt,
  onInstall
}) => {
  const isLight = theme === 'light';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0c101c]/90 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-sm safe-top px-4 py-3 transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2.5">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-amber-400 dark:bg-amber-500 shadow-sm flex items-center justify-center transform -rotate-2 transition-transform group-hover:rotate-0">
              <span className="font-bungee text-slate-950 text-xl leading-none">
                ∞
              </span>
            </div>
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-bungee text-[8px] px-1.5 py-0.5 rounded-full shadow-sm rotate-12">
              POP
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-pop tracking-wider leading-none uppercase text-slate-900 dark:text-white">
                Endless <span className="text-amber-500 dark:text-amber-400">Arcade</span>
              </h1>
            </div>
            <span className="text-[9px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase block mt-0.5">
              SOOTHING EDITION
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1.5">
          {/* Star Counter */}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-400/30 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span className="text-xs font-bungee leading-none">{totalStars}</span>
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={() => {
              onToggleTheme();
              haptics.tap();
            }}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              isLight
                ? 'bg-amber-100 text-amber-800 border-amber-300/80 hover:bg-amber-200'
                : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
            } active:scale-95 shadow-sm`}
            aria-label="Toggle Light/Dark Theme"
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <Sun className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2.2]" />
            )}
          </button>

          {/* Install PWA Button (if available) */}
          {installPrompt && (
            <button
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onInstall();
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-pop flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
              title="Install Endless Arcade App"
            >
              <Download className="w-3 h-3 stroke-[2.5]" />
              <span className="font-bold text-[10px]">APP</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              haptics.tap();
            }}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
              soundEnabled
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/40 hover:bg-sky-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200'
            } active:scale-95 shadow-sm`}
            aria-label="Toggle Sound"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <VolumeX className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          {/* Haptics Toggle (if supported on mobile) */}
          {haptics.isSupported() && (
            <button
              onClick={() => {
                onToggleHaptics();
                haptics.tap();
              }}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                hapticsEnabled
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200'
              } active:scale-95 shadow-sm`}
              aria-label="Toggle Haptics"
              title="Toggle Haptic Feedback"
            >
              <Smartphone className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
