import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import { History, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export function ModeratorHistoryPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('travel_guardian_token');
        const res = await api.get('/moderator/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActions(res.data.actions || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Personal Moderation Log</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Audit trail of all verification verdicts, content hide decisions, and escalations recorded by your account
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            Total Verifications: <span className="text-white">{total}</span>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div tabIndex={0} role="region" aria-label="Moderation history table" className="yg-table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action Taken</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">Target ID</th>
                  <th className="px-6 py-4">Reason / Verdict Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Loading moderation history...
                    </td>
                  </tr>
                ) : actions.length > 0 ? (
                  actions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(act.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            act.action.includes('VERIFY')
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : act.action.includes('REJECT')
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {act.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-300">
                        {act.targetEntity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {act.targetId.slice(0, 10)}...
                      </td>
                      <td className="px-6 py-4 text-slate-300">{act.reason || act.notes || 'Routine moderation decision'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No moderation actions recorded under your account yet.
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
