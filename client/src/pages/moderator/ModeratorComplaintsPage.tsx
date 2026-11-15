import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import { Flag, Search, AlertCircle, Clock, MapPin } from 'lucide-react';
import { api } from '../../services/api';

export function ModeratorComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('travel_guardian_token');
        const res = await api.get('/moderator/complaints', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setComplaints(res.data.complaints || []);
      } catch (err) {
        console.error('Failed to load complaints:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Traveler Complaints & Content Flags</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Community disputes, reported inaccuracies in transit fares, and flagged safety alerts
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            Complaints: <span className="text-white">{complaints.length}</span>
          </div>
        </div>

        {/* Complaints List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : complaints.length > 0 ? (
            complaints.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-colors shadow-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                      FLAGGED REPORT
                    </span>
                    <span className="text-xs font-bold text-white">{c.incident?.title || 'Reported Incident'}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Reason for flag: <strong className="text-amber-400">{c.reason || 'Flagged by community traveler'}</strong>
                </p>

                <div className="text-xs text-slate-500 flex items-center gap-4 pt-1">
                  <span>Reported by: {c.user?.name || 'Anonymous Traveler'}</span>
                  <span>Destination: {c.incident?.city?.name || 'Local'}</span>
                  <span>Current Incident Status: {c.incident?.status}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              No outstanding user complaints or flagged reports in this queue.
            </div>
          )}
        </div>
      </div>
    </ModeratorLayout>
  );
}
