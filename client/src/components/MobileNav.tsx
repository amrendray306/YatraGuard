import React from 'react';
import { Compass, Navigation, IndianRupee, Users, MoreHorizontal } from 'lucide-react';

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
    { id: 'map', label: 'Safety Map', icon: Navigation },
    { id: 'routes', label: 'Tariff', icon: IndianRupee },
    { id: 'buddy', label: 'Buddy', icon: Users },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg"
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl touch-min transition-colors ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-sky-50 dark:bg-sky-500/15' : ''}`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={openMoreSheet}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 touch-min transition-colors"
      >
        <div className="p-1 rounded-lg">
          <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">More</span>
      </button>
    </nav>
  );
};
