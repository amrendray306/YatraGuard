import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiGetAuthConfig } from '../../services/api';
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
  const { loginWithCredentials, loginWithGoogle, user, isAuthenticated } = useAuth();
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
  const [googleClientId, setGoogleClientId] = useState('');

  // Fetch configured Google Client ID from backend
  useEffect(() => {
    apiGetAuthConfig()
      .then((cfg) => {
        if (cfg.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch((err) => console.warn('Could not load auth config:', err));
  }, []);

  // Helper function to redirect based on authenticated role
  const redirectByRole = (role: string, targetPath?: string) => {
    if (targetPath && targetPath !== '/login' && targetPath !== '/register') {
      if (role === 'ADMIN') {
        navigate(targetPath, { replace: true });
        return;
      }
      if (
        role === 'MODERATOR' &&
        (targetPath.startsWith('/moderator') ||
          targetPath.startsWith('/dashboard') ||
          targetPath.startsWith('/profile'))
      ) {
        navigate(targetPath, { replace: true });
        return;
      }
      if (
        role === 'TRAVELER' &&
        !targetPath.startsWith('/admin') &&
        !targetPath.startsWith('/moderator')
      ) {
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

  // Initialize official Google Identity Services button if script and Client ID are present
  useEffect(() => {
    if (!googleClientId) return;

    const initGsi = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (!response.credential) return;
            setLoading(true);
            setError(null);
            try {
              const res = await loginWithGoogle({ idToken: response.credential });
              const userRole = res?.user?.role || 'TRAVELER';
              const fromPath = (location.state as any)?.from?.pathname;
              redirectByRole(userRole, fromPath);
            } catch (err: any) {
              setError(
                err.response?.data?.error ||
                  err.message ||
                  'Google authentication token verification failed.'
              );
            } finally {
              setLoading(false);
            }
          },
        });

        const slot = document.getElementById('gsi-btn-container');
        if (slot) {
          slot.innerHTML = '';
          google.accounts.id.renderButton(slot, {
            type: 'standard',
            theme: isDark ? 'filled_black' : 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: '100%',
          });
        }
      } catch (e) {
        console.warn('Google Identity Services init notice:', e);
      }
    };

    initGsi();
    const timer = setTimeout(initGsi, 400);
    return () => clearTimeout(timer);
  }, [googleClientId, isDark]);

  const handleGoogleSignInFallback = async () => {
    setError(null);
    const google = (window as any).google;
    if (googleClientId && google?.accounts?.id) {
      setLoading(true);
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setLoading(false);
          setError(
            'Google One-Tap prompt was suppressed by your browser. Please use the official "Sign in with Google" button above or sign in with your email and password.'
          );
        }
      });
      return;
    }

    setError(
      'Google OAuth Client ID is not configured for this deployment yet. Please sign in with your email and password.'
    );
  };

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
            title="Toggle Theme"
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

            {/* Google Authentication Section */}
            <div className="space-y-3">
              {/* Native Google Identity Services Button Container */}
              <div id="gsi-btn-container" className="flex justify-center w-full min-h-[40px]" />

              {/* Branded Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignInFallback}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 border active:scale-95 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-750 text-white border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google / Gmail</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center pt-2">
                <div className={`border-t w-full ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                <span
                  className={`absolute px-3 text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'
                  }`}
                >
                  Or sign in with email
                </span>
              </div>
            </div>

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
                    className={`block text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/20"
                  />
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Remember this device
                  </span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed group mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Platform</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Registration Footer */}
            <div
              className={`text-center pt-4 border-t text-xs ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-amber-500 hover:underline">
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`px-6 py-4 text-center text-xs border-t ${
          isDark ? 'border-slate-900 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}
      >
        Protected by YatraGuard Spatial Security Engine &bull; Neon Cloud Database
      </footer>
    </div>
  );
}
