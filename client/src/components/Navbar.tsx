import React, { useState } from 'react';
import {
  ShieldAlert,
  MapPin,
  Compass,
  AlertTriangle,
  Building2,
  Navigation,
  Bot,
  User as UserIcon,
  ShieldCheck,
  Radio,
  Lock,
  Menu,
  X,
  ChevronDown,
  IndianRupee,
  Sun,
  Moon,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openAuthModal?: (mode?: 'LOGIN' | 'REGISTER') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openEmergencyModal,
  openAuthModal,
}) => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();
  const { user, logout, quickLogin } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'fare', label: 'Fare Intelligence', icon: IndianRupee },
    { id: 'map', label: 'Safety Map', icon: Navigation },
    { id: 'safety', label: 'Safety Score', icon: ShieldCheck },
    { id: 'routes', label: 'Safe Routes', icon: Navigation },
    { id: 'scams', label: 'Scam Alerts', icon: AlertTriangle },
    { id: 'services', label: 'Nearby Services', icon: Building2 },
    { id: 'guardian', label: 'YatraGuard AI', icon: Bot },
    { id: 'trips', label: 'Trips', icon: Compass },
    { id: 'vault', label: 'Vault', icon: Lock },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldAlert });
  }

  const scoreColor =
    (safetyScoreData?.score || 75) >= 75
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
      : (safetyScoreData?.score || 75) >= 50
      ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
      : 'text-red-400 bg-red-950/60 border-red-500/40';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Platform Name */}
          <div
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
            onClick={() => setCurrentTab('dashboard')}
          >
            <div className="relative p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-lg shadow-amber-900/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Yatra<span className="text-amber-400">Guard</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                AI Travel Safety & Fare Intelligence
              </p>
            </div>
          </div>

          {/* City Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCityMenu(!showCityMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold">{currentCity?.name || 'Select City'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showCityMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Supported MVP Cities
                </div>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setCity(city);
                      setShowCityMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentCity?.id === city.id ? 'text-red-400 font-semibold bg-slate-800/60' : 'text-slate-300'
                    }`}
                  >
                    <span>{city.name}</span>
                    <span className="text-[10px] text-slate-500">{city.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety Score Quick Pill */}
          {safetyScoreData && (
            <div
              onClick={() => setCurrentTab('safety')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold cursor-pointer transition-all hover:scale-105 ${scoreColor}`}
              title="Click to view full safety breakdown"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Safety Score:</span>
              <span className="font-extrabold">{safetyScoreData.score} / 100</span>
            </div>
          )}

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: SOS Button, Theme Toggle & User Profile */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors touch-min flex items-center justify-center"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* EMERGENCY SOS TRIGGER BUTTON */}
            <button
              id="sos-button"
              onClick={openEmergencyModal}
              className="relative group px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-600/40 hover:shadow-red-600/60 border border-red-400/30 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>SOS EMERGENCY</span>
            </button>

            {/* Authentication / User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white text-[11px] font-black border border-amber-400/40">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[90px] truncate font-semibold text-white">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <div className="font-bold text-white text-sm">{user.name}</div>
                      <div className="text-slate-400 text-[11px] truncate">{user.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/40">
                          {user.role}
                        </span>
                        {user.authProvider === 'GOOGLE' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                            Google Verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setCurrentTab('vault');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Emergency Vault</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentTab('trips');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                      >
                        <Compass className="w-3.5 h-3.5 text-blue-400" />
                        <span>My Trips</span>
                      </button>
                    </div>

                    <div className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-t border-slate-800">
                      Switch Demo Persona (Capstone Evaluation)
                    </div>
                    <button
                      onClick={() => {
                        quickLogin('TRAVELER');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                    >
                      <span>Traveler (Amrendra)</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">User</span>
                    </button>
                    <button
                      onClick={() => {
                        quickLogin('ADMIN');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                    >
                      <span>Admin (Dr. Rajesh)</span>
                      <span className="text-[10px] text-purple-400 font-semibold">Admin</span>
                    </button>
                    <button
                      onClick={() => {
                        quickLogin('MODERATOR');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                    >
                      <span>Moderator (Priya)</span>
                      <span className="text-[10px] text-blue-400 font-semibold">Mod</span>
                    </button>

                    <div className="border-t border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-950/40 text-red-400 font-bold"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal?.('LOGIN')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal?.('REGISTER')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-3 border-t border-slate-800 grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
