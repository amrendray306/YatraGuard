import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red' | 'cyan' | 'teal';
  onClick?: () => void;
}

const colorMap = {
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  blue: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25',
  teal: 'bg-teal-500/12 text-teal-600 dark:text-teal-400 border-teal-500/25',
  purple: 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25',
  red: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25',
  cyan: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
};

export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  accentColor = 'blue',
  onClick,
}) => {
  const iconColor = colorMap[accentColor] || colorMap.blue;
  const Comp: any = onClick ? 'button' : 'div';

  return (
    <Comp
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`yg-card w-full text-left p-5 transition-all duration-200 ${
        onClick ? 'yg-card-interactive cursor-pointer yg-press' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wide">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${iconColor}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" aria-hidden="true" />
            )}
            {trend.value}
          </span>
        )}
      </div>

      {subtext && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>}
    </Comp>
  );
};

export const StatCard = DashboardStatCard;
