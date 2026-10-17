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
    <div className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto">
      <div className="bg-[#14192b] border-2 border-black p-3.5 rounded-2xl shadow-pop flex items-center justify-between space-x-3 pop-dots-dense">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-pop-yellow border-2 border-black shadow-pop-xs flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h4 className="text-xs font-pop font-black text-white pop-text-shadow leading-tight">INSTALL APP</h4>
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
            className="px-3.5 py-1.5 rounded-xl bg-pop-pink hover:bg-pink-400 text-white font-pop font-black text-xs border-2 border-black shadow-pop-xs active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all tracking-wider"
          >
            INSTALL
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              haptics.tap();
              setDismissed(true);
            }}
            className="w-7 h-7 rounded-lg bg-black/60 border border-black flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
