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
  MapPin,
  FileText,
  Activity,
  Layers,
  Lock,
  Search,
  Plus,
  Trash2,
  Edit2,
  Key,
  LogOut,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateAdminUserStatus,
  updateAdminUserRole,
  fetchAdminIncidents,
  reviewIncident,
  reviewFareReport,
  fetchAdminPrices,
  createAdminPriceRule,
  updateAdminPriceRule,
  deleteAdminPriceRule,
  fetchAdminDestinations,
  updateAdminDestination,
  fetchAdminCommunityPosts,
  deleteAdminCommunityPost,
  fetchAdminAnalytics,
  fetchAdminAuditLogs,
  apiLogin,
} from '../services/api';
import { DashboardStatCard } from '../components/cards/DashboardStatCard';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<
    'OVERVIEW' | 'USERS' | 'INCIDENTS' | 'PRICES' | 'DESTINATIONS' | 'COMMUNITY' | 'ANALYTICS' | 'AUDIT'
  >('OVERVIEW');

  // Overview Data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Module Data States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [pricesData, setPricesData] = useState<{ rules: any[]; reports: any[] }>({ rules: [], reports: [] });
  const [destinationsList, setDestinationsList] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('ALL');

  // Modals & Forms
  const [isNewPriceModalOpen, setIsNewPriceModalOpen] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Admin Login State (When logged out or non-admin)
  const [adminLoginForm, setAdminLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // Load active module data
  const loadModuleData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      if (activeModule === 'OVERVIEW') {
        const res = await fetchAdminOverview();
        setOverviewData(res);
      } else if (activeModule === 'USERS') {
        const res = await fetchAdminUsers({ search: userSearch || undefined });
        setUsersList(res.users || []);
      } else if (activeModule === 'INCIDENTS') {
        const res = await fetchAdminIncidents({ status: incidentFilter === 'ALL' ? undefined : incidentFilter });
        setIncidentsList(res.incidents || []);
      } else if (activeModule === 'PRICES') {
        const res = await fetchAdminPrices();
        setPricesData(res);
      } else if (activeModule === 'DESTINATIONS') {
        const res = await fetchAdminDestinations();
        setDestinationsList(res.cities || []);
      } else if (activeModule === 'COMMUNITY') {
        const res = await fetchAdminCommunityPosts();
        setCommunityPosts(res.posts || []);
      } else if (activeModule === 'ANALYTICS') {
        const res = await fetchAdminAnalytics();
        setAnalyticsData(res);
      } else if (activeModule === 'AUDIT') {
        const res = await fetchAdminAuditLogs();
        setAuditLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin module data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModuleData();
  }, [activeModule, user]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiLogin(adminLoginForm);
      if (res.user.role !== 'ADMIN' && res.user.role !== 'MODERATOR') {
        setLoginError('Access denied: You do not have administrator permissions.');
        return;
      }
      localStorage.setItem('travel_guardian_token', res.token);
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Invalid administrator credentials');
    }
  };

  const handleReviewIncident = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await reviewIncident(id, action);
      setActionMessage({ text: `Incident ${action === 'APPROVE' ? 'verified' : 'rejected'}`, type: 'success' });
      loadModuleData();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Failed to review incident', type: 'error' });
    }
  };

  const handleReviewFare = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await reviewFareReport(id, action);
      setActionMessage({ text: `Fare report ${action === 'APPROVE' ? 'verified' : 'rejected'}`, type: 'success' });
      loadModuleData();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Failed to review fare', type: 'error' });
    }
  };

  const handleToggleUserStatus = async (id: string, currentActive: boolean) => {
    try {
      await updateAdminUserStatus(id, !currentActive);
      setActionMessage({ text: `User account ${!currentActive ? 'activated' : 'suspended'}`, type: 'success' });
      loadModuleData();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Failed to update user status', type: 'error' });
    }
  };

  const handleDeleteCommunityPost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post for moderation violation?')) return;
    try {
      await deleteAdminCommunityPost(id);
      setActionMessage({ text: 'Post removed from community', type: 'success' });
      loadModuleData();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Failed to delete post', type: 'error' });
    }
  };

  const handleUpdateDestScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDest) return;
    try {
      await updateAdminDestination(editingDest.id, {
        defaultSafetyScore: editingDest.defaultSafetyScore,
        description: editingDest.description,
      });
      setEditingDest(null);
      setActionMessage({ text: 'Destination safety score updated', type: 'success' });
      loadModuleData();
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Failed to update destination', type: 'error' });
    }
  };

  // 1. ADMIN LOGIN VIEW (if not authenticated as ADMIN / MODERATOR)
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">YatraGuard Admin Console</h2>
            <p className="text-xs text-slate-400">
              Restricted portal. Dedicated access for safety officers, moderation leads, and system administrators.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Admin Email Address</label>
              <input
                type="email"
                placeholder="admin@travelguardian.in"
                value={adminLoginForm.email}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Admin Security Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={adminLoginForm.password}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg"
            >
              Sign In to Admin Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  const stats = overviewData?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* Toast Feedback */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/90 text-red-300 border border-red-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-purple-400">
              YatraGuard Security Operations Centre
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-blue-900/60 text-blue-300 border border-blue-700">
              {user.role}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Administrator Command Center</h1>
          <p className="text-xs text-slate-400">
            Signed in as {user.name} ({user.email}) • Real-time database management & safety audits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadModuleData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              logout();
              window.location.reload();
            }}
            className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 font-bold text-xs border border-red-800/80 transition-colors flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Module Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-md">
        {[
          { id: 'OVERVIEW', label: '📊 Overview', desc: 'System Stats' },
          { id: 'USERS', label: '👥 User Management', desc: 'Accounts & Roles' },
          { id: 'INCIDENTS', label: '🚨 Incident Moderation', desc: 'Verification Queue' },
          { id: 'PRICES', label: '💰 Price Management', desc: 'Tariffs & Overcharge' },
          { id: 'DESTINATIONS', label: '📍 Destinations', desc: 'Safety Scores' },
          { id: 'COMMUNITY', label: '💬 Community Moderation', desc: 'Stories & Tips' },
          { id: 'ANALYTICS', label: '📈 Analytics', desc: 'Insights' },
          { id: 'AUDIT', label: '📜 Audit Logs', desc: 'Activity Records' },
        ].map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
              activeModule === mod.id
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{mod.label}</span>
          </button>
        ))}
      </div>

      {/* MODULE 1: OVERVIEW DASHBOARD */}
      {activeModule === 'OVERVIEW' && (
        <div className="space-y-8">
          {/* 8 Metric Stat Cards as requested in prompt */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DashboardStatCard
              title="Total Registered Users"
              value={stats?.totalUsers || 0}
              icon={Users}
              accentColor="blue"
              subtext="PostgreSQL accounts"
            />
            <DashboardStatCard
              title="Active Travelers"
              value={stats?.activeUsers || 0}
              icon={ShieldCheck}
              accentColor="emerald"
              subtext="Unrestricted status"
            />
            <DashboardStatCard
              title="Supported Destinations"
              value={stats?.totalDestinations || 0}
              icon={MapPin}
              accentColor="amber"
              subtext="15 MVP Indian cities"
            />
            <DashboardStatCard
              title="Total Incident Reports"
              value={stats?.totalIncidents || 0}
              icon={AlertTriangle}
              accentColor="red"
              subtext="Crowdsourced reports"
            />
            <DashboardStatCard
              title="Pending Incidents"
              value={stats?.pendingReports || 0}
              icon={Clock}
              accentColor="amber"
              subtext="Awaiting review"
            />
            <DashboardStatCard
              title="Verified Reports"
              value={stats?.verifiedReports || 0}
              icon={CheckCircle2}
              accentColor="emerald"
              subtext="Confidence >= 95%"
            />
            <DashboardStatCard
              title="Community Posts"
              value={stats?.communityPosts || 0}
              icon={FileText}
              accentColor="purple"
              subtext="Stories & safety tips"
            />
            <DashboardStatCard
              title="Reported Content"
              value={stats?.reportedContent || 0}
              icon={ShieldAlert}
              accentColor="red"
              subtext="Flagged items"
            />
          </div>

          {/* Quick Review Queues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Incidents */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Pending Incidents Awaiting Verification</span>
                </h3>
                <span className="text-xs font-bold text-amber-400">
                  {overviewData?.pendingIncidents?.length || 0} pending
                </span>
              </div>

              {overviewData?.pendingIncidents?.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No pending incident reports. All clear!
                </div>
              ) : (
                <div className="space-y-3">
                  {overviewData?.pendingIncidents?.slice(0, 3).map((inc: any) => (
                    <div key={inc.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{inc.title}</span>
                        <span className="text-[10px] text-amber-400 font-bold">{inc.city?.name}</span>
                      </div>
                      <p className="text-xs text-slate-400">{inc.description}</p>
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReviewIncident(inc.id, 'REJECT')}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-red-950/60 text-red-400 font-bold text-xs"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewIncident(inc.id, 'APPROVE')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Verify & Broadcast
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High Risk Safety Zones */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Active Monitored Safety Zones</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {overviewData?.highRiskZones?.length || 0} monitored
                </span>
              </div>

              <div className="space-y-3">
                {overviewData?.highRiskZones?.slice(0, 4).map((zone: any) => (
                  <div key={zone.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{zone.name}</div>
                      <span className="text-[10px] text-slate-400">{zone.city?.name} • Score: {zone.score}/100</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-red-300 border border-red-800">
                      {zone.riskTier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: USER MANAGEMENT */}
      {activeModule === 'USERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Registered Users Directory</h3>
              <p className="text-xs text-slate-400">Manage user permissions, roles, and account security standing</p>
            </div>

            <div className="relative flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadModuleData();
                }}
                className="w-full bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div tabIndex={0} role="region" aria-label="Registered users table" className="yg-table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Base Location</th>
                  <th className="p-3">Reputation</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white">{u.name}</div>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        u.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        u.role === 'MODERATOR' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{u.location || 'India'}</td>
                    <td className="p-3 font-bold text-amber-400">{u.reputationScore} pts</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          u.isActive ? 'bg-slate-800 hover:bg-red-950/60 text-red-400' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {u.isActive ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODULE 3: INCIDENT MODERATION */}
      {activeModule === 'INCIDENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Crowdsourced Incident Moderation</h3>
              <p className="text-xs text-slate-400">Review, verify with police desks, and update public safety map alerts</p>
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'PENDING', 'ADMIN_VERIFIED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setIncidentFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    incidentFilter === st ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {incidentsList.map((inc) => (
              <div key={inc.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400">
                      {inc.category} • {inc.city?.name}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{inc.title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    inc.status === 'ADMIN_VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    inc.status === 'PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                  <span>Reporter: {inc.reporter?.name || 'Anonymous'} • Coordinates: [{inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}]</span>
                  <div className="flex items-center gap-2">
                    {inc.status !== 'ADMIN_VERIFIED' && (
                      <button
                        onClick={() => handleReviewIncident(inc.id, 'APPROVE')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Approve & Verify
                      </button>
                    )}
                    {inc.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReviewIncident(inc.id, 'REJECT')}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-red-950 text-red-400 font-bold text-xs"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 4: PRICE MANAGEMENT */}
      {activeModule === 'PRICES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">City Transportation Tariffs & RTO Rules</h3>
              <p className="text-xs text-slate-400">Configure official base rates, per-KM rates, and night surcharges</p>
            </div>
            <button
              onClick={() => setIsNewPriceModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add City Fare Rule</span>
            </button>
          </div>

          <div tabIndex={0} role="region" aria-label="Registered users table" className="yg-table-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">City</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Base Fare</th>
                  <th className="p-3">Per KM Rate</th>
                  <th className="p-3">Night Surcharge</th>
                  <th className="p-3">Source & Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pricesData.rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 font-bold text-white">{rule.city?.name}</td>
                    <td className="p-3 font-medium text-amber-300">{rule.transportMode?.displayName}</td>
                    <td className="p-3 font-bold">₹{rule.baseFare.toFixed(0)} ({rule.baseDistanceKm} km)</td>
                    <td className="p-3 font-bold">₹{rule.perKmRate.toFixed(1)}/km</td>
                    <td className="p-3 text-slate-300">+{rule.nightSurchargePct}%</td>
                    <td className="p-3 text-slate-400">{rule.officialCircularRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODULE 5: DESTINATION MANAGEMENT */}
      {activeModule === 'DESTINATIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Supported Indian Destinations Directory</h3>
            <p className="text-xs text-slate-400">Calibrate default safety baseline scores, descriptions, and monitored infrastructure</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {destinationsList.map((city) => (
              <div key={city.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-white">{city.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Score: {city.defaultSafetyScore}/100
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{city.state}</span>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">{city.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {city._count?.services || 0} services • {city._count?.safetyZones || 0} zones
                  </span>
                  <button
                    onClick={() => setEditingDest(city)}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  >
                    Edit Baseline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: COMMUNITY MODERATION */}
      {activeModule === 'COMMUNITY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Community Posts & Safety Tips Moderation</h3>
            <p className="text-xs text-slate-400">Review user-submitted travel stories, delete misleading content, and moderate comments</p>
          </div>

          <div className="space-y-4">
            {communityPosts.map((post) => (
              <div key={post.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400">
                      {post.category} • {post.destinationName}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{post.title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{post.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteCommunityPost(post.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-red-400 font-bold text-xs"
                    title="Remove post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Author: {post.user?.name} ({post.user?.email}) • {post.likesCount} Likes</span>
                  <span>{post.comments?.length || 0} Comments</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 7: ANALYTICS */}
      {activeModule === 'ANALYTICS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Safety & Platform Activity Analytics</h3>
            <p className="text-xs text-slate-400">Aggregated breakdown across cities, user roles, and community contributions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">Incidents Distribution by City</h4>
              <div className="space-y-2">
                {analyticsData?.incidentsByCity?.map((c: any) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="text-white font-bold">{c.name}</span>
                    <span className="text-amber-400 font-bold">{c._count?.incidents || 0} reports</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400">User Role Distribution</h4>
              <div className="space-y-2">
                {analyticsData?.usersByRole?.map((r: any) => (
                  <div key={r.role} className="flex items-center justify-between text-xs">
                    <span className="text-white font-bold">{r.role}</span>
                    <span className="text-emerald-400 font-bold">{r._count?.id || 0} accounts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 8: AUDIT LOGS */}
      {activeModule === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Administrator Action Audit Logs</h3>
            <p className="text-xs text-slate-400">Tamper-evident record of administrator moderation actions, verifications, and updates</p>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
                      {log.action}
                    </span>
                    <span className="text-slate-400">• Target: {log.targetEntity}</span>
                  </div>
                  <p className="text-slate-200">{log.details}</p>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <div className="font-bold text-white">{log.admin?.name}</div>
                  <div>{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT DESTINATION MODAL */}
      {editingDest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Edit Destination: {editingDest.name}</h3>

            <form onSubmit={handleUpdateDestScore} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Default Safety Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingDest.defaultSafetyScore}
                  onChange={(e) => setEditingDest({ ...editingDest, defaultSafetyScore: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Safety Description</label>
                <textarea
                  rows={3}
                  value={editingDest.description}
                  onChange={(e) => setEditingDest({ ...editingDest, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
