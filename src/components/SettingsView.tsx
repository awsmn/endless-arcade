import React from 'react';
import { Volume2, VolumeX, Smartphone, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { PlatformSettings } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

interface SettingsViewProps {
  settings: PlatformSettings;
  onUpdateSettings: (patch: Partial<PlatformSettings>) => void;
  onResetProgress: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress
}) => {
  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5 animate-fade-in pb-24">
      <div>
        <h2 className="text-xl font-black text-white">Settings</h2>
        <p className="text-xs text-slate-400">Audio, haptics & platform preferences</p>
      </div>

      {/* Toggles */}
      <div className="glass-panel rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
        {/* Sound Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-game-accent">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Sound Effects</h4>
              <p className="text-[11px] text-slate-400">Synthesized 8-bit audio effects</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !settings.soundEnabled;
              onUpdateSettings({ soundEnabled: next });
              sounds.setEnabled(next);
              if (next) sounds.playTap();
            }}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              settings.soundEnabled ? 'bg-game-accent' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Haptics Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center text-game-neonPink">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Haptic Vibration</h4>
              <p className="text-[11px] text-slate-400">Tactile physical vibration on taps & impacts</p>
            </div>
          </div>
          <button
            disabled={!haptics.isSupported()}
            onClick={() => {
              const next = !settings.hapticsEnabled;
              onUpdateSettings({ hapticsEnabled: next });
              haptics.setEnabled(next);
              if (next) haptics.bump();
            }}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              !haptics.isSupported()
                ? 'opacity-40 cursor-not-allowed bg-slate-800'
                : settings.hapticsEnabled
                ? 'bg-game-neonPink'
                : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                settings.hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* PWA & Offline Info */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-2">
        <div className="flex items-center space-x-2 text-game-neonGreen text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Offline Ready PWA</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Unlimited Arcade runs fully offline without an internet connection once loaded. Add it to your home screen for the full native experience.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="pt-2">
        <button
          onClick={() => {
            if (window.confirm('Reset all saved high scores, stars, and favorites?')) {
              sounds.playTap();
              haptics.failure();
              onResetProgress();
            }
          }}
          className="w-full py-3 px-4 rounded-2xl glass-pill hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center space-x-2 border border-rose-500/20 active:scale-95 transition-transform"
        >
          <Trash2 className="w-4 h-4" />
          <span>Reset All Progress & Scores</span>
        </button>
      </div>
    </div>
  );
};
