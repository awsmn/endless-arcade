import React from 'react';
import { Volume2, VolumeX, Smartphone, Trash2, CheckCircle2, Sun, Moon } from 'lucide-react';
import { PlatformSettings } from '../types/game';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';
import { DifficultyPicker } from './DifficultyPicker';

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
  const isLight = settings.theme === 'light';

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-5 animate-fade-in pb-24">
      <div>
        <h2 className="text-2xl font-pop font-black text-slate-900 dark:text-white pop-text-shadow">
          ARCADE <span className="text-pop-cyan">SETTINGS</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">Theme, audio, haptics & platform preferences</p>
      </div>

      {/* Toggles */}
      <DifficultyPicker value={settings.difficulty} onChange={difficulty => onUpdateSettings({ difficulty })} />
      <p className="text-xs text-slate-500 dark:text-slate-400">Applies to your next game. 2048 always uses classic rules.</p>
      <div className="bg-white dark:bg-[#14192b] rounded-2xl border-2 border-black shadow-pop divide-y-2 divide-black/20 dark:divide-black/80 overflow-hidden">
        {/* Theme Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-pop-yellow border-2 border-black shadow-pop-xs flex items-center justify-center text-black">
              {isLight ? <Sun className="w-4 h-4 stroke-[2.5]" /> : <Moon className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <h4 className="text-sm font-pop font-black text-slate-900 dark:text-white">LIGHT THEME</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Switch between Light and Dark arcade style</p>
            </div>
          </div>
          <button
            role="switch"
            aria-label="Light theme"
            aria-checked={isLight}
            onClick={() => {
              const nextTheme = isLight ? 'dark' : 'light';
              onUpdateSettings({ theme: nextTheme });
              sounds.playTap();
              haptics.tap();
            }}
            className={`w-12 h-7 rounded-full p-1 border-2 border-black transition-colors ${
              isLight ? 'bg-pop-yellow' : 'bg-slate-300 dark:bg-[#1c2440]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-black dark:bg-white shadow transition-transform ${
                isLight ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sound Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-pop-cyan border-2 border-black shadow-pop-xs flex items-center justify-center text-black">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 stroke-[2.5]" /> : <VolumeX className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <h4 className="text-sm font-pop font-black text-slate-900 dark:text-white">SOUND EFFECTS</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Synthesized 8-bit audio effects</p>
            </div>
          </div>
          <button
            role="switch"
            aria-label="Sound effects"
            aria-checked={settings.soundEnabled}
            onClick={() => {
              const next = !settings.soundEnabled;
              onUpdateSettings({ soundEnabled: next });
              sounds.setEnabled(next);
              if (next) sounds.playTap();
            }}
            className={`w-12 h-7 rounded-full p-1 border-2 border-black transition-colors ${
              settings.soundEnabled ? 'bg-pop-cyan' : 'bg-slate-300 dark:bg-[#1c2440]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-black shadow transition-transform ${
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Haptics Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-pop-pink border-2 border-black shadow-pop-xs flex items-center justify-center text-white">
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-pop font-black text-slate-900 dark:text-white">HAPTIC VIBRATION</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Tactile vibration on taps & impacts</p>
            </div>
          </div>
          <button
            role="switch"
            aria-label="Haptic vibration"
            aria-checked={settings.hapticsEnabled}
            disabled={!haptics.isSupported()}
            onClick={() => {
              const next = !settings.hapticsEnabled;
              onUpdateSettings({ hapticsEnabled: next });
              haptics.setEnabled(next);
              if (next) haptics.bump();
            }}
            className={`w-12 h-7 rounded-full p-1 border-2 border-black transition-colors ${
              !haptics.isSupported()
                ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-800'
                : settings.hapticsEnabled
                ? 'bg-pop-pink'
                : 'bg-slate-300 dark:bg-[#1c2440]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                settings.hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* PWA & Offline Info */}
      <div className="bg-white dark:bg-[#14192b] p-4 rounded-2xl border-2 border-black shadow-pop-xs space-y-1.5 pop-dots-dense">
        <div className="flex items-center space-x-2 text-pop-lime text-xs font-pop font-black uppercase">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>OFFLINE READY PWA</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          Endless Arcade runs fully offline without an internet connection once loaded. Add it to your home screen for the full native arcade experience!
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
          className="w-full py-3 px-4 rounded-2xl bg-pop-red hover:bg-rose-600 text-white font-pop font-black text-xs flex items-center justify-center space-x-2 border-2 border-black shadow-pop active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase tracking-wider"
        >
          <Trash2 className="w-4 h-4 stroke-[2.5]" />
          <span>RESET ALL PROGRESS & SCORES</span>
        </button>
      </div>
    </div>
  );
};
