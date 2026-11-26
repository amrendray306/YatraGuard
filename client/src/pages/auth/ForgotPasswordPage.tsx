import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { apiForgotPassword, apiResetPassword } from '../../services/api';
import {
  Shield,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();

  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Mode: 'REQUEST' (ask for email) or 'RESET' (provide token & new password)
  const [mode, setMode] = useState<'REQUEST' | 'RESET'>(
    tokenFromUrl ? 'RESET' : 'REQUEST'
  );

  // Request State
  const [email, setEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [emailDeliveryMode, setEmailDeliveryMode] = useState<string | null>(null);

  // Reset State
  const [resetToken, setResetToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestSuccess(null);
    setEmailDeliveryMode(null);
    setRequestLoading(true);

    try {
      const res = await apiForgotPassword(email);
      setRequestSuccess(
        res.message ||
          'If an account exists with this email, password reset instructions have been issued.'
      );
      if (res.emailDelivery) {
        setEmailDeliveryMode(res.emailDelivery);
      }
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setRequestError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to send password reset instructions. Please try again.'
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);

    try {
      const res = await apiResetPassword({
        resetToken: resetToken.trim(),
        newPassword,
      });
      setResetSuccess(
        res.message ||
          'Your password has been successfully reset. You may now log in.'
      );
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setResetError(
        err?.response?.data?.error ||
          err?.message ||
          'Invalid or expired reset token. Please request a new token.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Navbar Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight text-amber-500">
              YatraGuard
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Travel Safety Platform
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 hover:bg-slate-900 text-amber-400'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/login"
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
              isDark
                ? 'border-slate-800 hover:bg-slate-900 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div
          className={`w-full max-w-md rounded-3xl border shadow-2xl p-8 transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-black/60'
              : 'bg-white/90 border-slate-200 backdrop-blur-xl shadow-slate-200'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {mode === 'REQUEST' ? 'Reset Your Password' : 'Set New Password'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {mode === 'REQUEST'
                ? 'Enter your verified account email to receive secure recovery instructions.'
                : 'Enter your reset token and your new strong password.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-800/40 p-1 mb-6 border border-slate-700/40">
            <button
              type="button"
              onClick={() => setMode('REQUEST')}
              className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${
                mode === 'REQUEST'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Request Reset
            </button>
            <button
              type="button"
              onClick={() => setMode('RESET')}
              className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${
                mode === 'RESET'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Enter Token
            </button>
          </div>

          {mode === 'REQUEST' ? (
            /* STEP 1: Request Password Reset */
            <form onSubmit={handleRequestReset} className="space-y-5">
              {requestSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{requestSuccess}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 text-slate-300 space-y-2">
                    <p className="text-[11px] leading-relaxed">
                      {emailDeliveryMode === 'SENT'
                        ? 'Check your inbox for your one-time password reset link or copy the code into step 2.'
                        : emailDeliveryMode === 'DEV_CONSOLE'
                        ? 'Email dispatch is not configured in local dev; check your server console log for the 15-minute reset code.'
                        : 'Email delivery provider (RESEND_API_KEY) is not configured on this server; contact an administrator if needed.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setMode('RESET')}
                      className="text-xs font-bold text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      Proceed to Enter Token <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {requestError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{requestError}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Account Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={requestLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requestLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Code...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset Instructions</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Enter Token & Set New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resetSuccess} Redirecting to login...</span>
                </div>
              )}

              {resetError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* Reset Token */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Reset Token / Security Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    placeholder="Paste 48-character reset token"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-mono transition-all outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                      isDark
                        ? 'bg-slate-800/60 border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>
          &copy; {new Date().getFullYear()} YatraGuard Security. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
