import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

export function LoginPage() {
  const { loginWithCredentials, user, isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to redirect based on authenticated role
  const redirectByRole = (role: string, targetPath?: string) => {
    // If user attempted to access a specific protected route and has required permission, redirect there
    if (targetPath && targetPath !== '/login' && targetPath !== '/register') {
      if (role === 'ADMIN') {
        navigate(targetPath, { replace: true });
        return;
      }
      if (role === 'MODERATOR' && (targetPath.startsWith('/moderator') || targetPath.startsWith('/dashboard') || targetPath.startsWith('/profile'))) {
        navigate(targetPath, { replace: true });
        return;
      }
      if (role === 'TRAVELER' && !targetPath.startsWith('/admin') && !targetPath.startsWith('/moderator')) {
        navigate(targetPath, { replace: true });
        return;
      }
    }

    // Default role-based destinations
    if (role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    } else if (role === 'MODERATOR') {
      navigate('/moderator/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  // If already logged in, redirect immediately
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const fromPath = (location.state as any)?.from?.pathname;
      redirectByRole(user.role, fromPath);
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginWithCredentials(email, password);
      const userRole = res?.user?.role || 'TRAVELER';
      const fromPath = (location.state as any)?.from?.pathname;
      redirectByRole(userRole, fromPath);
    } catch (err: any) {
      console.error('Login authentication error:', err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Invalid email or password. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
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
            <div className="font-black text-lg tracking-tight text-amber-500">YatraGuard</div>
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
            title="Toggle color theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/"
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            ← Explore
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div
            className={`border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-1">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-inherit">
                Welcome Back to YatraGuard
              </h1>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sign in to access your safety dashboard, live alerts & verified travel community
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Unified Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-950 accent-amber-500"
                  />
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Remember this session
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 group active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Registration Link */}
            <div
              className={`pt-5 border-t text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              Don't have a YatraGuard account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4"
              >
                Register Here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} YatraGuard Safety Technologies. Enterprise-grade encryption & automated role detection.
      </footer>
    </div>
  );
}
