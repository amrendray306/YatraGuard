import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { MapPin, Search, ShieldCheck, Edit3, Plus, Check } from 'lucide-react';
import { api } from '../../services/api';

export function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCity, setEditingCity] = useState<any | null>(null);
  const [editScore, setEditScore] = useState<number>(75);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/admin/destinations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDestinations(res.data.destinations || res.data.cities || []);
    } catch (err) {
      console.error('Failed to load destinations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleSaveScore = async () => {
    if (!editingCity) return;
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.put(
        `/admin/destinations/${editingCity.id}`,
        { defaultSafetyScore: editScore },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCity(null);
      fetchDestinations();
    } catch (err) {
      console.error('Update score failed:', err);
    }
  };

  const filtered = destinations.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Monitored Destinations & Safe Zones</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Geographic safety benchmarks, default scores, and tourist hub tier classifications
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Active Hubs: <span className="text-amber-400">{destinations.length}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination city or state..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((city) => (
              <div
                key={city.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-colors shadow-lg space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {city.tier?.replace('_', ' ') || 'TOURIST HUB'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{city.state}</span>
                  </div>
                  <h3 className="font-black text-lg text-white">{city.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {city.description || 'Monitored city with live geospatial safety boundaries'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Default Safety Score</div>
                    <div className="text-xl font-black text-amber-400">{city.defaultSafetyScore ?? 75}/100</div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingCity(city);
                      setEditScore(city.defaultSafetyScore ?? 75);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
                    title="Edit Safety Score"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
            No destinations found.
          </div>
        )}

        {/* Edit Score Modal */}
        {editingCity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="font-extrabold text-base text-white">Adjust Safety Score: {editingCity.name}</h3>
              <p className="text-xs text-slate-400">
                Change default baseline safety score for this destination hub (1 - 100).
              </p>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Score: {editScore}</label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={editScore}
                  onChange={(e) => setEditScore(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingCity(null)}
                  className="flex-1 py-2 text-xs font-bold border border-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScore}
                  className="flex-1 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl font-black"
                >
                  Save Score
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
