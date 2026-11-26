import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'dashboard';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 3,
}) => {
  if (variant === 'list') {
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading content">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="yg-card p-4 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="space-y-6 animate-pulse" role="status" aria-busy="true" aria-label="Loading dashboard">
        <div className="yg-card p-6 h-28 bg-slate-100 dark:bg-slate-900/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="yg-card p-5 h-36 bg-slate-100 dark:bg-slate-900/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading items"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="yg-card p-5 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
};
