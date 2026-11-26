import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Compass,
  AlertTriangle,
  Building2,
  Navigation,
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
  hasSidebar?: boolean;
  onOpenSidebarDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openEmergencyModal,
  openIncidentModal,
  hasSidebar = false,
  onOpenSidebarDrawer,
}) => {
  const { cities, currentCity, setCity, safetyScoreData } = useCity();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [landingMobileMenuOpen, setLandingMobileMenuOpen] = useState(false);
  const [isOverflowCompact, setIsOverflowCompact] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const headerInnerRef = useRef<HTMLDivElement>(null);
  const requiredInlineWidthRef = useRef<number>(0);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowCityMenu(false);
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCityMenu(false);
        setShowUserMenu(false);
        setLandingMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const evaluateNavbarFit = useCallback(() => {
    const inner = headerInnerRef.current;
    if (!inner || hasSidebar) return;

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
  }, [isOverflowCompact, hasSidebar]);

  useEffect(() => {
    evaluateNavbarFit();
    const inner = headerInnerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', evaluateNavbarFit);
      return () => window.removeEventListener('resize', evaluateNavbarFit);
    }
    const observer = new ResizeObserver(() => evaluateNavbarFit());
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

  const landingNavItems = [
    { id: 'dashboard', label: 'Explore', icon: Compass },
    { id: 'map', label: 'Safety Map', icon: Navigation },
    { id: 'routes', label: 'Travel Tariff', icon: IndianRupee },
    { id: 'services', label: 'Nearby Places', icon: Building2 },
    { id: 'buddy', label: 'Travel Buddy', icon: Users },
    { id: 'community', label: 'Community', icon: ShieldCheck },
  ];

  const scoreColor =
    (safetyScoreData?.score || 75) >= 75
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-500/40'
      : (safetyScoreData?.score || 75) >= 50
      ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/60 dark:border-amber-500/40'
      : 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/60 dark:border-red-500/40';

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/90"
    >
      <div className={hasSidebar ? 'px-3 sm:px-6' : 'max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8'}>
        <div
          ref={headerInnerRef}
          className="flex items-center justify-between h-16 gap-3 lg:gap-4 min-w-0"
        >
          {/* 1. LEFT ZONE */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 whitespace-nowrap">
            {/* Sidebar Mobile Drawer Trigger (shown on < lg inside workspace) */}
            {hasSidebar && onOpenSidebarDrawer && (
              <button
                type="button"
                onClick={onOpenSidebarDrawer}
                aria-label="Open navigation menu"
                className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0"
              >
                <Menu className="w-4 h-4" aria-hidden="true" />
              </button>
            )}

            {/* Brand Logo (always shown on Landing, and on < lg in Workspace when desktop sidebar is hidden) */}
            <button
              type="button"
              onClick={() => {
                setCurrentTab('landing');
                setLandingMobileMenuOpen(false);
              }}
              aria-label="YatraGuard Home"
              className={`items-center gap-2 cursor-pointer flex-shrink-0 text-left ${
                hasSidebar ? 'flex lg:hidden' : 'flex'
              }`}
            >
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-sky-600 to-teal-600 rounded-xl shadow-sm flex items-center justify-center keep-white flex-shrink-0">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
              </div>
              <div className="flex-shrink-0">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                  Yatra<span className="text-sky-600 dark:text-sky-400">Guard</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block leading-tight mt-0.5">
                  Travel Safety Platform
                </p>
              </div>
            </button>

            {/* Active City Selector */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                aria-expanded={showCityMenu}
                aria-controls="navbar-city-menu"
                onClick={() => {
                  setShowCityMenu(!showCityMenu);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
              >
                <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" aria-hidden="true" />
                <span className="max-w-[96px] truncate">{currentCity?.name || 'Select City'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
              </button>

              {showCityMenu && (
                <div
                  id="navbar-city-menu"
                  className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-[120] max-h-72 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        currentCity?.id === city.id
                          ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-slate-800/60'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{city.name}</span>
                      <span className="text-[10px] text-slate-400">{city.state}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Safety Score Quick Pill */}
            {safetyScoreData && (
              <button
                type="button"
                onClick={() => setCurrentTab('safety')}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-colors flex-shrink-0 ${scoreColor}`}
                title="View safety score breakdown"
              >
                <Radio className="w-3 h-3" aria-hidden="true" />
                <span>Safety {safetyScoreData.score}/100</span>
              </button>
            )}
          </div>

          {/* 2. CENTER ZONE (Landing Page Primary Navigation only — zero duplication with Sidebar) */}
          {!hasSidebar && (
            <nav
              aria-label="Primary"
              className={`${
                isOverflowCompact ? 'hidden' : 'hidden xl:flex'
              } items-center gap-1 flex-shrink-0 whitespace-nowrap`}
            >
              {landingNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* 3. RIGHT ZONE: Utility, Theme, Report, SOS, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 whitespace-nowrap">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              className="w-9 h-9 sm:w-auto sm:h-9 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 justify-center flex-shrink-0"
              title={`Theme: ${theme.toUpperCase()} (${resolvedTheme}). Click to cycle Light / Dark / System.`}
              aria-label="Switch color theme"
            >
              {theme === 'system' ? (
                <Monitor className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              ) : resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              )}
              <span className="hidden 2xl:inline text-[11px] font-semibold capitalize">{theme}</span>
            </button>

            {/* Report Scam Quick Action */}
            {openIncidentModal && (
              <button
                type="button"
                onClick={openIncidentModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:border-amber-700/50 dark:text-amber-300 font-semibold text-xs transition-colors flex-shrink-0"
                title="Report a scam or safety incident"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report Scam</span>
              </button>
            )}

            {/* SOS Emergency CTA */}
            <button
              id="sos-button"
              type="button"
              onClick={openEmergencyModal}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide shadow-sm transition-colors flex items-center gap-1.5 keep-white flex-shrink-0 yg-press"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-white" aria-hidden="true" />
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
                  }}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={resolveMediaUrl(user.avatarUrl)}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-600 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold keep-white flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[76px] truncate font-semibold text-slate-900 dark:text-white">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" aria-hidden="true" />
                </button>

                {showUserMenu && (
                  <div
                    id="navbar-user-menu"
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-[120] text-xs"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{user.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{user.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-700/40">
                          {user.role}
                        </span>
                        {user.authProvider === 'GOOGLE' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-amber-300 dark:border-slate-700">
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
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                        <span>Profile &amp; Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('trips');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                      >
                        <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                        <span>My Trips</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('vault');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Emergency Vault</span>
                      </button>
                      {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('admin');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-purple-600 dark:text-purple-300 font-semibold flex items-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Admin Console</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors items-center keep-white"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Landing Mobile Menu Button */}
            {!hasSidebar && (
              <button
                type="button"
                aria-expanded={landingMobileMenuOpen}
                aria-controls="landing-mobile-menu"
                onClick={() => setLandingMobileMenuOpen(!landingMobileMenuOpen)}
                className={`${
                  isOverflowCompact ? 'flex' : 'xl:hidden flex'
                } w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 items-center justify-center flex-shrink-0`}
                aria-label="Toggle navigation menu"
              >
                {landingMobileMenuOpen ? (
                  <X className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Menu className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Landing Mobile Menu */}
        {!hasSidebar && landingMobileMenuOpen && (
          <nav
            id="landing-mobile-menu"
            aria-label="Landing Mobile Menu"
            className="xl:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {landingNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrentTab(item.id);
                      setLandingMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
                  >
                    <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
