import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';

export function RegisterPage() {
  const { registerWithCredentials, isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // All public registrations strictly receive TRAVELER role
      await registerWithCredentials(name, email, password, phone);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to create account. Please check your information and try again.'
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
            to="/login"
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sign In →
          </Link>
        </div>
      </header>

      {/* Main Registration Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          <div
            className={`border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-1">
                <UserIcon className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-inherit">
                Create Your Account
              </h1>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Join India's trusted travel safety, scam alert and fair pricing community
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
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
                    placeholder="priya@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                      isDark
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Password
                  </label>
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
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-colors focus:outline-none ${
                        isDark
                          ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div
              className={`pt-5 border-t text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              Already registered on YatraGuard?{' '}
              <Link
                to="/login"
                className="font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4"
              >
                Sign In Here
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-500">
        All public registrations strictly receive verified Traveler permissions. Moderator and Admin roles require authorization.
      </footer>
    </div>
  );
}
