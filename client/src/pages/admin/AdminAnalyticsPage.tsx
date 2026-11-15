import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { BarChart3, TrendingUp, AlertTriangle, Users, MapPin, IndianRupee } from 'lucide-react';
import { api } from '../../services/api';

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('travel_guardian_token');
        const res = await api.get('/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Geospatial Safety & Platform Analytics</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visual aggregation of incident trends, user growth, safety risk distribution, and community engagement
          </p>
        </div>

        {/* Charts & Breakdown Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incidents by Category */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-base text-white">Incident Breakdown by Category</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : analytics?.incidentsByCategory?.length > 0 ? (
              <div className="space-y-3">
                {analytics.incidentsByCategory.map((item: any) => {
                  const maxCount = Math.max(...analytics.incidentsByCategory.map((i: any) => i._count.id || 1));
                  const pct = Math.round(((item._count.id || 1) / maxCount) * 100);
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-300 uppercase">{item.category}</span>
                        <span className="text-amber-400">{item._count.id} reports</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">No categorized incidents logged yet.</div>
            )}
          </div>

          {/* Incidents by City */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h3 className="font-extrabold text-base text-white">Top Alert Density by Destination Hub</h3>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : analytics?.incidentsByCity?.length > 0 ? (
              <div className="space-y-3">
                {analytics.incidentsByCity.map((item: any) => (
                  <div
                    key={item.cityId}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white">{item.city?.name || 'Tourist Hub'}</span>
                    <span className="font-black text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10">
                      {item._count.id} incidents
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">No city-specific incident spikes recorded.</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
