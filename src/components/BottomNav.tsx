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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d111f]/95 backdrop-blur-lg border-t-2 border-black safe-bottom px-4 py-2 shadow-[0_-4px_0_rgba(0,0,0,0.2)] dark:shadow-[0_-4px_0_rgba(0,0,0,0.5)] pop-dots-bg transition-colors duration-200">
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
                  ? 'bg-pop-yellow text-black border-2 border-black shadow-pop-sm -translate-y-1'
                  : 'text-slate-600 hover:text-black dark:text-slate-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.8px]' : 'stroke-[2px]'}`} />
                {tab.badge && (
                  <span className="absolute -top-2 -right-3 font-bungee text-[9px] rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center border border-black shadow-[1px_1px_0px_#000] bg-pop-pink text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-wider font-pop uppercase ${
                isActive ? 'font-black text-black' : 'font-bold text-slate-700 dark:text-slate-300'
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
