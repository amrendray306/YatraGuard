import React from 'react';
import {
  Building2,
  HeartPulse,
  Shield,
  Pill,
  Bus,
  Utensils,
  Hotel,
  Landmark,
  Phone,
  Clock,
  Star,
  MapPin,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export interface ServiceCardProps {
  name: string;
  category: string;
  address: string;
  phone?: string;
  rating?: number;
  openStatus?: string;
  isVerified?: boolean;
  distanceKm?: number;
  onAction?: () => void;
  actionLabel?: string;
}

const categoryIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  HOSPITAL: { icon: HeartPulse, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-800', label: 'Emergency Hospital' },
  POLICE: { icon: Shield, color: 'bg-blue-500/15 text-blue-400 border-blue-800', label: 'Police Assistance' },
  PHARMACY: { icon: Pill, color: 'bg-purple-500/15 text-purple-400 border-purple-800', label: '24x7 Chemist' },
  TRANSPORT: { icon: Bus, color: 'bg-cyan-500/15 text-cyan-400 border-cyan-800', label: 'Transit Hub' },
  HOTEL: { icon: Hotel, color: 'bg-amber-500/15 text-amber-400 border-amber-800', label: 'Verified Stay' },
  RESTAURANT: { icon: Utensils, color: 'bg-rose-500/15 text-rose-400 border-rose-800', label: 'Dining' },
  TOURIST_INFO: { icon: Landmark, color: 'bg-indigo-500/15 text-indigo-400 border-indigo-800', label: 'Heritage / Tourist Info' },
  ATM: { icon: Building2, color: 'bg-teal-500/15 text-teal-400 border-teal-800', label: 'Guarded ATM' },
  FUEL: { icon: Building2, color: 'bg-amber-600/15 text-amber-400 border-amber-800', label: 'Fuel / EV Charger' },
};

export const ServiceCard: React.FC<ServiceCardProps> = ({
  name,
  category,
  address,
  phone,
  rating = 4.5,
  openStatus,
  isVerified = true,
  distanceKm,
  onAction,
  actionLabel = 'Locate on Map',
}) => {
  const conf = categoryIcons[category] || {
    icon: Building2,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    label: category,
  };
  const Icon = conf.icon;

  return (
    <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl flex flex-col justify-between space-y-3">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${conf.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {conf.label}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">{name}</h4>
            </div>
          </div>

          {rating && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Star className="w-3 h-3 fill-current" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
          <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{address}</span>
        </p>

        {openStatus && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/50">
            <Clock className="w-3 h-3" />
            <span>{openStatus}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {phone ? (
          <a
            href={`tel:${phone.split('/')[0].trim()}`}
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{phone}</span>
          </a>
        ) : (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Govt Verified</span>
          </span>
        )}

        {onAction && (
          <button
            onClick={onAction}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>{actionLabel}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
