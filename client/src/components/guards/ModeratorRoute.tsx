import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function ModeratorRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'MODERATOR' && user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-blue-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Moderator Clearance Required</h1>
          <p className="text-slate-400 text-sm mb-6">
            The safety moderation workspace is reserved for appointed Community Safety Moderators and Administrators. Your account has role <strong className="text-blue-400">{user.role}</strong>.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Site
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
