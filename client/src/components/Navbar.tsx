import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Users,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openAuthModal?: (mode?: 'LOGIN' | 'REGISTER') => void;
  openIncidentModal?: () => void;
  openOnboarding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openEmergencyModal,
  openAuthModal,
  openIncidentModal,
  openOnboarding,
}) => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();
  const { user, logout, quickLogin } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Exact requested Navigation:
  // Home, Explore Destinations, Safety Map, Scam Alerts, Route Prices, Local Prices, Travel Community, About Us
  const navItems = [
    { id: 'landing', label: 'Home', icon: Compass },
    { id: 'dashboard', label: 'Explore', icon: MapPin },
    { id: 'map', label: 'Safety Map', icon: Navigation },
    { id: 'fare', label: 'Local Prices', icon: IndianRupee },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'buddy', label: 'Travel Buddy', icon: Users },
    { id: 'guardian', label: 'AI Assistant', icon: Bot },
    { id: 'routes', label: 'Tariffs', icon: Compass },
  ];

  const scoreColor =
    (safetyScoreData?.score || 75) >= 75
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
      : (safetyScoreData?.score || 75) >= 50
      ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
      : 'text-red-400 bg-red-950/60 border-red-500/40';

  return (
    <>
      <header className="sticky top-0 z-[100] bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo & Brand Identity */}
            <div
              className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
              onClick={() => setCurrentTab('landing')}
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
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  AI Context-Aware Travel Safety & Tariffs
                </p>
              </div>
            </div>

            {/* City Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowCityMenu(!showCityMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>{currentCity?.name || 'Select City'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {showCityMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-[110] animate-in fade-in max-h-72 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Supported Destinations
                  </div>
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => {
                        setCity(city);
                        setShowCityMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        currentCity?.id === city.id
                          ? 'text-amber-400 font-bold bg-slate-800/60'
                          : 'text-slate-300'
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
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold cursor-pointer transition-all hover:scale-105 ${scoreColor}`}
                title="Click to view full safety breakdown"
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Safety:</span>
                <span className="font-extrabold">{safetyScoreData.score} / 100</span>
              </div>
            )}

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* About Us Nav Button */}
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>About</span>
              </button>

              {/* Onboarding Tour Guide */}
              {openOnboarding && (
                <button
                  onClick={openOnboarding}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-white hover:bg-slate-900 transition-all border border-amber-500/30"
                  title="Take the interactive platform tour"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Guide</span>
                </button>
              )}
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
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

              {/* Report Scam / Safety Incident Button */}
              {openIncidentModal && (
                <button
                  onClick={openIncidentModal}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 font-extrabold text-xs shadow-sm transition-all active:scale-95"
                  title="Report tout, overcharging, fake operator or safety hazard"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Report Scam</span>
                </button>
              )}

              {/* SOS Emergency Button */}
              <button
                id="sos-button"
                onClick={openEmergencyModal}
                className="relative group px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-600/40 hover:shadow-red-600/60 border border-red-400/30 active:scale-95 transition-all flex items-center gap-1.5 animate-pulse"
              >
                <ShieldAlert className="w-4 h-4 text-white" />
                <span>SOS</span>
              </button>

              {/* User Profile Avatar / Authentication */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
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
                    <span className="hidden sm:inline max-w-[80px] truncate font-bold text-white">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-[110] text-xs animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2.5 border-b border-slate-800">
                        <div className="font-bold text-white text-sm">{user.name}</div>
                        <div className="text-slate-400 text-[11px] truncate">{user.email}</div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/40">
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
                            setCurrentTab('profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-amber-400 font-bold flex items-center gap-2"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>Personal Profile & Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentTab('trips');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 font-medium"
                        >
                          <Compass className="w-3.5 h-3.5 text-blue-400" />
                          <span>My Trips & Sharing</span>
                        </button>
                        <button
                          onClick={() => {
                            setCurrentTab('vault');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 font-medium"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Emergency Vault</span>
                        </button>
                        {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                          <button
                            onClick={() => {
                              setCurrentTab('admin');
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-purple-300 font-bold flex items-center gap-2"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                            <span>Admin Console</span>
                          </button>
                        )}
                      </div>

                      <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 border-t border-slate-800">
                        Demo Personas (Capstone Evaluation)
                      </div>
                      <button
                        onClick={() => {
                          quickLogin('TRAVELER');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Traveler (Amrendra)</span>
                        <span className="text-[10px] text-emerald-400 font-bold">User</span>
                      </button>
                      <button
                        onClick={() => {
                          quickLogin('ADMIN');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Dr. Rajesh Sharma</span>
                        <span className="text-[10px] text-purple-400 font-bold">Admin</span>
                      </button>
                      <button
                        onClick={() => {
                          quickLogin('MODERATOR');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Priya Nair</span>
                        <span className="text-[10px] text-blue-400 font-bold">Mod</span>
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
                  <Link
                    to="/login"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors inline-flex items-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 items-center"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                aria-label="Open mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Navigation Menu */}
          {mobileMenuOpen && (
            <div className="xl:hidden py-4 border-t border-slate-800 grid grid-cols-2 gap-2 animate-in fade-in">
              {[
                { id: 'landing', label: 'Home', icon: Compass },
                { id: 'dashboard', label: 'Explore Destinations', icon: MapPin },
                { id: 'map', label: 'Safety Map', icon: Navigation },
                { id: 'alerts', label: 'Scam Alerts', icon: AlertTriangle },
                { id: 'routes', label: 'Route Prices', icon: Compass },
                { id: 'fare', label: 'Local Prices', icon: IndianRupee },
                { id: 'community', label: 'Travel Community', icon: Users },
                { id: 'buddy', label: 'Travel Buddy', icon: Users },
                { id: 'safety', label: 'Safety Scores', icon: ShieldCheck },
                { id: 'services', label: 'Hospitals & Police', icon: Building2 },
                { id: 'guardian', label: 'AI Guardian', icon: Bot },
                { id: 'profile', label: 'My Profile', icon: UserIcon },
                { id: 'trips', label: 'My Trips', icon: Compass },
                { id: 'admin', label: 'Admin Portal', icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              {!user && (
                <div className="col-span-2 pt-2 border-t border-slate-800 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-xs font-black text-slate-950 shadow-md"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ABOUT US MODAL */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">About YatraGuard</h3>
                  <p className="text-[11px] text-slate-400">Context-Aware Travel Safety & Tariffs</p>
                </div>
              </div>
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>YatraGuard</strong> was architected to eliminate travel uncertainty, prevent tout extortion, and provide context-aware safety intelligence for travelers navigating unfamiliar destinations across India.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Fair Tariffs
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Official RTO fare charts with hill & midnight surcharges.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Safety Index
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bayesian 0–100 score combining hospitals, police, and lighting.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                Built as a Senior Full-Stack Engineering Capstone Defense Platform with React, TypeScript, Leaflet, Express, Prisma ORM, and Neon PostgreSQL.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAboutModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
