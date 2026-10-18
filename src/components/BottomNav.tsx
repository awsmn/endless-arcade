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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0c101c]/90 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-sm safe-bottom px-4 py-2 transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                sounds.playTap();
                haptics.tap();
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-amber-100/90 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-400/30 shadow-sm -translate-y-0.5'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.9px]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 font-bungee text-[9px] rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center bg-rose-500 text-white shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-wider font-pop uppercase ${
                isActive ? 'font-black text-amber-800 dark:text-amber-300' : 'font-semibold text-slate-500 dark:text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
