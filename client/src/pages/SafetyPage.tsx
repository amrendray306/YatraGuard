import React from 'react';
import { ShieldCheck, MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Building2, Radio } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { SafetyScoreCard } from '../components/SafetyScoreCard';
import { PageHeader, SectionHeader } from '../components/ui';

export const SafetyPage: React.FC = () => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();
  const { showToast } = useToast();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Safety & Emergency Services"
        icon={ShieldCheck}
        accentColor="emerald"
        title="Safety Index & Emergency Services"
        description="Dynamic 0–100 area safety scores, nearest verified police and hospital contacts, and practical safety advice."
      />

      {/* Main Score Card for Current City */}
      {safetyScoreData && (
        <SafetyScoreCard data={safetyScoreData} cityName={currentCity?.name} />
      )}

      {/* Cross-City Safety Comparison Matrix */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Comparative Safety Baselines Across Monitored Destinations ({cities.length} Cities)
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
                onClick={() => {
                  setCity(c);
                  showToast(`Switched safety sector to ${c.name}, ${c.state}`, 'info');
                }}
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

      {/* Expandable Safety Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <details className="glass-panel p-5 rounded-3xl border border-slate-800" open>
          <summary className="font-bold text-sm text-white flex items-center gap-2 cursor-pointer list-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Core Protective Practices</span>
          </summary>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed mt-3 pt-3 border-t border-slate-800">
            <li>• <strong>Prepaid Counters:</strong> Use official police prepaid booths at train terminals and airports.</li>
            <li>• <strong>Tracked Transit:</strong> Prefer app-based rides or metro rail over soliciting cabs.</li>
            <li>• <strong>Emergency Vault:</strong> Keep policy numbers and embassy contacts saved offline.</li>
            <li>• <strong>Verified Guides:</strong> Check official Tourism Ministry photo ID badges.</li>
          </ul>
        </details>

        <details className="glass-panel p-5 rounded-3xl border border-slate-800" open>
          <summary className="font-bold text-sm text-white flex items-center gap-2 cursor-pointer list-none">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Common Red Flags</span>
          </summary>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed mt-3 pt-3 border-t border-slate-800">
            <li>• <strong>"Hotel Closed" Claim:</strong> Never follow touts claiming your pre-booked hotel is closed.</li>
            <li>• <strong>"Moved Tourist Office":</strong> Avoid strangers redirecting you to private agencies.</li>
            <li>• <strong>Unsolicited Donations:</strong> Decline unofficial donation requests at ghats or shrines.</li>
            <li>• <strong>Late Night Routes:</strong> Stick to well-lit main roads after 10:00 PM.</li>
          </ul>
        </details>
      </div>
    </div>
  );
};
