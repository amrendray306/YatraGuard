import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  Users,
  AlertTriangle,
  FileText,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
  ShieldAlert,
  IndianRupee,
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem('travel_guardian_token');
        const res = await api.get('/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to load admin overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const stats = data?.stats;

  const statCards = [
    {
      label: 'Registered Travelers',
      value: stats?.totalUsers ?? '—',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Pending Incident Reports',
      value: stats?.pendingReports ?? '—',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Verified Safety Incidents',
      value: stats?.verifiedReports ?? '—',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Community Travel Posts',
      value: stats?.communityPosts ?? '—',
      icon: MessageSquare,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Pending Fare Audits',
      value: stats?.pendingFareReports ?? '—',
      icon: IndianRupee,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Monitored Destinations',
      value: stats?.totalDestinations ?? '—',
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Platform Command Center</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live database metrics, incident queues, and system telemetry
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-300">Database Synchronized</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`p-4 rounded-2xl border ${card.bg} bg-slate-900 flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {loading ? '...' : card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Priority Queues: Pending Incidents & Emergency Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Incidents */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">Pending Incidents Queue</h3>
              </div>
              <Link to="/admin/incidents" className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : data?.pendingIncidents?.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {data.pendingIncidents.slice(0, 5).map((inc: any) => (
                  <div key={inc.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                          {inc.category}
                        </span>
                        <span className="text-xs text-slate-500">
                          {inc.city?.name || 'Local'} · {new Date(inc.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-white truncate">{inc.title}</div>
                      <div className="text-xs text-slate-400 truncate">{inc.description}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      PENDING
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">No pending incident reports in queue.</div>
            )}
          </div>

          {/* Real-time Emergency SOS Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">Recent Emergency Logs</h3>
              </div>
              <span className="text-xs text-slate-400">Police & Medical SOS</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : data?.recentEmergencyLogs?.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {data.recentEmergencyLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          {log.emergencyType}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {log.user?.name || 'Anonymous Traveler'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {log.address || `Lat: ${log.lat.toFixed(3)}, Lng: ${log.lng.toFixed(3)}`}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">No active emergency dispatches logged.</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
