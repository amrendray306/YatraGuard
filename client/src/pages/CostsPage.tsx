import React, { useState, useEffect } from 'react';
import { IndianRupee, AlertTriangle, CheckCircle2, Car, Bus, Utensils, Hotel, Ticket } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { fetchCosts } from '../services/api';
import { TravelCost } from '../types';

export const CostsPage: React.FC = () => {
  const { currentCity } = useCity();
  const [costs, setCosts] = useState<TravelCost[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchCosts(currentCity?.id)
      .then(setCosts)
      .catch(console.error);
  }, [currentCity]);

  const filteredCosts = costs.filter((c) => {
    if (filterCategory === 'ALL') return true;
    return c.category === filterCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'AUTO':
      case 'TAXI':
        return <Car className="w-5 h-5 text-amber-400" />;
      case 'METRO':
      case 'BUS':
        return <Bus className="w-5 h-5 text-cyan-400" />;
      case 'FOOD':
        return <Utensils className="w-5 h-5 text-emerald-400" />;
      case 'HOTEL':
        return <Hotel className="w-5 h-5 text-purple-400" />;
      default:
        return <Ticket className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <IndianRupee className="w-4 h-4" />
          Fair Pricing & Scam Prevention
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
          Travel Cost Intelligence ({currentCity?.name || 'Local City'})
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Benchmark pricing estimates to prevent tourist overcharging across transit, food, and stays
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'AUTO', 'TAXI', 'METRO', 'FOOD'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterCategory === cat
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cost Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCosts.map((cost) => (
          <div
            key={cost.id}
            className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-800 rounded-xl">
                    {getCategoryIcon(cost.category)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cost.category}
                  </span>
                </div>

                {cost.isOverchargingProne && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/60">
                    ⚠️ Overcharge Risk
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm text-white mt-2.5">
                {cost.name}
              </h3>

              {/* Price Comparison Block */}
              <div className="mt-3 bg-slate-900/90 rounded-2xl p-3 border border-slate-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Fair Regulated Estimate:</span>
                  <span className="text-base font-black text-emerald-400">
                    ₹{cost.estimatedMin} – ₹{cost.estimatedMax}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400">Reported Local Range:</span>
                  <span className="font-bold text-amber-300">
                    ₹{cost.localReportedMin} – ₹{cost.localReportedMax}
                  </span>
                </div>
              </div>

              {cost.notes && (
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  💡 {cost.notes}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 italic">
              Estimated fare guidelines for consumer safety. Not official government tender.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
