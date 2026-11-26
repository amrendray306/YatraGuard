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
  accentColor?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red' | 'cyan' | 'indigo' | 'rose' | 'teal';
  variant?: 'default' | 'emergency';
  visualPreview?: React.ReactNode;
}

const colorMap = {
  amber: {
    bgIcon: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    border: 'hover:border-amber-500/45',
    titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    cta: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    bgIcon: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    border: 'hover:border-emerald-500/45',
    titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    cta: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    bgIcon: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    border: 'hover:border-sky-500/45',
    titleHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
    cta: 'text-sky-600 dark:text-sky-400',
  },
  teal: {
    bgIcon: 'bg-teal-500/12 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    border: 'hover:border-teal-500/45',
    titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    cta: 'text-teal-600 dark:text-teal-400',
  },
  purple: {
    bgIcon: 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    border: 'hover:border-purple-500/45',
    titleHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
    cta: 'text-purple-600 dark:text-purple-400',
  },
  red: {
    bgIcon: 'bg-red-500/12 text-red-600 dark:text-red-400 border border-red-500/25',
    border: 'hover:border-red-500/50',
    titleHover: 'group-hover:text-red-600 dark:group-hover:text-red-400',
    cta: 'text-red-600 dark:text-red-400',
  },
  cyan: {
    bgIcon: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
    border: 'hover:border-cyan-500/45',
    titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    cta: 'text-cyan-600 dark:text-cyan-400',
  },
  indigo: {
    bgIcon: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    border: 'hover:border-indigo-500/45',
    titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    cta: 'text-indigo-600 dark:text-indigo-400',
  },
  rose: {
    bgIcon: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    border: 'hover:border-rose-500/45',
    titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    cta: 'text-rose-600 dark:text-rose-400',
  },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  badgeColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  ctaText = 'Open',
  onClick,
  accentColor = 'blue',
  variant = 'default',
  visualPreview,
}) => {
  const colors = colorMap[accentColor] || colorMap.blue;
  const isEmergency = variant === 'emergency';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left w-full yg-card yg-card-interactive p-5 flex flex-col justify-between transition-all duration-200 yg-press ${
        isEmergency
          ? 'border-red-300/80 dark:border-red-800/70 bg-red-50/40 dark:bg-red-950/20 hover:border-red-500'
          : colors.border
      }`}
    >
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bgIcon}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h3 className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight transition-colors ${colors.titleHover}`}>
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {visualPreview && <div className="pt-1">{visualPreview}</div>}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between w-full">
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${colors.cta}`}>
          <span>{ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
};
