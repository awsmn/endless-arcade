import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface InstallBannerProps {
  promptEvent: any;
  onInstall: () => void;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ promptEvent, onInstall }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!promptEvent || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto animate-bounce-short">
      <div className="glass-panel border border-game-neonCyan/40 p-3.5 rounded-2xl shadow-neon-cyan flex items-center justify-between space-x-3 bg-gradient-to-r from-game-card to-game-cardHover">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-game-neonCyan to-game-accent p-0.5 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-game-dark rounded-[10px] flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-game-neonCyan" />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black text-white leading-tight">Install Endless Arcade</h4>
            <p className="text-[10px] text-slate-300">Play offline & enjoy full-screen arcade!</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              sounds.playTap();
              haptics.bump();
              onInstall();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-game-neonCyan to-game-accent text-game-dark font-black text-xs shadow-md active:scale-95 transition-transform"
          >
            INSTALL
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              setDismissed(true);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
