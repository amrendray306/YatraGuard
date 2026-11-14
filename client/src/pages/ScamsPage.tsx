import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  ThumbsUp,
  MapPin,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { fetchScams, voteScam } from '../services/api';
import { ScamReport } from '../types';
import { ScamModal } from '../components/ScamModal';

export const ScamsPage: React.FC = () => {
  const { currentCity } = useCity();
  const { showToast } = useToast();
  const [scams, setScams] = useState<ScamReport[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [votedIds, setVotedIds] = useState<Record<string, boolean>>({});

  const loadScams = () => {
    fetchScams({ cityId: currentCity?.id })
      .then(setScams)
      .catch(console.error);
  };

  useEffect(() => {
    loadScams();
  }, [currentCity]);

  const handleVote = async (id: string) => {
    if (votedIds[id]) return;
    try {
      await voteScam(id);
      setVotedIds((prev) => ({ ...prev, [id]: true }));
      showToast('Thank you for verifying! Your validation protects fellow travelers.', 'success');
      loadScams();
    } catch (err) {
      console.error('Failed to confirm scam:', err);
      showToast('Could not register verification vote. Please try again.', 'error');
    }
  };

  const filteredScams = scams.filter((s) => {
    const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Verified Tourist Scam Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Scam Alerts ({currentCity?.name || 'All Cities'})
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Documented tactics, warning signs, and touting rackets reported by verified travelers
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report a Scam</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scam type, location, keyword (e.g. taxi meter, marble, gems)..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">All Scam Types</option>
          <option value="taxi_scam">Taxi & Auto Scams</option>
          <option value="fake_guide">Fake / Unlicensed Guides</option>
          <option value="fake_ticket">Fake Ticket Counters</option>
          <option value="shopping_scam">Shopping & Gem Rackets</option>
          <option value="religious_tourism">Religious Donation Extortion</option>
          <option value="transport">Unlicensed Transport</option>
        </select>
      </div>

      {/* Scam Intelligence Cards Grid or Empty State */}
      {filteredScams.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500/70 mx-auto" />
          <h3 className="text-base font-extrabold text-white">No Scam Alerts Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No scam alerts match "${searchQuery}" in ${currentCity?.name || 'this city'}.`
              : `No verified scam alerts cataloged for ${currentCity?.name || 'this city'} under this category.`}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors touch-min"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScams.map((scam) => (
          <div
            key={scam.id}
            className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 space-y-4 hover:border-amber-500/40 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-900/60">
                    {scam.category.replace('_', ' ')}
                  </span>
                  <h3 className="font-extrabold text-base text-white mt-1.5 leading-snug">
                    {scam.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{scam.locationName}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-black text-emerald-400">
                    {scam.confidence}% Confidence
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {scam.reportCount} traveler reports
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {scam.description}
              </p>

              {/* Warning Signs Box */}
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-3 text-xs space-y-1">
                <span className="font-bold text-amber-300 text-[11px] uppercase flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Early Warning Signs:
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {scam.warningSigns}
                </p>
              </div>

              {/* Typical Pattern */}
              <div className="bg-slate-950/80 rounded-2xl p-3 text-xs space-y-1 border border-slate-800">
                <span className="font-bold text-slate-400 text-[11px] uppercase">
                  Typical Modus Operandi:
                </span>
                <p className="text-slate-300 text-[11px] font-mono">
                  {scam.typicalPattern}
                </p>
              </div>
            </div>

            {/* Bottom Actions: Community Confirm Button */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Last updated recently • Community Monitored
              </span>

              <button
                onClick={() => handleVote(scam.id)}
                disabled={votedIds[scam.id]}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  votedIds[scam.id]
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {votedIds[scam.id] ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmed by You</span>
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Confirm This Scam ({scam.reportCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Modal for reporting a scam */}
      <ScamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadScams}
      />
    </div>
  );
};
