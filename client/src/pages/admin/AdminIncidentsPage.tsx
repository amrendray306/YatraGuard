import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  FileWarning,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api';

export function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/admin/incidents', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setIncidents(res.data.incidents || []);
    } catch (err: any) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.patch(`/admin/incidents/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchIncidents();
    } catch (err) {
      console.error('Failed to update incident status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIncidents = incidents.filter(
    (inc) =>
      inc.title?.toLowerCase().includes(search.toLowerCase()) ||
      inc.description?.toLowerCase().includes(search.toLowerCase()) ||
      inc.address?.toLowerCase().includes(search.toLowerCase()) ||
      inc.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Incident & Safety Alert Management</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Audit, verify, or dismiss crowdsourced scam alerts and safety hazard reports
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Total Reports: <span className="text-amber-400">{incidents.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, category, or address..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'PENDING', 'ADMIN_VERIFIED', 'VERIFIED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Incident Cards / Table */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredIncidents.length > 0 ? (
            filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-colors shadow-lg"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {inc.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inc.status === 'ADMIN_VERIFIED' || inc.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : inc.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inc.reportedAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-white">{inc.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {inc.address || inc.city?.name || 'Coordinates pinned'}
                      </span>
                      <span>Confidence: <strong className="text-slate-300">{inc.confidenceScore}%</strong></span>
                      <span>Confirmations: <strong className="text-slate-300">{inc.confirmationsCount}</strong></span>
                      {inc.amountDemanded && (
                        <span className="text-red-400 font-semibold">
                          Demanded: ₹{inc.amountDemanded} (Paid: ₹{inc.amountPaid || 0})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Evidence */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {inc.evidenceUrl && (
                      <a
                        href={inc.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Evidence
                      </a>
                    )}

                    {inc.status !== 'ADMIN_VERIFIED' && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'ADMIN_VERIFIED')}
                        disabled={actionLoading === inc.id + 'ADMIN_VERIFIED'}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                      </button>
                    )}

                    {inc.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdateStatus(inc.id, 'REJECTED')}
                        disabled={actionLoading === inc.id + 'REJECTED'}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              No incident reports found matching this criteria.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
