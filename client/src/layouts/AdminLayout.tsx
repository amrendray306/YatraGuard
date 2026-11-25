import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../services/api';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileWarning,
  MessageSquare,
  MapPin,
  IndianRupee,
  Bot,
  Key,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Sun,
  Moon,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/users', label: 'User Management', icon: Users },
  { path: '/admin/moderators', label: 'Moderator Management', icon: ShieldCheck },
  { path: '/admin/incidents', label: 'Incident Management', icon: FileWarning },
  { path: '/admin/community', label: 'Community Management', icon: MessageSquare },
  { path: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { path: '/admin/prices', label: 'Local Prices', icon: IndianRupee },
  { path: '/admin/ai-config', label: 'AI Configuration', icon: Bot },
  { path: '/admin/api-mgmt', label: 'API Management', icon: Key },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { path: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNav = navItems.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'));

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-slate-900 border-r border-slate-800'
            : 'bg-white border-r border-slate-200'
        }`}
      >
        {/* Brand / Logo */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-amber-500">YatraGuard</div>
              <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Admin Portal
              </div>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-slate-950' : 'text-amber-500'}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3 mb-3">
            {user?.avatarUrl ? (
              <img src={resolveMediaUrl(user.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover border border-amber-500" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate">{user?.name || 'Administrator'}</div>
              <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</div>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-72 min-w-0">
        {/* Top Header */}
        <header
          className={`sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight">
                {currentNav?.label || 'Administration'}
              </h1>
              <p className={`text-[10px] sm:text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Platform Administrative Environment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-900 text-amber-400'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Back to Traveler Site */}
            <a
              href="/"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-900 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Traveler Site</span>
            </a>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
