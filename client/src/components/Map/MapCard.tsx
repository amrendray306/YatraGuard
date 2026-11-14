import React from 'react';
import {
  X,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Shield,
  HeartPulse,
  Pill,
  Bus,
  IndianRupee,
  Utensils,
  Hotel,
  Landmark,
  ShieldAlert,
} from 'lucide-react';

interface MapCardProps {
  item: any;
  onClose: () => void;
  onCheckFare?: (placeName: string) => void;
}

export const MapCard: React.FC<MapCardProps> = ({ item, onClose, onCheckFare }) => {
  if (!item) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HOSPITAL':
        return <HeartPulse className="w-5 h-5 text-emerald-400" />;
      case 'POLICE':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'PHARMACY':
        return <Pill className="w-5 h-5 text-purple-400" />;
      case 'TRANSPORT':
        return <Bus className="w-5 h-5 text-cyan-400" />;
      case 'TOURIST_INFO':
        return <Landmark className="w-5 h-5 text-indigo-400" />;
      case 'HOTEL':
        return <Hotel className="w-5 h-5 text-amber-400" />;
      case 'RESTAURANT':
        return <Utensils className="w-5 h-5 text-rose-400" />;
      case 'SCAM_ALERT':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'INCIDENT_ALERT':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default:
        return <Building2 className="w-5 h-5 text-slate-300" />;
    }
  };

  const isScam = item.category === 'SCAM_ALERT';
  const isIncident = item.category === 'INCIDENT_ALERT';

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[1000] glass-panel-elevated rounded-3xl p-5 shadow-2xl border border-slate-700/80 animate-slide-up bg-slate-900/95 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-2xl border border-slate-700/80 shadow-md">
            {getCategoryIcon(item.category)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {item.category.replace('_', ' ')}
              </span>
              {item.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <h4 className="font-extrabold text-sm text-white line-clamp-1">{item.name || item.title}</h4>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed line-clamp-3">
        {item.address || item.description || 'Verified location in active travel corridor'}
      </p>

      {/* Scam Warnings Detail */}
      {isScam && item.warningSigns && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200">
          ⚠️ <strong>Warning Sign:</strong> {item.warningSigns}
        </div>
      )}

      {/* Incident Detail */}
      {isIncident && (
        <div className="mt-2.5 p-2 rounded-xl bg-red-950/40 border border-red-800/60 text-[11px] text-red-200 flex items-center justify-between">
          <span>Confidence: {item.confidenceScore || 85}%</span>
          <span>Confirmations: {item.confirmations || 1}</span>
        </div>
      )}

      {/* Distance & Open Status Row */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-2.5">
        <div className="flex items-center gap-2">
          {item.distanceLabel && (
            <span className="font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-lg">
              📍 {item.distanceLabel}
            </span>
          )}
          {item.openStatus && (
            <span className="text-[11px] text-emerald-400 font-medium">
              {item.openStatus}
            </span>
          )}
        </div>
        {item.rating && (
          <span className="font-bold text-amber-400 text-xs">★ {item.rating.toFixed(1)}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {item.phone && (
          <a
            href={`tel:${item.phone.split('/')[0].trim()}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow"
          >
            <Phone className="w-3.5 h-3.5" /> Call ({item.phone.split('/')[0].trim()})
          </a>
        )}

        {onCheckFare && !isScam && !isIncident && (
          <button
            onClick={() => onCheckFare(item.name || item.title)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-md shadow-amber-900/30"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Est. Fare
          </button>
        )}

        <a
          href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-red-400" /> Directions
        </a>
      </div>
    </div>
  );
};
