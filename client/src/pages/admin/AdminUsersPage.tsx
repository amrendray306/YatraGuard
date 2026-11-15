import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';

export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Promote Dialog state
  const [promoteCandidate, setPromoteCandidate] = useState<any | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromoteConfirm = async () => {
    if (!promoteCandidate) return;
    setActionLoading(promoteCandidate.id);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(`/admin/users/${promoteCandidate.id}/promote`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotification({
        type: 'success',
        message: `Successfully promoted ${promoteCandidate.name} to Community Safety Moderator.`,
      });
      setPromoteCandidate(null);
      fetchUsers();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || 'Failed to promote user.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const action = user.isActive ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    setActionLoading(user.id);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotification({
        type: 'success',
        message: `User ${user.name} has been ${user.isActive ? 'suspended' : 'reactivated'}.`,
      });
      fetchUsers();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || 'Failed to update user status.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (u.email?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (u.location?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">User Account Directory</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search, filter, appoint moderators, and manage traveler account permissions
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Total Users: <span className="text-amber-400">{users.length}</span>
          </div>
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

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, email, or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            {['ALL', 'TRAVELER', 'MODERATOR', 'ADMIN'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  roleFilter === role
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Traveler Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Reputation</th>
                  <th className="px-6 py-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading user database...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-sm">{u.name}</div>
                            <div className="text-slate-400 text-[11px]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : u.role === 'MODERATOR'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{u.location || 'Not Specified'}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-400">{u.reputationScore ?? 100}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role === 'TRAVELER' && (
                            <button
                              onClick={() => setPromoteCandidate(u)}
                              disabled={actionLoading === u.id}
                              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-bold rounded-lg border border-blue-500/30 transition-colors flex items-center gap-1"
                              title="Promote to Moderator"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Appoint Mod
                            </button>
                          )}
                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={actionLoading === u.id}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                u.isActive
                                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                                  : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={u.isActive ? 'Suspend User' : 'Restore User'}
                            >
                              {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Promote Confirmation Modal Dialog */}
        {promoteCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Appoint Community Safety Moderator</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to promote <strong>{promoteCandidate.name}</strong> ({promoteCandidate.email}) to
                  a Moderator? They will be granted permissions to verify incident reports, hide inappropriate community
                  content, and access the Moderator Portal.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>• Action recorded in Admin Audit Logs</div>
                <div>• User receives an in-app notification immediately</div>
                <div>• Can be revoked at any time from Moderator Management</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoteCandidate(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePromoteConfirm}
                  disabled={!!actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  {actionLoading ? 'Promoting...' : 'Confirm Appointment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
