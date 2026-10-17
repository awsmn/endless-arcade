import React from 'react';
import { Gamepad2, Heart, Trophy, Settings } from 'lucide-react';
import { sounds } from '../engine/audio';
import { haptics } from '../engine/haptics';

export type NavTab = 'arcade' | 'favorites' | 'stats' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  favoritesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  favoritesCount
}) => {
  const tabs = [
    { id: 'arcade' as NavTab, label: 'Arcade', icon: Gamepad2 },
    { id: 'favorites' as NavTab, label: 'Favorites', icon: Heart, badge: favoritesCount > 0 ? favoritesCount : null },
    { id: 'stats' as NavTab, label: 'Stats', icon: Trophy },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-game-border safe-bottom px-6 py-2">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-game-neonCyan scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'stroke-[1.8px]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-game-neonPink text-white text-[9px] font-black rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-semibold tracking-wider ${isActive ? 'text-game-neonCyan' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-game-neonCyan shadow-neon-cyan" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
