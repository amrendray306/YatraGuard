import React from 'react';
import { ShieldCheck, MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Building2, Radio } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { SafetyScoreCard } from '../components/SafetyScoreCard';

export const SafetyPage: React.FC = () => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Transparent Safety Scoring Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
          Safety Intelligence & Scoring Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          India Travel Guardian calculates a dynamic, explainable safety index for every sector based on
          police outpost density, verified hospital trauma capabilities, recent incident clusters, and time factors.
        </p>
      </div>

      {/* Main Score Card for Current City */}
      {safetyScoreData && (
        <SafetyScoreCard data={safetyScoreData} cityName={currentCity?.name} />
      )}

      {/* Cross-City Safety Comparison Matrix (All 9 MVP Cities) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Comparative Safety Baselines Across 9 MVP Cities
            </h3>
            <p className="text-xs text-slate-400">
              Select any city to immediately recalibrate your Guardian Safety context
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cities.map((c) => {
            const isSelected = currentCity?.id === c.id;
            const score = c.defaultSafetyScore;
            const badgeColor =
              score >= 80
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                : score >= 70
                ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                : 'bg-amber-950/70 text-amber-300 border-amber-800';

            return (
              <div
                key={c.id}
                onClick={() => setCity(c)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-950/50 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{c.name}</h4>
                    <span className="text-[10px] text-slate-400">{c.state}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-black border ${badgeColor}`}>
                    {score} / 100
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                  {c.description || 'Monitored tourist hub with dedicated police help desks.'}
                </p>

                {isSelected && (
                  <div className="mt-3 text-[10px] text-blue-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active Viewing Sector
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Guidelines for Traveling in India */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Core Protective Practices
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li>• <strong>Prepaid Traffic Counters:</strong> Always use official police prepaid booths at train terminals (e.g. Agra Cantt, New Delhi Station).</li>
            <li>• <strong>Regulated Transit:</strong> Use GPS-tracked ride-hailing (Uber/Ola) or Delhi/Namma Metro corridors over private soliciting cabs.</li>
            <li>• <strong>Keep Emergency Vault Active:</strong> Save references to your travel insurance policy and embassy contact in this app.</li>
            <li>• <strong>Verify Monument Guides:</strong> Insist on seeing official green photo identification badges issued by the Ministry of Tourism.</li>
          </ul>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Red Flags & Warning Signs
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li>• <strong>"Your Hotel Burned Down" Claim:</strong> Never believe touts claiming your pre-booked hotel is closed, cordoned off, or burnt down.</li>
            <li>• <strong>"Govt Tourist Office Moved":</strong> Any stranger offering to redirect you to an alternative "government" travel agency is running a commission racket.</li>
            <li>• <strong>Ghat Wood Donation Extortion:</strong> In Varanasi, never hand cash to unofficial "cremation priests" claiming to buy banyan wood for the poor.</li>
            <li>• <strong>Unlit Back Alleys:</strong> After 10:00 PM, stick strictly to lit commercial boulevards.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
