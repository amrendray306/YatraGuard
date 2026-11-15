import React from 'react';
import { IndianRupee, ShieldCheck, Clock, Info, CheckCircle } from 'lucide-react';

export interface PriceCardProps {
  vehicleName: string;
  vehicleType: string;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  nightSurcharge?: number;
  hillSurcharge?: number;
  notes?: string;
  sourceType?: string;
  reliabilityScore?: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const PriceCard: React.FC<PriceCardProps> = ({
  vehicleName,
  vehicleType,
  baseFare,
  baseKm,
  perKmRate,
  nightSurcharge = 25,
  hillSurcharge = 0,
  notes,
  sourceType = 'OFFICIAL_GOVT',
  reliabilityScore = 95,
  onSelect,
  isSelected = false,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`relative bg-slate-900/90 border rounded-2xl p-5 transition-all cursor-pointer ${
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-400/20 bg-slate-800/80 shadow-xl'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {vehicleType}
          </span>
          <h4 className="text-base font-black text-white mt-1.5">{vehicleName}</h4>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end text-lg font-black text-amber-400">
            <IndianRupee className="w-4 h-4" />
            <span>{baseFare.toFixed(0)}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Base for {baseKm} km</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[11px] text-slate-400 block">Subsequent Rate</span>
          <span className="font-bold text-slate-200">₹{perKmRate.toFixed(1)} / km</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block">Night Surcharge</span>
          <span className="font-bold text-amber-300">+{nightSurcharge}%</span>
        </div>
      </div>

      {hillSurcharge > 0 && (
        <div className="mt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
          <span>⛰️ Hill terrain allowance: +{hillSurcharge}%</span>
        </div>
      )}

      {notes && (
        <p className="mt-3 text-[11px] text-slate-400 line-clamp-2 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
          {notes}
        </p>
      )}

      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{reliabilityScore}% Confidence</span>
        </span>
        <span className="text-slate-500 font-medium">{sourceType.replace('_', ' ')}</span>
      </div>
    </div>
  );
};
