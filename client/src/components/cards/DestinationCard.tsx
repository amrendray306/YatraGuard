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
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
      : safetyScore >= 65
      ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
      : 'bg-red-950/80 text-red-300 border-red-700/60';

  return (
    <div className="group relative bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/60 transition-colors duration-200 shadow-lg flex flex-col justify-between">
      {/* Top Image & Overlays */}
      <div className="photo-overlay relative h-48 sm:h-52 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={`${name}, ${state}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Dark Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md pointer-events-auto">
            {tag}
          </span>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave();
                }}
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                  isSaved
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-slate-950/70 text-slate-300 hover:text-red-400 hover:bg-slate-900'
                }`}
                title={isSaved ? 'Remove from saved' : 'Save destination'}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <div
              className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-black flex items-center gap-1 shadow-md ${scoreBadgeColor}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safety: {safetyScore}/100</span>
            </div>
          </div>
        </div>

        {/* Floating Title in bottom of photo */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md group-hover:text-amber-400 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-slate-300 flex items-center gap-1 drop-shadow font-medium">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>{state}</span>
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {description && (
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {fareType && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-300">
              <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-slate-200">{fareType}</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Verified
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={onExplore}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <span>Explore City</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onViewMap && (
            <button
              onClick={onViewMap}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center"
              title="View on Safety Map"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
