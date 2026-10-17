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
    <header className="sticky top-0 z-40 w-full bg-[#0d111f]/90 backdrop-blur-md border-b-2 border-black safe-top px-4 py-3 shadow-[0_4px_0_rgba(0,0,0,0.4)] pop-dots-bg">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-2.5">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-pop-yellow border-2 border-black shadow-pop-sm flex items-center justify-center transform -rotate-3 transition-transform group-hover:rotate-0">
              <span className="font-bungee text-black text-xl leading-none">
                ∞
              </span>
            </div>
            <span className="absolute -top-1.5 -right-2 bg-pop-pink text-white font-bungee text-[8px] px-1 rounded border border-black shadow-[1px_1px_0px_#000] rotate-12">
              POP!
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base font-pop tracking-wider leading-none uppercase text-white pop-text-shadow">
                Endless <span className="text-pop-yellow">Arcade</span>
              </h1>
            </div>
            <span className="text-[9px] font-black tracking-widest text-pop-cyan uppercase block mt-0.5">
              ★ ART POP EDITION ★
            </span>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2">
          {/* Star Counter */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pop-yellow text-black border-2 border-black shadow-pop-sm">
            <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
            <span className="text-xs font-bungee leading-none">{totalStars}</span>
          </div>

          {/* Install PWA Button (if available) */}
          {installPrompt && (
            <button
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onInstall();
              }}
              className="px-2.5 py-1 rounded-full bg-pop-pink hover:bg-pink-400 text-white text-xs font-pop flex items-center space-x-1 border-2 border-black shadow-pop-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              title="Install Endless Arcade App"
            >
              <Download className="w-3 h-3 stroke-[3]" />
              <span className="font-black">GET APP</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              haptics.tap();
            }}
            className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center transition-all ${
              soundEnabled
                ? 'bg-pop-cyan text-black shadow-pop-sm'
                : 'bg-[#151b30] text-slate-400 hover:text-white shadow-[1px_1px_0px_#000]'
            } active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
            aria-label="Toggle Sound"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 stroke-[2.5]" />
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
              className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center transition-all ${
                hapticsEnabled
                  ? 'bg-pop-pink text-white shadow-pop-sm'
                  : 'bg-[#151b30] text-slate-400 hover:text-white shadow-[1px_1px_0px_#000]'
              } active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
              aria-label="Toggle Haptics"
              title="Toggle Haptic Feedback"
            >
              <Smartphone className={`w-4 h-4 stroke-[2.5]`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
