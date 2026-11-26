import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { IndianRupee, Search, CheckCircle2, XCircle, Plus, Edit3 } from 'lucide-react';
import { api } from '../../services/api';

export function AdminPricesPage() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/admin/prices', {
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

  const filtered = prices.filter(
    (p) =>
      p.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Local Price Benchmarks & Tariffs</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Authorized RTO auto tariffs, street food averages, hotel ranges, and adventure rates
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Total Benchmarks: <span className="text-amber-400">{prices.length}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item name, category, or city..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div tabIndex={0} role="region" aria-label="Local price benchmarks table" className="yg-table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Item / Service</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Benchmark Range</th>
                  <th className="px-6 py-4">Source Type</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading local price benchmarks...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white text-sm">{item.itemName}</td>
                      <td className="px-6 py-4 text-slate-300">{item.city?.name || 'All India'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-amber-400 border border-slate-700">
                          {item.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400 text-sm">
                        ₹{item.minPrice} - ₹{item.maxPrice}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-[11px]">{item.sourceType?.replace('_', ' ')}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.verificationStatus || 'VERIFIED'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No price benchmarks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
