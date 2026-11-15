import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import { IndianRupee, Search, CheckCircle2, XCircle, Check } from 'lucide-react';
import { api } from '../../services/api';

export function ModeratorPricesPage() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/moderator/prices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrices(res.data.prices || []);
    } catch (err) {
      console.error('Failed to load prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const handleModeratePrice = async (id: string, action: 'VERIFY' | 'REJECT') => {
    setActionLoading(id + action);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(
        `/moderator/prices/${id}/action`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotification(`Price submission ${action === 'VERIFY' ? 'verified' : 'rejected'}.`);
      fetchPrices();
    } catch (err) {
      console.error('Moderate price error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPrices = prices.filter(
    (p) =>
      p.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Price & Tariff Intelligence Audit</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verify crowdsourced transit fare reports, food rates, and activities against government benchmark circulars
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            Total Submissions: <span className="text-white">{prices.length}</span>
          </div>
        </div>

        {notification && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search price submissions..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Item / Route</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Submitted Price Range</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading submissions...
                    </td>
                  </tr>
                ) : filteredPrices.length > 0 ? (
                  filteredPrices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">{item.itemName}</td>
                      <td className="px-6 py-4 text-slate-300">{item.city?.name || 'All India'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-blue-400 border border-slate-700">
                          {item.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400 text-sm">
                        ₹{item.minPrice} - ₹{item.maxPrice}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.verificationStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleModeratePrice(item.id, 'VERIFY')}
                            disabled={actionLoading === item.id + 'VERIFY'}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                          </button>
                          <button
                            onClick={() => handleModeratePrice(item.id, 'REJECT')}
                            disabled={actionLoading === item.id + 'REJECT'}
                            className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-lg border border-red-500/30 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No price records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModeratorLayout>
  );
}
