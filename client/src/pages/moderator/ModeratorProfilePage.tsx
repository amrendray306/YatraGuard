import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Camera,
  Activity,
  Calendar,
  MapPin,
  Mail,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { api, resolveMediaUrl } from '../../services/api';
import { ProfileImageModal } from '../../components/shared/ProfileImageModal';

export function ModeratorProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/moderator/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfileData(res.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const modUser = profileData?.user || user;
  const stats = profileData?.stats;

  return (
    <ModeratorLayout>
      <div className="space-y-6 max-w-4xl animate-fade-in">
        {/* Cover / Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {/* Cover gradient */}
          <div className="h-32 sm:h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 relative">
            <div className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-blue-300 border border-blue-400/30">
              Assigned: Incident Verification & Safety Audits
            </div>
          </div>

          {/* Profile Header */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              <div className="relative inline-block">
                {modUser?.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(modUser.avatarUrl)}
                    alt=""
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-slate-900 shadow-2xl"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-blue-600 border-4 border-slate-900 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-2xl">
                    {modUser?.name?.[0]?.toUpperCase() || 'M'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border-2 border-slate-900 transition-colors"
                  title="Change Profile Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="sm:text-right">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Community Safety Moderator
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">{modUser?.name}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {modUser?.email}
                </span>
                {modUser?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" /> {modUser.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Member since {new Date(modUser?.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              {modUser?.aboutMe && (
                <p className="text-xs sm:text-sm text-slate-300 pt-2">{modUser.aboutMe}</p>
              )}
            </div>
          </div>
        </div>

        {/* Moderation Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats?.totalActions ?? 0}</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Verification Actions</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{modUser?.reputationScore ?? 100}</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Reputation Score</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">Active</div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Moderator Clearance</div>
            </div>
          </div>
        </div>

        {/* Assigned Responsibilities */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="font-extrabold text-base text-white">Assigned Responsibilities & Guidelines</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-blue-400 block mb-1">1. Incident Report Verification</strong>
              Review traveler reports within 150m radius duplicate bounds. Verify or reject based on evidence.
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-blue-400 block mb-1">2. Price Benchmark Quality</strong>
              Audit community transit fare submissions against RTO auto tariffs and verified taxi union charts.
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-blue-400 block mb-1">3. Content Safety Standards</strong>
              Hide inappropriate or misleading photos. Escalate serious scams or criminal reports to administrators.
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <strong className="text-blue-400 block mb-1">4. Privacy Protection</strong>
              Never disclose personal identities of reporters. All moderation actions are cryptographically recorded.
            </div>
          </div>
        </div>

        {/* Photo Modal */}
        <ProfileImageModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          currentAvatarUrl={modUser?.avatarUrl}
          onSuccess={() => fetchProfile()}
        />
      </div>
    </ModeratorLayout>
  );
}
