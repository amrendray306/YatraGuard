import React from 'react';
import { User, MapPin, Mail, Phone, ShieldCheck, Edit, Key, LogOut, Award, Sparkles } from 'lucide-react';

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
  };
  onEditProfile?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  onEditProfile,
  onChangePassword,
  onLogout,
}) => {
  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400/40 shadow-xl"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-white text-3xl font-black border-2 border-amber-400/40 shadow-xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user.name}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-900/60 text-blue-300 border border-blue-700/60">
              {user.role}
            </span>
            {user.authProvider === 'GOOGLE' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                Google Verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{user.email}</span>
            </span>

            {user.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{user.phone}</span>
              </span>
            )}

            {user.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{user.location}</span>
              </span>
            )}
          </div>

          {user.aboutMe && (
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl pt-1">
              {user.aboutMe}
            </p>
          )}

          {user.travelPreferences && (
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Style:
              </span>
              {user.travelPreferences.split(',').map((pref) => (
                <span
                  key={pref.trim()}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-amber-300 border border-slate-700"
                >
                  {pref.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reputation Badge */}
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center flex-shrink-0 min-w-[100px]">
          <div className="flex items-center justify-center text-amber-400 mb-1">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-lg font-black text-white">{user.reputationScore ?? 100}</span>
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Reputation</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
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
  );
};
