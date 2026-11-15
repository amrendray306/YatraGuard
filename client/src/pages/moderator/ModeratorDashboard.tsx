import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import {
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  IndianRupee,
  History,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export function ModeratorDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('travel_guardian_token');
        const res = await api.get('/moderator/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to load moderator dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = data?.stats;

  const statCards = [
    {
      label: 'Pending Incident Reports',
      value: stats?.pendingReports ?? '—',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      link: '/moderator/reports?status=PENDING',
    },
    {
      label: 'Verified Incidents',
      value: stats?.verifiedReports ?? '—',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      link: '/moderator/reports?status=VERIFIED',
    },
    {
      label: 'Rejected Reports',
      value: stats?.rejectedReports ?? '—',
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      link: '/moderator/reports?status=REJECTED',
    },
    {
      label: 'Community Travel Posts',
      value: stats?.totalCommunityPosts ?? '—',
      icon: MessageSquare,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      link: '/moderator/community',
    },
    {
      label: 'Pending Price Benchmarks',
      value: stats?.pendingPrices ?? '—',
      icon: IndianRupee,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      link: '/moderator/prices',
    },
    {
      label: 'My Moderation Actions',
      value: stats?.myActionsCount ?? '—',
      icon: History,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      link: '/moderator/history',
    },
  ];

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Moderation Command Center</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verify traveler scam submissions, audit transit quotes, and review reported community photos
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Moderator Active</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.link}
                className={`p-4 rounded-2xl border ${card.bg} bg-slate-900 flex flex-col justify-between hover:scale-[1.02] transition-transform shadow-lg`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {loading ? '...' : card.value}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Action Hubs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/moderator/reports"
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-colors shadow-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <FileWarning className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Incident Verification Queue</h3>
                <p className="text-xs text-slate-400 mt-0.5">{stats?.pendingReports || 0} reports awaiting review</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            to="/moderator/community"
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-colors shadow-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Community Photo Auditing</h3>
                <p className="text-xs text-slate-400 mt-0.5">Review travel posts & images</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            to="/moderator/prices"
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-colors shadow-lg flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Price Intelligence Audit</h3>
                <p className="text-xs text-slate-400 mt-0.5">Verify transit fares & food costs</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>
        </div>

        {/* Recent Moderation Actions Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="font-extrabold text-sm sm:text-base text-white">Live Moderation Feed</h3>
            </div>
            <Link to="/moderator/history" className="text-xs font-bold text-blue-400 hover:underline">
              Full History →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : data?.recentActions?.length > 0 ? (
            <div className="divide-y divide-slate-800/80 text-xs">
              {data.recentActions.map((act: any) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        act.action.includes('VERIFY')
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : act.action.includes('REJECT')
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {act.action}
                    </span>
                    <span className="font-bold text-slate-300">
                      {act.targetEntity} {act.targetId ? `(${act.targetId.slice(0, 8)}...)` : ''}
                    </span>
                    {act.reason && <span className="text-slate-500 italic hidden sm:inline">— {act.reason}</span>}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">No moderation actions recorded today.</div>
          )}
        </div>
      </div>
    </ModeratorLayout>
  );
}
