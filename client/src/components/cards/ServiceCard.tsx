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

const categoryIcons: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  HOSPITAL: {
    icon: HeartPulse,
    color: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    label: 'Emergency Hospital',
  },
  POLICE: {
    icon: Shield,
    color: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25',
    label: 'Police Station',
  },
  PHARMACY: {
    icon: Pill,
    color: 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25',
    label: '24x7 Pharmacy',
  },
  TRANSPORT: {
    icon: Bus,
    color: 'bg-teal-500/12 text-teal-600 dark:text-teal-400 border-teal-500/25',
    label: 'Transit Hub',
  },
  HOTEL: {
    icon: Hotel,
    color: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
    label: 'Verified Stay',
  },
  RESTAURANT: {
    icon: Utensils,
    color: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25',
    label: 'Dining',
  },
  TOURIST_INFO: {
    icon: Landmark,
    color: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    label: 'Tourist Info',
  },
  ATM: {
    icon: Building2,
    color: 'bg-teal-500/12 text-teal-600 dark:text-teal-400 border-teal-500/25',
    label: 'Guarded ATM',
  },
  FUEL: {
    icon: Building2,
    color: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25',
    label: 'Fuel / EV Charger',
  },
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
  actionLabel = 'View on Map',
}) => {
  const conf = categoryIcons[category] || {
    icon: Building2,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    label: category,
  };
  const Icon = conf.icon;

  return (
    <div className="yg-card yg-card-interactive p-5 flex flex-col justify-between space-y-3">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl border flex-shrink-0 ${conf.color}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {conf.label}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{name}</h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {typeof distanceKm === 'number' && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {distanceKm.toFixed(1)} km
              </span>
            )}
            {rating && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="line-clamp-2">{address}</span>
        </p>

        {openStatus && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{openStatus}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
        {phone ? (
          <a
            href={`tel:${phone.split('/')[0].trim()}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="truncate max-w-[140px]">{phone}</span>
          </a>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />}
            <span>{isVerified ? 'Verified Facility' : 'Local Service'}</span>
          </span>
        )}

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 yg-press"
          >
            <span>{actionLabel}</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};
