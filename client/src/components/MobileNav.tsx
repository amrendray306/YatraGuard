import React from 'react';
import { Compass, Navigation, ShieldCheck, User as UserIcon, MoreHorizontal } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openMoreSheet: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  openMoreSheet,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Explore', icon: Compass },
    { id: 'map', label: 'Safety', icon: Navigation },
    { id: 'community', label: 'Community', icon: ShieldCheck },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-1 pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 min-w-[52px] rounded-xl touch-min transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-sky-50 dark:bg-sky-500/15' : ''}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Open all platform features"
        onClick={openMoreSheet}
        className="flex flex-col items-center justify-center py-1 px-1.5 min-w-[52px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 touch-min transition-colors"
      >
        <div className="p-1 rounded-lg">
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">More</span>
      </button>
    </nav>
  );
};
