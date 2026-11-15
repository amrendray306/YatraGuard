import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  FileWarning,
  MessageSquare,
  AlertTriangle,
  MessageCircle,
  IndianRupee,
  Flag,
  History,
  Bell,
  UserCheck,
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  ArrowLeft,
} from 'lucide-react';

const modNavItems = [
  { path: '/moderator/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/moderator/reports', label: 'Incident Reports', icon: FileWarning },
  { path: '/moderator/community', label: 'Community Moderation', icon: MessageSquare },
  { path: '/moderator/reported-posts', label: 'Reported Posts', icon: AlertTriangle },
  { path: '/moderator/reported-comments', label: 'Reported Comments', icon: MessageCircle },
  { path: '/moderator/prices', label: 'Price Submissions', icon: IndianRupee },
  { path: '/moderator/complaints', label: 'User Complaints', icon: Flag },
  { path: '/moderator/history', label: 'Moderation History', icon: History },
  { path: '/moderator/notifications', label: 'Notifications', icon: Bell },
  { path: '/moderator/profile', label: 'My Profile', icon: UserCheck },
];

export function ModeratorLayout({ children }: { children: React.ReactNode }) {
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

  const currentNav = modNavItems.find(
    (n) => location.pathname === n.path || (n.path !== '/moderator/dashboard' && location.pathname.startsWith(n.path))
  );

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Moderator Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-slate-900 border-r border-slate-800'
            : 'bg-white border-r border-slate-200'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-blue-400">YatraGuard</div>
              <div className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Moderator Hub
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

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {modNavItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/moderator/dashboard' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-blue-400'}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Moderator Badge & Logout */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3 mb-3">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-blue-500" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'M'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate">{user?.name || 'Safety Moderator'}</div>
              <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</div>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Mod
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
        {/* Header */}
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
                {currentNav?.label || 'Moderation Center'}
              </h1>
              <p className={`text-[10px] sm:text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Community Safety & Incident Verification Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
