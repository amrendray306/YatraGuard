import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import {
  FileWarning,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  MapPin,
  Clock,
  ExternalLink,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { api } from '../../services/api';

export function ModeratorReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Dialog for Reject or Request Info or Escalate
  const [actionModal, setActionModal] = useState<{
    reportId: string;
    action: 'VERIFY' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE';
    title: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/moderator/reports', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setReports(res.data.reports || []);
    } catch (err: any) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    const { reportId, action } = actionModal;
    setActionLoading(reportId + action);

    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(
        `/moderator/reports/${reportId}/action`,
        { action, reason: reasonText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotification(`Report status successfully updated to ${action}.`);
      setActionModal(null);
      setReasonText('');
      fetchReports();
    } catch (err: any) {
      console.error('Moderation action failed:', err);
      alert(err?.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Incident Verification Queue</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verify crowdsourced scam reports, request additional evidence, or escalate critical safety incidents
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            Queue: <span className="text-white">{reports.length}</span>
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, category, or location..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['PENDING', 'VERIFIED', 'REJECTED', 'ESCALATED', 'ALL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Report Cards */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-colors shadow-lg"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {report.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          report.status === 'VERIFIED' || report.status === 'ADMIN_VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : report.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : report.status === 'ESCALATED'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.reportedAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-white">{report.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{report.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {report.address || report.city?.name || 'Local'}
                      </span>
                      <span>Confidence: <strong className="text-slate-300">{report.confidenceScore}%</strong></span>
                      <span>Confirmations: <strong className="text-slate-300">{report.confirmationsCount}</strong></span>
                      {report.reporter && (
                        <span>Reporter: <strong className="text-slate-300">{report.reporter.name}</strong></span>
                      )}
                      {report.amountDemanded && (
                        <span className="text-red-400 font-semibold">
                          Overcharge: ₹{report.amountDemanded} (Paid: ₹{report.amountPaid || 0})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Moderator Decision Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 flex-wrap">
                    {report.evidenceUrl && (
                      <a
                        href={report.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Evidence
                      </a>
                    )}

                    <button
                      onClick={() =>
                        setActionModal({
                          reportId: report.id,
                          action: 'VERIFY',
                          title: `Verify Report: ${report.title}`,
                        })
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                    </button>

                    <button
                      onClick={() =>
                        setActionModal({
                          reportId: report.id,
                          action: 'REJECT',
                          title: `Reject Report: ${report.title}`,
                        })
                      }
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>

                    <button
                      onClick={() =>
                        setActionModal({
                          reportId: report.id,
                          action: 'REQUEST_INFO',
                          title: `Request Additional Info: ${report.title}`,
                        })
                      }
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/30 flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Info
                    </button>

                    <button
                      onClick={() =>
                        setActionModal({
                          reportId: report.id,
                          action: 'ESCALATE',
                          title: `Escalate to Admin: ${report.title}`,
                        })
                      }
                      className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs font-bold rounded-xl border border-purple-500/30 flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
              No reports in this queue.
            </div>
          )}
        </div>

        {/* Action Notes Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="font-extrabold text-base text-white">{actionModal.title}</h3>
              <p className="text-xs text-slate-400">
                Action: <strong className="text-blue-400">{actionModal.action}</strong>. Please provide a reason or note for
                this moderation decision.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Reason / Moderation Notes</label>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="e.g. Verified with local police dispatch / insufficient evidence provided / escalated for criminal review"
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionModal(null);
                    setReasonText('');
                  }}
                  className="flex-1 py-2 text-xs font-bold border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={!!actionLoading}
                  className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModeratorLayout>
  );
}
