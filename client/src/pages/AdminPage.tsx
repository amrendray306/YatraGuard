import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Clock,
  ShieldCheck,
  RefreshCw,
  IndianRupee,
  Car,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminOverview, reviewIncident, reviewFareReport } from '../services/api';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [activeQueueTab, setActiveQueueTab] = useState<'incidents' | 'fares'>('incidents');

  const loadData = () => {
    setIsLoading(true);
    fetchAdminOverview()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setReviewingId(id);
    try {
      await reviewIncident(id, action);
      loadData();
    } catch (err) {
      console.error('Failed to review incident:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const handleReviewFare = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setReviewingId(id);
    try {
      await reviewFareReport(id, action);
      loadData();
    } catch (err) {
      console.error('Failed to review fare report:', err);
    } finally {
      setReviewingId(null);
    }
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400">
          Please use the user menu in the top right corner to switch to the <strong>Admin</strong> or <strong>Moderator</strong> persona.
        </p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            Safety Verification Control Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Guardian Admin & Moderation Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Logged in as {user.name} ({user.role}) • Live report verification & incident auditing
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 shadow flex items-center gap-2 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          { label: 'Total Users', value: stats?.totalUsers || 3, color: 'text-blue-400' },
          { label: 'Active Travelers', value: stats?.activeTravelers || 1, color: 'text-emerald-400' },
          { label: 'Pending Incidents', value: stats?.pendingReports || 0, color: 'text-amber-500' },
          { label: 'Verified Incidents', value: stats?.verifiedReports || 0, color: 'text-emerald-400' },
          { label: 'Pending Fares', value: stats?.pendingFareReports || 0, color: 'text-amber-400' },
          { label: 'Verified Fares', value: stats?.verifiedFareReports || 0, color: 'text-cyan-400' },
          { label: 'Rejected Reports', value: stats?.rejectedReports || 0, color: 'text-red-400' },
        ].map((s, idx) => (
          <div key={idx} className="glass-panel p-3.5 rounded-2xl border border-slate-800 text-center">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Moderation Queue Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveQueueTab('incidents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 touch-min ${
            activeQueueTab === 'incidents'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Incident Verification ({data?.pendingIncidents?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveQueueTab('fares')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 touch-min ${
            activeQueueTab === 'fares'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Community Fare Reports ({data?.pendingFareReports?.length || 0})</span>
        </button>
      </div>

      {/* Incident Verification Queue */}
      {activeQueueTab === 'incidents' && (
        <div className="glass-panel-elevated rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">
                Incident Verification Queue ({data?.pendingIncidents?.length || 0} Pending)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Reports remain Pending until approved by Moderator or Admin
            </span>
          </div>

          {data?.pendingIncidents?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              ✓ No pending incidents awaiting review. All current reports have been moderated.
            </div>
          ) : (
            <div className="space-y-3">
              {data?.pendingIncidents?.map((inc: any) => (
                <div
                  key={inc.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        {inc.category}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        📍 {inc.city?.name} • {inc.address}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">{inc.title}</h4>
                    <p className="text-xs text-slate-300">{inc.description}</p>
                    <div className="text-[10px] text-slate-500 pt-1">
                      Reported by: {inc.reporter?.name || 'Anonymous Traveler'} • Initial Confidence: {inc.confidenceScore}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleReview(inc.id, 'APPROVE')}
                      disabled={reviewingId === inc.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-900/30 touch-min"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Verify</span>
                    </button>

                    <button
                      onClick={() => handleReview(inc.id, 'REJECT')}
                      disabled={reviewingId === inc.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors touch-min"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Community Fare Moderation Queue */}
      {activeQueueTab === 'fares' && (
        <div className="glass-panel-elevated rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">
                Community Fare Verification Queue ({data?.pendingFareReports?.length || 0} Submissions)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Verified fares calibrate real-world pricing benchmarks for fellow travelers
            </span>
          </div>

          {data?.pendingFareReports?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              ✓ No community fare reports awaiting moderation.
            </div>
          ) : (
            <div className="space-y-3">
              {data?.pendingFareReports?.map((report: any) => (
                <div
                  key={report.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        📍 {report.city?.name}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {report.transportMode?.name || report.mode?.name || 'Local Transport'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          report.wasOvercharged
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {report.wasOvercharged ? '⚠️ Reported Overcharge' : '✓ Fair Fare'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Status: {report.verificationStatus}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-white">
                      {report.originName} → {report.destinationName}{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        ({report.distanceKm} km)
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center gap-3">
                      <span>
                        Fare Paid: <strong className="text-white">₹{report.actualFarePaid}</strong>
                      </span>
                      {report.quotedFare && (
                        <span>
                          Quoted by Driver: <span className="text-amber-400 line-through">₹{report.quotedFare}</span>
                        </span>
                      )}
                      <span>Reliability: <strong className="text-cyan-400">{report.reliabilityWeight}%</strong></span>
                    </div>

                    {report.comments && (
                      <p className="text-xs text-slate-400 italic">"{report.comments}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                    {report.verificationStatus !== 'ADMIN_VERIFIED' && (
                      <button
                        onClick={() => handleReviewFare(report.id, 'APPROVE')}
                        disabled={reviewingId === report.id}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-900/30 touch-min"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Verified</span>
                      </button>
                    )}

                    {report.verificationStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleReviewFare(report.id, 'REJECT')}
                        disabled={reviewingId === report.id}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors touch-min"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* High-Risk Zones & Emergency Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* High-Risk Safety Zones */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            Monitored Moderate / Caution Zones
          </h4>
          <div className="space-y-2">
            {data?.highRiskZones?.map((zone: any) => (
              <div
                key={zone.id}
                className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{zone.name}</span>
                  <span className="text-[10px] font-extrabold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-900">
                    {zone.riskTier} (Score: {zone.score})
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{zone.city?.name} • {zone.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency SOS Audit Logs */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <h4 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Recent SOS Audit Telemetry
          </h4>
          <div className="space-y-2">
            {data?.recentEmergencyLogs?.map((log: any) => (
              <div
                key={log.id}
                className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-400">{log.emergencyType}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  User: {log.user?.name || 'Guest Traveler'} • Location: ({log.lat.toFixed(4)}, {log.lng.toFixed(4)})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
