import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: 'blue' | 'teal' | 'emerald' | 'amber' | 'red' | 'purple' | 'indigo' | 'cyan';
  actions?: React.ReactNode;
}

const accentStyles: Record<string, string> = {
  blue: 'text-sky-600 dark:text-sky-400',
  teal: 'text-teal-600 dark:text-teal-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  icon: Icon,
  accentColor = 'blue',
  actions,
}) => {
  const accentCls = accentStyles[accentColor] || accentStyles.blue;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/90">
      <div className="space-y-1 min-w-0">
        {eyebrow && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${accentCls}`}>
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};
