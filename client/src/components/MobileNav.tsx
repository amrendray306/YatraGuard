import React from 'react';
import { Compass, Navigation, ShieldCheck, Bot, IndianRupee, MoreHorizontal } from 'lucide-react';

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
    { id: 'dashboard', label: 'Home', icon: Compass },
    { id: 'fare', label: 'Fares', icon: IndianRupee },
    { id: 'map', label: 'Map', icon: Navigation },
    { id: 'guardian', label: 'Guardian AI', icon: Bot },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl touch-min transition-all ${
              isActive
                ? 'text-amber-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-500/20' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-amber-400' : ''} transition-transform`} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={openMoreSheet}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 touch-min transition-colors"
      >
        <div className="p-1 rounded-lg">
          <MoreHorizontal className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">More</span>
      </button>
    </nav>
  );
};
