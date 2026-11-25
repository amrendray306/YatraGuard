import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Phone,
  Moon,
  Sun,
  MapPin,
  HeartPulse,
  Shield,
  Pill,
  Bus,
} from 'lucide-react';
import { SafetyScoreData } from '../types';

interface SafetyScoreCardProps {
  data: SafetyScoreData;
  cityName?: string;
  onSimulateHour?: (hour: number) => void;
}

export const SafetyScoreCard: React.FC<SafetyScoreCardProps> = ({
  data,
  cityName,
  onSimulateHour,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(
    data.timeContext?.hour !== undefined ? data.timeContext.hour : new Date().getHours()
  );

  const getBadgeStyle = () => {
    switch (data.tier) {
      case 'Low Risk':
      case 'Very Good':
      case 'Good':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Moderate Risk':
      case 'Acceptable':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'High Risk':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'Insufficient Data':
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  const handleHourChange = (newHour: number) => {
    setSelectedHour(newHour);
    if (onSimulateHour) {
      onSimulateHour(newHour);
    }
  };

  const isNight = selectedHour >= 22 || selectedHour < 5;

  return (
    <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-slate-900/80 border border-slate-800 shadow-2xl">
      {/* Background glow matching safety tier */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: data.tierColor || '#10B981' }}
      />

      {/* Header Row: Title, Tier Badge, and Numerical Score */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              {cityName || 'Location'} Safety Intelligence
            </span>
            <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${getBadgeStyle()}`}>
              {data.tier}
            </span>
            {data.timeContext && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isNight
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800'
              }`}>
                {isNight ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                {data.timeContext.timeLabel}
              </span>
            )}
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
            {data.label} ({data.score}/100)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic Bayesian algorithm combining emergency proximity, confirmed incidents, scams & time hazards
          </p>
        </div>

        {/* Big Score Gauge */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-6 py-4 shadow-xl">
            <span
              className="text-4xl sm:text-6xl font-black tracking-tight"
              style={{ color: data.tierColor || '#10B981' }}
            >
              {data.score}
            </span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-400">/ 100</span>
              <span className="text-[10px] font-bold" style={{ color: data.tierColor }}>
                {data.tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Time-of-Day Hazard Simulation Controls */}
      {onSimulateHour && (
        <div className="mt-5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Simulate Time of Day:</span>
            <select
              value={selectedHour}
              onChange={(e) => handleHourChange(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none"
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>
                  {h === 0 ? '12:00 AM (Late Night)' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                  {h >= 22 || h < 5 ? ' 🌙 (Night Hazard -10)' : ' ☀️ (Daylight +4)'}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Safety scores decrease after 10:00 PM to reflect reduced pedestrian presence.
          </span>
        </div>
      )}

      {/* Nearest Vital Services Fast Action Strip */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {data.nearestServices?.police && (
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Police (112)
              </span>
              <div className="font-extrabold text-xs text-white line-clamp-1">
                {data.nearestServices.police.name}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {data.nearestServices.police.distance} away
              </div>
            </div>
            {data.nearestServices.police.phone && (
              <a
                href={`tel:${data.nearestServices.police.phone.split('/')[0].trim()}`}
                className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl transition-colors"
                title="Call Police"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {data.nearestServices?.hospital && (
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <HeartPulse className="w-3 h-3" /> Hospital (108)
              </span>
              <div className="font-extrabold text-xs text-white line-clamp-1">
                {data.nearestServices.hospital.name}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {data.nearestServices.hospital.distance} away
              </div>
            </div>
            {data.nearestServices.hospital.phone && (
              <a
                href={`tel:${data.nearestServices.hospital.phone.split('/')[0].trim()}`}
                className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl transition-colors"
                title="Call Hospital"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {data.nearestServices?.pharmacy && (
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                <Pill className="w-3 h-3" /> Pharmacy
              </span>
              <div className="font-extrabold text-xs text-white line-clamp-1">
                {data.nearestServices.pharmacy.name}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {data.nearestServices.pharmacy.distance} away
              </div>
            </div>
          </div>
        )}

        {data.nearestServices?.transport && (
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1">
                <Bus className="w-3 h-3" /> Transit Hub
              </span>
              <div className="font-extrabold text-xs text-white line-clamp-1">
                {data.nearestServices.transport.name}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {data.nearestServices.transport.distance} away
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Factor Breakdown & Disclaimer */}
      <details className="mt-5 pt-4 border-t border-slate-800 group">
        <summary className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between cursor-pointer list-none">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Factor Breakdown ({data.factors.length} Signals)</span>
          </span>
          <span className="text-[11px] font-semibold text-sky-400 group-open:hidden">Show Details</span>
          <span className="text-[11px] font-semibold text-sky-400 hidden group-open:inline">Hide Details</span>
        </summary>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {data.factors.map((factor, idx) => (
            <div
              key={idx}
              className={`flex items-start justify-between gap-2.5 p-3 rounded-xl border text-xs leading-relaxed ${
                factor.type === 'positive'
                  ? 'bg-emerald-950/25 border-emerald-900/40 text-emerald-200'
                  : factor.type === 'warning'
                  ? 'bg-amber-950/25 border-amber-900/40 text-amber-200'
                  : factor.type === 'negative'
                  ? 'bg-red-950/25 border-red-900/40 text-red-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {factor.type === 'positive' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : factor.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : factor.type === 'negative' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{factor.text}</span>
              </div>

              {typeof factor.impact === 'number' && factor.impact !== 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${
                  factor.impact > 0 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'
                }`}>
                  {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Mandatory Transparent Disclaimer */}
        <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <strong>Note:</strong> {data.disclaimer}
        </div>
      </details>

      {/* Safety Score Tiers Reference Bar */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex justify-between">
          <span className="text-red-400">High Risk (&lt;55)</span>
          <span className="text-amber-400">Moderate (55–79)</span>
          <span className="text-emerald-400">Low Risk (80–100)</span>
        </div>
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div className="w-[55%] bg-gradient-to-r from-red-600 to-rose-600" title="0-54 High Risk" />
          <div className="w-[25%] bg-gradient-to-r from-amber-500 to-yellow-500" title="55-79 Moderate Risk" />
          <div className="w-[20%] bg-gradient-to-r from-emerald-500 to-emerald-400" title="80-100 Low Risk" />
        </div>
      </div>
    </div>
  );
};
