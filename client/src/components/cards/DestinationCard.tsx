import React from 'react';
import { ShieldCheck, MapPin, IndianRupee, ArrowRight, Heart } from 'lucide-react';

export interface DestinationCardProps {
  name: string;
  state: string;
  description?: string;
  imageUrl: string;
  safetyScore: number;
  tag?: string;
  fareType?: string;
  onExplore: () => void;
  onViewMap?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  name,
  state,
  description,
  imageUrl,
  safetyScore,
  tag = 'Popular Hub',
  fareType,
  onExplore,
  onViewMap,
  isSaved = false,
  onToggleSave,
}) => {
  const scoreBadgeColor =
    safetyScore >= 80
      ? 'bg-emerald-950/85 text-emerald-300 border-emerald-600/50'
      : safetyScore >= 65
      ? 'bg-amber-950/85 text-amber-300 border-amber-600/50'
      : 'bg-red-950/85 text-red-300 border-red-600/50';

  return (
    <div className="group yg-card yg-card-interactive overflow-hidden flex flex-col justify-between">
      {/* Top Image & Overlays */}
      <div className="photo-overlay relative h-44 sm:h-48 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={`${name}, ${state}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider border border-white/15 pointer-events-auto">
            {tag}
          </span>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave();
                }}
                aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name}`}
                className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                  isSaved
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-950/75 text-slate-200 hover:text-red-400 hover:bg-slate-900'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            )}

            <div
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold flex items-center gap-1 ${scoreBadgeColor}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{safetyScore}/100</span>
            </div>
          </div>
        </div>

        {/* Floating Title */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-slate-200 flex items-center gap-1 font-medium">
            <MapPin className="w-3 h-3 text-teal-400" aria-hidden="true" />
            <span>{state}</span>
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {fareType && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
              <IndianRupee className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
              <span>{fareType}</span>
            </span>
            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/60">
              Verified
            </span>
          </div>
        )}

        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onExplore}
            className="flex-1 py-2 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 keep-white yg-press"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {onViewMap && (
            <button
              type="button"
              onClick={onViewMap}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center yg-press"
              title="View on Safety Map"
              aria-label={`View ${name} on Safety Map`}
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
