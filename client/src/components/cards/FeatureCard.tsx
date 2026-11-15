import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  ctaText?: string;
  onClick?: () => void;
  accentColor?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red' | 'cyan' | 'indigo' | 'rose';
}

const colorMap = {
  amber: {
    bgIcon: 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25',
    border: 'hover:border-amber-500/50',
    titleHover: 'group-hover:text-amber-400',
    cta: 'text-amber-400 group-hover:text-amber-300',
    glow: 'from-amber-500/10 to-transparent',
  },
  emerald: {
    bgIcon: 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25',
    border: 'hover:border-emerald-500/50',
    titleHover: 'group-hover:text-emerald-400',
    cta: 'text-emerald-400 group-hover:text-emerald-300',
    glow: 'from-emerald-500/10 to-transparent',
  },
  blue: {
    bgIcon: 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25',
    border: 'hover:border-blue-500/50',
    titleHover: 'group-hover:text-blue-400',
    cta: 'text-blue-400 group-hover:text-blue-300',
    glow: 'from-blue-500/10 to-transparent',
  },
  purple: {
    bgIcon: 'bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25',
    border: 'hover:border-purple-500/50',
    titleHover: 'group-hover:text-purple-400',
    cta: 'text-purple-400 group-hover:text-purple-300',
    glow: 'from-purple-500/10 to-transparent',
  },
  red: {
    bgIcon: 'bg-red-500/15 text-red-400 group-hover:bg-red-500/25',
    border: 'hover:border-red-500/50',
    titleHover: 'group-hover:text-red-400',
    cta: 'text-red-400 group-hover:text-red-300',
    glow: 'from-red-500/10 to-transparent',
  },
  cyan: {
    bgIcon: 'bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25',
    border: 'hover:border-cyan-500/50',
    titleHover: 'group-hover:text-cyan-400',
    cta: 'text-cyan-400 group-hover:text-cyan-300',
    glow: 'from-cyan-500/10 to-transparent',
  },
  indigo: {
    bgIcon: 'bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25',
    border: 'hover:border-indigo-500/50',
    titleHover: 'group-hover:text-indigo-400',
    cta: 'text-indigo-400 group-hover:text-indigo-300',
    glow: 'from-indigo-500/10 to-transparent',
  },
  rose: {
    bgIcon: 'bg-rose-500/15 text-rose-400 group-hover:bg-rose-500/25',
    border: 'hover:border-rose-500/50',
    titleHover: 'group-hover:text-rose-400',
    cta: 'text-rose-400 group-hover:text-rose-300',
    glow: 'from-rose-500/10 to-transparent',
  },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  badgeColor = 'bg-slate-800 text-slate-300 border-slate-700',
  ctaText = 'Explore Feature',
  onClick,
  accentColor = 'amber',
}) => {
  const colors = colorMap[accentColor] || colorMap.amber;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1 cursor-pointer overflow-hidden backdrop-blur-sm ${colors.border}`}
    >
      {/* Subtle top corner gradient glow */}
      <div
        className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${colors.glow} rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${colors.bgIcon}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          {badge && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h3
            className={`text-lg font-black text-white tracking-tight transition-colors duration-200 ${colors.titleHover}`}
          >
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between relative z-10">
        <span
          className={`text-xs font-black tracking-wide flex items-center gap-1.5 transition-colors duration-200 ${colors.cta}`}
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
        </span>
        <div className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-amber-400 transition-colors" />
      </div>
    </div>
  );
};
