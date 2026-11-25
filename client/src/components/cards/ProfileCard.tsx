import React from 'react';
import {
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Edit,
  Key,
  LogOut,
  Award,
  Sparkles,
  Camera,
  CheckCircle,
} from 'lucide-react';
import { resolveMediaUrl } from '../../services/api';

export interface ProfileCardProps {
  user: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    role: string;
    avatarUrl?: string;
    reputationScore?: number;
    authProvider?: string;
    aboutMe?: string;
    travelPreferences?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  onEditProfile?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
  onEditPhoto?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  onEditProfile,
  onChangePassword,
  onLogout,
  onEditPhoto,
}) => {
  // Calculate profile completion score
  const checks = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.phone),
    Boolean(user.location),
    Boolean(user.avatarUrl),
    Boolean(user.aboutMe),
    Boolean(user.emergencyContactName),
  ];
  const completedChecks = checks.filter(Boolean).length;
  const completionPct = Math.round((completedChecks / checks.length) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Cover Banner */}
      <div className="h-32 sm:h-44 bg-gradient-to-r from-amber-500 via-orange-600 to-slate-950 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Profile {completionPct}% Complete</span>
          </div>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-6 sm:p-8 pt-0 relative space-y-6">
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Avatar with Camera Overlay */}
            <div className="relative group inline-block">
              {user.avatarUrl ? (
                <img
                  src={resolveMediaUrl(user.avatarUrl)}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-slate-900 shadow-2xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-white text-3xl font-black border-4 border-slate-900 shadow-2xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {onEditPhoto && (
                <button
                  type="button"
                  onClick={onEditPhoto}
                  className="absolute bottom-1 right-1 p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg border-2 border-slate-900 transition-transform hover:scale-105"
                  title="Upload / Change Profile Picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1 sm:pt-4">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    user.role === 'ADMIN'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : user.role === 'MODERATOR'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {user.role}
                </span>
                {user.authProvider === 'GOOGLE' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    Google Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user.phone}</span>
                  </span>
                )}
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{user.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reputation Badge */}
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center flex-shrink-0 min-w-[100px] shadow-lg">
            <div className="flex items-center justify-center text-amber-400 mb-1">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-lg font-black text-white">{user.reputationScore ?? 100}</span>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Reputation</span>
          </div>
        </div>

        {/* Bio & Travel Preferences */}
        {user.aboutMe && (
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl pt-1">
            {user.aboutMe}
          </p>
        )}

        {user.travelPreferences && (
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Travel Preferences:
            </span>
            {user.travelPreferences.split(',').map((pref) => (
              <span
                key={pref.trim()}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-amber-300 border border-slate-700"
              >
                {pref.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onEditPhoto && (
              <button
                onClick={onEditPhoto}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Change Photo</span>
              </button>
            )}

            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            {onChangePassword && user.authProvider === 'LOCAL' && (
              <button
                onClick={onChangePassword}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            )}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 font-bold text-xs border border-red-800/60 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
