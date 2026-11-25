import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Monitor,
  Users,
  Info,
  Sparkles,
  Languages,
  MoreHorizontal,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../services/api';

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
  openIncidentModal,
  openOnboarding,
}) => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();
  const { user, logout, quickLogin } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isOverflowCompact, setIsOverflowCompact] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const headerInnerRef = useRef<HTMLDivElement>(null);
  const requiredInlineWidthRef = useRef<number>(0);

  // Close open popovers/menus on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowCityMenu(false);
        setShowMoreMenu(false);
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCityMenu(false);
        setShowMoreMenu(false);
        setShowUserMenu(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dynamically collapse inline navigation to mobile/tablet menu if space tightens (prevents any overlap at all widths/zooms)
  const evaluateNavbarFit = useCallback(() => {
    const inner = headerInnerRef.current;
    if (!inner) return;

    if (window.innerWidth < 1280) {
      if (isOverflowCompact) setIsOverflowCompact(false);
      return;
    }

    if (!isOverflowCompact) {
      if (inner.scrollWidth > inner.clientWidth + 1) {
        requiredInlineWidthRef.current = inner.scrollWidth;
        setIsOverflowCompact(true);
      }
    } else if (
      requiredInlineWidthRef.current > 0 &&
      inner.clientWidth >= requiredInlineWidthRef.current + 16
    ) {
      setIsOverflowCompact(false);
    }
  }, [isOverflowCompact]);

  useEffect(() => {
    evaluateNavbarFit();
    const inner = headerInnerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', evaluateNavbarFit);
      return () => window.removeEventListener('resize', evaluateNavbarFit);
    }

    const observer = new ResizeObserver(() => {
      evaluateNavbarFit();
    });
    observer.observe(inner);
    window.addEventListener('resize', evaluateNavbarFit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', evaluateNavbarFit);
    };
  }, [evaluateNavbarFit, user, currentCity]);

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  const primaryNavItems = [
    { id: 'dashboard', label: 'Explore', icon: Compass },
    { id: 'map', label: 'Safety Map', icon: Navigation },
    { id: 'routes', label: 'Travel Tariff', icon: IndianRupee },
    { id: 'services', label: 'Nearby Places', icon: Building2 },
    { id: 'community', label: 'Community', icon: Users },
  ];

  const secondaryNavItems = [
    { id: 'guardian', label: 'AI Assistant', icon: Bot },
    { id: 'fare', label: 'Local Prices', icon: IndianRupee },
    { id: 'alerts', label: 'Scam Alerts', icon: AlertTriangle },
    { id: 'safety', label: 'Safety Index', icon: ShieldCheck },
    { id: 'buddy', label: 'Travel Buddy', icon: Users },
    { id: 'trips', label: 'My Trips', icon: Compass },
    { id: 'vault', label: 'Emergency Vault', icon: Lock },
    { id: 'translator', label: 'Translator', icon: Languages },
  ];

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentTab);

  const scoreColor =
    (safetyScoreData?.score || 75) >= 75
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
      : (safetyScoreData?.score || 75) >= 50
      ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
      : 'text-red-400 bg-red-950/60 border-red-500/40';

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-[100] bg-slate-950/95 backdrop-blur-md border-b border-slate-800"
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          <div
            ref={headerInnerRef}
            className="flex items-center justify-between h-16 gap-3 lg:gap-5 min-w-0"
          >
            {/* 1. LEFT ZONE: Brand Identity & City Selector (never shrinks into nav) */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 whitespace-nowrap">
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-2.5 cursor-pointer flex-shrink-0 text-left"
                onClick={() => {
                  setCurrentTab('landing');
                  setMobileMenuOpen(false);
                }}
                aria-label="YatraGuard Home"
              >
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-sky-500 to-teal-600 rounded-xl shadow-md flex items-center justify-center keep-white flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
                </div>
                <div className="flex-shrink-0">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-none">
                    Yatra<span className="text-amber-400">Guard</span>
                  </span>
                  <p className="text-[10px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                    Travel Safety &amp; Tariffs
                  </p>
                </div>
              </button>

              {/* City Selector (Tablet & Desktop) */}
              <div className="relative hidden md:block flex-shrink-0">
                <button
                  type="button"
                  aria-expanded={showCityMenu}
                  aria-controls="navbar-city-menu"
                  onClick={() => {
                    setShowCityMenu(!showCityMenu);
                    setShowMoreMenu(false);
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
                >
                  <MapPin className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" aria-hidden="true" />
                  <span className="max-w-[84px] truncate">{currentCity?.name || 'City'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
                </button>

                {showCityMenu && (
                  <div
                    id="navbar-city-menu"
                    className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-[110] max-h-72 overflow-y-auto"
                  >
                    <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Supported Destinations
                    </div>
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
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

              {/* Safety Score Quick Pill (Wide 2xl displays only) */}
              {safetyScoreData && (
                <button
                  type="button"
                  onClick={() => setCurrentTab('safety')}
                  className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold cursor-pointer transition-colors flex-shrink-0 ${scoreColor}`}
                  title="View safety score breakdown"
                >
                  <Radio className="w-3 h-3" aria-hidden="true" />
                  <span>{safetyScoreData.score}/100</span>
                </button>
              )}
            </div>

            {/* 2. CENTER ZONE: Primary Desktop Navigation */}
            <nav
              aria-label="Primary"
              className={`${
                isOverflowCompact ? 'hidden' : 'hidden xl:flex'
              } items-center gap-1 flex-shrink-0 whitespace-nowrap`}
            >
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                      isActive
                        ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* More Menu Dropdown */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  aria-expanded={showMoreMenu}
                  aria-controls="navbar-more-menu"
                  onClick={() => {
                    setShowMoreMenu(!showMoreMenu);
                    setShowCityMenu(false);
                    setShowUserMenu(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    isSecondaryActive
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>More</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </button>

                {showMoreMenu && (
                  <div
                    id="navbar-more-menu"
                    className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-[120]"
                  >
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => {
                            setCurrentTab(item.id);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                            isActive
                              ? 'text-amber-400 font-bold bg-slate-800/60'
                              : 'text-slate-300 font-semibold'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                    <div className="border-t border-slate-800 my-1.5" />
                    {openOnboarding && (
                      <button
                        type="button"
                        onClick={() => {
                          openOnboarding();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 text-amber-400 hover:bg-slate-800 font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        <span>Platform Guide</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAboutModalOpen(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 font-semibold"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                      <span>About YatraGuard</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* 3. RIGHT ZONE: Utility, SOS & Auth Controls (never collides with nav) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 whitespace-nowrap">
              {/* Theme Toggle (Dark / Light / System) */}
              <button
                type="button"
                onClick={cycleTheme}
                className="w-9 h-9 sm:w-auto sm:h-10 sm:px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 justify-center flex-shrink-0"
                title={`Theme: ${theme.toUpperCase()} (${resolvedTheme}). Click to switch Light / Dark / System.`}
                aria-label="Switch color theme"
              >
                {theme === 'system' ? (
                  <Monitor className="w-4 h-4 text-sky-400" aria-hidden="true" />
                ) : resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                )}
                <span className="hidden 2xl:inline text-[10px] font-bold uppercase">{theme}</span>
              </button>

              {/* Report Scam Button */}
              {openIncidentModal && (
                <button
                  type="button"
                  onClick={openIncidentModal}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:border-red-700/50 dark:text-red-300 font-bold text-xs transition-colors flex-shrink-0"
                  title="Report a scam or safety incident"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span>Report</span>
                </button>
              )}

              {/* SOS Emergency Button */}
              <button
                id="sos-button"
                type="button"
                onClick={openEmergencyModal}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wide shadow-md transition-colors flex items-center gap-1 sm:gap-1.5 keep-white flex-shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" aria-hidden="true" />
                <span>SOS</span>
              </button>

              {/* User Profile / Auth */}
              {user ? (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    aria-expanded={showUserMenu}
                    aria-controls="navbar-user-menu"
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      setShowCityMenu(false);
                      setShowMoreMenu(false);
                    }}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={resolveMediaUrl(user.avatarUrl)}
                        alt={user.name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-600 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center text-white text-[11px] font-black keep-white flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:inline max-w-[72px] truncate font-bold text-white">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" aria-hidden="true" />
                  </button>

                  {showUserMenu && (
                    <div
                      id="navbar-user-menu"
                      className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-[120] text-xs"
                    >
                      <div className="px-4 py-2.5 border-b border-slate-800">
                        <div className="font-bold text-white text-sm truncate">{user.name}</div>
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
                          type="button"
                          onClick={() => {
                            setCurrentTab('profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-amber-400 font-bold flex items-center gap-2"
                        >
                          <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>My Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('trips');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 font-medium"
                        >
                          <Compass className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                          <span>My Trips</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('vault');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex items-center gap-2 font-medium"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span>Emergency Vault</span>
                        </button>
                        {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTab('admin');
                              setShowUserMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-purple-300 font-bold flex items-center gap-2"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                            <span>Admin Console</span>
                          </button>
                        )}
                      </div>

                      <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 border-t border-slate-800">
                        Quick Switch Role
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          quickLogin('TRAVELER');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Traveler</span>
                        <span className="text-[10px] text-emerald-400 font-bold">User</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          quickLogin('ADMIN');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Admin</span>
                        <span className="text-[10px] text-purple-400 font-bold">Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          quickLogin('MODERATOR');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                      >
                        <span>Moderator</span>
                        <span className="text-[10px] text-blue-400 font-bold">Mod</span>
                      </button>

                      <div className="border-t border-slate-800 mt-1 pt-1">
                        <button
                          type="button"
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    to="/login"
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors inline-flex items-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm transition-colors items-center"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile / Tablet / Overflow Hamburger Menu */}
              <button
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="navbar-mobile-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`${
                  isOverflowCompact ? 'flex' : 'xl:hidden flex'
                } w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 items-center justify-center flex-shrink-0`}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Menu className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Navigation Drawer Panel */}
          {mobileMenuOpen && (
            <nav
              id="navbar-mobile-menu"
              aria-label="Mobile Menu"
              className={`${
                isOverflowCompact ? 'block' : 'xl:hidden'
              } py-4 border-t border-slate-800 space-y-3 max-h-[calc(100dvh-5rem)] overflow-y-auto`}
            >
              {/* Mobile City Selector */}
              <div className="md:hidden flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>City</span>
                </span>
                <select
                  value={currentCity?.id || ''}
                  onChange={(e) => {
                    const found = cities.find((c) => c.id === e.target.value);
                    if (found) setCity(found);
                  }}
                  aria-label="Select destination city"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'landing', label: 'Home', icon: Compass },
                  ...primaryNavItems,
                  ...secondaryNavItems,
                  { id: 'profile', label: 'My Profile', icon: UserIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {openIncidentModal && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openIncidentModal();
                  }}
                  className="md:hidden w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 dark:bg-red-950/60 dark:hover:bg-red-900 dark:border-red-700/50 dark:text-red-300 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <span>Report Scam / Safety Incident</span>
                </button>
              )}

              {!user && (
                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-xs font-black text-slate-950"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* ABOUT MODAL */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-sky-500 to-teal-600 rounded-xl keep-white">
                  <ShieldAlert className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">About YatraGuard</h3>
                  <p className="text-[11px] text-slate-400">Travel Safety &amp; Fare Transparency</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAboutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>YatraGuard</strong> helps travelers check local safety scores, verify fair transportation tariffs, locate 24/7 emergency facilities, and share verified safety reports.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1 text-xs">
                  <IndianRupee className="w-3.5 h-3.5" aria-hidden="true" /> Fair Tariffs
                </div>
                <p className="text-[11px] text-slate-400">Official RTO &amp; union fare benchmarks.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Safety Index
                </div>
                <p className="text-[11px] text-slate-400">Real-time 0–100 area safety scoring.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAboutModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
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
