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
    bgIcon: 'bg-amber-500/15 text-amber-400',
    border: 'hover:border-amber-500/50',
    titleHover: 'group-hover:text-amber-400',
    cta: 'text-amber-400',
  },
  emerald: {
    bgIcon: 'bg-emerald-500/15 text-emerald-400',
    border: 'hover:border-emerald-500/50',
    titleHover: 'group-hover:text-emerald-400',
    cta: 'text-emerald-400',
  },
  blue: {
    bgIcon: 'bg-blue-500/15 text-blue-400',
    border: 'hover:border-blue-500/50',
    titleHover: 'group-hover:text-blue-400',
    cta: 'text-blue-400',
  },
  purple: {
    bgIcon: 'bg-purple-500/15 text-purple-400',
    border: 'hover:border-purple-500/50',
    titleHover: 'group-hover:text-purple-400',
    cta: 'text-purple-400',
  },
  red: {
    bgIcon: 'bg-red-500/15 text-red-400',
    border: 'hover:border-red-500/50',
    titleHover: 'group-hover:text-red-400',
    cta: 'text-red-400',
  },
  cyan: {
    bgIcon: 'bg-cyan-500/15 text-cyan-400',
    border: 'hover:border-cyan-500/50',
    titleHover: 'group-hover:text-cyan-400',
    cta: 'text-cyan-400',
  },
  indigo: {
    bgIcon: 'bg-indigo-500/15 text-indigo-400',
    border: 'hover:border-indigo-500/50',
    titleHover: 'group-hover:text-indigo-400',
    cta: 'text-indigo-400',
  },
  rose: {
    bgIcon: 'bg-rose-500/15 text-rose-400',
    border: 'hover:border-rose-500/50',
    titleHover: 'group-hover:text-rose-400',
    cta: 'text-rose-400',
  },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  badgeColor = 'bg-slate-800 text-slate-300 border-slate-700',
  ctaText = 'Open',
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
      className={`group bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200 hover:shadow-lg cursor-pointer ${colors.border}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bgIcon}`}>
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h3 className={`text-base font-extrabold text-white tracking-tight transition-colors ${colors.titleHover}`}>
            {title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className={`text-xs font-bold flex items-center gap-1 ${colors.cta}`}>
          <span>{ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
};
