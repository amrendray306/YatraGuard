import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  ShieldCheck,
  UserMinus,
  Search,
  AlertCircle,
  CheckCircle2,
  Activity,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

export function AdminModeratorsPage() {
  const [moderators, setModerators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revokeCandidate, setRevokeCandidate] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchModerators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/admin/moderators', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModerators(res.data.moderators || []);
    } catch (err: any) {
      console.error('Failed to load moderators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerators();
  }, []);

  const handleRevokeConfirm = async () => {
    if (!revokeCandidate) return;
    setActionLoading(revokeCandidate.id);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(`/admin/users/${revokeCandidate.id}/demote`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotification({
        type: 'success',
        message: `Moderator privileges revoked for ${revokeCandidate.name}. User has been returned to Traveler role.`,
      });
      setRevokeCandidate(null);
      fetchModerators();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || 'Failed to revoke moderator privileges.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMods = moderators.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Community Safety Moderators</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active moderators with verified report auditing and content moderation authorization
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            + Appoint New Moderator
          </Link>
        </div>

        {notification && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active moderators..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Moderators Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredMods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMods.map((mod) => (
              <div
                key={mod.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 hover:border-blue-500/40 transition-colors shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {mod.avatarUrl ? (
                      <img
                        src={mod.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover border border-blue-500/40"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 font-black text-base flex items-center justify-center border border-blue-500/30">
                        {mod.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-white">{mod.name}</h3>
                      <p className="text-xs text-slate-400 truncate">{mod.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    MOD
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <Activity className="w-3 h-3 text-blue-400" /> Actions
                    </div>
                    <div className="font-black text-white text-base mt-1">
                      {mod._count?.moderationActions ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <Calendar className="w-3 h-3 text-amber-400" /> Appointed
                    </div>
                    <div className="font-bold text-slate-300 text-xs mt-1.5 truncate">
                      {new Date(mod.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRevokeCandidate(mod)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Revoke Moderator Privileges
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-bold text-base text-slate-300">No Moderators Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You can promote any registered traveler into a Community Safety Moderator from the User Management directory.
            </p>
            <Link
              to="/admin/users"
              className="inline-block px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-700 mt-2"
            >
              Browse User Directory
            </Link>
          </div>
        )}

        {/* Revoke Confirmation Dialog */}
        {revokeCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                <UserMinus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Revoke Moderator Privileges</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to revoke moderator privileges for <strong>{revokeCandidate.name}</strong> ({revokeCandidate.email})?
                  They will immediately lose access to the Moderator Hub.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeCandidate(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  disabled={!!actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-500/20"
                >
                  {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
