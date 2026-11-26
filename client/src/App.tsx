import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts & Route Guards
import { AdminRoute } from './components/guards/AdminRoute';
import { ModeratorRoute } from './components/guards/ModeratorRoute';

// Eager Auth & Landing Entry Points for Instant First Paint
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LandingPage } from './pages/LandingPage';

// Core App Shell Components
import { Navbar } from './components/Navbar';
import { Sidebar, NavSectionKey } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { OnboardingModal } from './components/OnboardingModal';
import { EmergencyModal } from './components/EmergencyModal';
import { IncidentModal } from './components/IncidentModal';
import { AuthModal } from './components/AuthModal';

function lazyNamed<T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string
) {
  return lazy(() => loader().then((m) => ({ default: m[exportName] as T })));
}

// Lazy-loaded Admin Portal Pages
const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const AdminUsersPage = lazyNamed(() => import('./pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminModeratorsPage = lazyNamed(() => import('./pages/admin/AdminModeratorsPage'), 'AdminModeratorsPage');
const AdminIncidentsPage = lazyNamed(() => import('./pages/admin/AdminIncidentsPage'), 'AdminIncidentsPage');
const AdminCommunityPage = lazyNamed(() => import('./pages/admin/AdminCommunityPage'), 'AdminCommunityPage');
const AdminDestinationsPage = lazyNamed(() => import('./pages/admin/AdminDestinationsPage'), 'AdminDestinationsPage');
const AdminPricesPage = lazyNamed(() => import('./pages/admin/AdminPricesPage'), 'AdminPricesPage');
const AdminAnalyticsPage = lazyNamed(() => import('./pages/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const AdminAuditLogsPage = lazyNamed(() => import('./pages/admin/AdminAuditLogsPage'), 'AdminAuditLogsPage');
const AdminSettingsPage = lazyNamed(() => import('./pages/admin/AdminSettingsPage'), 'AdminSettingsPage');

// Lazy-loaded Moderator Portal Pages
const ModeratorDashboard = lazyNamed(() => import('./pages/moderator/ModeratorDashboard'), 'ModeratorDashboard');
const ModeratorReportsPage = lazyNamed(() => import('./pages/moderator/ModeratorReportsPage'), 'ModeratorReportsPage');
const ModeratorCommunityPage = lazyNamed(() => import('./pages/moderator/ModeratorCommunityPage'), 'ModeratorCommunityPage');
const ModeratorPricesPage = lazyNamed(() => import('./pages/moderator/ModeratorPricesPage'), 'ModeratorPricesPage');
const ModeratorComplaintsPage = lazyNamed(() => import('./pages/moderator/ModeratorComplaintsPage'), 'ModeratorComplaintsPage');
const ModeratorHistoryPage = lazyNamed(() => import('./pages/moderator/ModeratorHistoryPage'), 'ModeratorHistoryPage');
const ModeratorProfilePage = lazyNamed(() => import('./pages/moderator/ModeratorProfilePage'), 'ModeratorProfilePage');

// Lazy-loaded User Feature Pages
const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const MapPage = lazyNamed(() => import('./pages/MapPage'), 'MapPage');
const SafetyPage = lazyNamed(() => import('./pages/SafetyPage'), 'SafetyPage');
const ScamsPage = lazyNamed(() => import('./pages/ScamsPage'), 'ScamsPage');
const NearbyPlacesPage = lazyNamed(() => import('./pages/NearbyPlacesPage'), 'NearbyPlacesPage');
const GuardianPage = lazyNamed(() => import('./pages/GuardianPage'), 'GuardianPage');
const TripsPage = lazyNamed(() => import('./pages/TripsPage'), 'TripsPage');
const ExpensesPage = lazyNamed(() => import('./pages/ExpensesPage'), 'ExpensesPage');
const WeatherPage = lazyNamed(() => import('./pages/WeatherPage'), 'WeatherPage');
const OfflineEmergencyPage = lazyNamed(() => import('./pages/OfflineEmergencyPage'), 'OfflineEmergencyPage');
const WomenSafetyPage = lazyNamed(() => import('./pages/WomenSafetyPage'), 'WomenSafetyPage');
const LostFoundPage = lazyNamed(() => import('./pages/LostFoundPage'), 'LostFoundPage');
const RoadCrowdPage = lazyNamed(() => import('./pages/RoadCrowdPage'), 'RoadCrowdPage');
const SharedTripPage = lazyNamed(() => import('./pages/SharedTripPage'), 'SharedTripPage');
const VaultPage = lazyNamed(() => import('./pages/VaultPage'), 'VaultPage');
const CostsPage = lazyNamed(() => import('./pages/CostsPage'), 'CostsPage');
const TranslatorPage = lazyNamed(() => import('./pages/TranslatorPage'), 'TranslatorPage');
const AdminPage = lazyNamed(() => import('./pages/AdminPage'), 'AdminPage');
const CommunityPage = lazyNamed(() => import('./pages/CommunityPage'), 'CommunityPage');
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage'), 'ProfilePage');
const AlertsPage = lazyNamed(() => import('./pages/AlertsPage'), 'AlertsPage');
const RoutesPage = lazyNamed(() => import('./pages/RoutesPage'), 'RoutesPage');
const TravelBuddyPage = lazyNamed(() => import('./pages/TravelBuddyPage'), 'TravelBuddyPage');

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading module...</p>
    </div>
  </div>
);

import {
  ShieldAlert,
  Compass,
  Navigation,
  Bot,
  AlertTriangle,
  Building2,
  Lock,
  Languages,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  CloudSun,
  WifiOff,
  PackageSearch,
  User as UserIcon,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [profileSubSection, setProfileSubSection] = useState<'OVERVIEW' | 'SETTINGS'>('OVERVIEW');
  const [communitySubSection, setCommunitySubSection] = useState<'POSTS' | 'HIGHLIGHTS'>('POSTS');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yatraguard_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [shareToken, setShareToken] = useState<string | null>(null);

  const location = useLocation();

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yatraguard_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!isMoreSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreSheetOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMoreSheetOpen]);

  // Update SPA document title cleanly per active view (WCAG 2.4.2)
  useEffect(() => {
    const titles: Record<string, string> = {
      landing: 'YatraGuard | Intelligent Travel Safety & Fare Transparency',
      dashboard: 'Explore Dashboard | YatraGuard',
      map: 'Interactive Safety Map | YatraGuard',
      routes: 'Travel Tariff & Route Planner | YatraGuard',
      services: 'Nearby Places & Emergency Services | YatraGuard',
      buddy: 'Travel Buddy Matching | YatraGuard',
      alerts: 'Scam & Safety Reports | YatraGuard',
      safety: 'Emergency Services & Safety Index | YatraGuard',
      community: 'Travel Community | YatraGuard',
      profile: profileSubSection === 'SETTINGS' ? 'Account Settings | YatraGuard' : 'My Profile | YatraGuard',
      guardian: 'AI Travel Assistant | YatraGuard',
      fare: 'Local Price Benchmarks | YatraGuard',
      trips: 'Smart Trip Planner | YatraGuard',
      expenses: 'Travel Expense Tracker | YatraGuard',
      weather: 'Weather Intelligence | YatraGuard',
      'women-safety': 'Women Traveller Safety | YatraGuard',
      'offline-emergency': 'Offline Emergency Mode | YatraGuard',
      'road-crowd': 'Crowd & Road Intelligence | YatraGuard',
      'lost-found': 'Lost & Found Hub | YatraGuard',
      vault: 'Travel Document Vault | YatraGuard',
      translator: 'Language Assistant | YatraGuard',
    };
    document.title = titles[currentTab] || 'YatraGuard | Travel Safety Platform';
  }, [currentTab, profileSubSection]);

  // Show onboarding on first launch if not yet completed
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('yatraguard_onboarding_completed');
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setIsOnboardingOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync tab with pathname on URL navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const tab = params.get('tab');
    const path = location.pathname;

    if (token) {
      setShareToken(token);
      setCurrentTab('shared_trip');
    } else if (tab) {
      setCurrentTab(tab);
    } else if (path === '/profile') {
      setCurrentTab('profile');
    } else if (path === '/community') {
      setCurrentTab('community');
    } else if (path === '/buddy' || path === '/travel-buddy') {
      setCurrentTab('buddy');
    } else if (
      path === '/services' ||
      path === '/nearby-services' ||
      path === '/nearby' ||
      path === '/places' ||
      path === '/nearby-places'
    ) {
      setCurrentTab('services');
    } else if (path === '/assistant' || path === '/guardian') {
      setCurrentTab('guardian');
    } else if (path === '/trips' || path === '/my-trips' || path === '/planner') {
      setCurrentTab('trips');
    } else if (path === '/expenses' || path === '/expense-tracker') {
      setCurrentTab('expenses');
    } else if (path === '/weather') {
      setCurrentTab('weather');
    } else if (path === '/women-safety') {
      setCurrentTab('women-safety');
    } else if (path === '/offline-emergency') {
      setCurrentTab('offline-emergency');
    } else if (path === '/road-crowd') {
      setCurrentTab('road-crowd');
    } else if (path === '/lost-found') {
      setCurrentTab('lost-found');
    } else if (path === '/vault' || path === '/documents') {
      setCurrentTab('vault');
    } else if (path === '/emergency') {
      setIsEmergencyOpen(true);
    } else if (path === '/safety/alerts' || path === '/alerts') {
      setCurrentTab('alerts');
    } else if (path === '/safety/map' || path === '/map') {
      setCurrentTab('map');
    } else if (path === '/explore/routes' || path === '/routes' || path === '/tariffs' || path === '/travel-tariff') {
      setCurrentTab('routes');
    } else if (path === '/explore/prices' || path === '/prices') {
      setCurrentTab('fare');
    } else if (path === '/explore' || path === '/dashboard') {
      setCurrentTab('dashboard');
    }
  }, [location.pathname, location.search]);

  const openEmergency = () => setIsEmergencyOpen(true);
  const closeEmergency = () => setIsEmergencyOpen(false);

  const openIncident = () => setIsIncidentOpen(true);
  const closeIncident = () => setIsIncidentOpen(false);

  const openAuth = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* ========================================= */}
      {/* 0. UNIFIED AUTHENTICATION ROUTES          */}
      {/* ========================================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Legacy / Direct Role Login Redirects to Unified Login */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/moderator/login" element={<Navigate to="/login" replace />} />
      <Route path="/user/login" element={<Navigate to="/login" replace />} />
      <Route path="/user" element={<Navigate to="/dashboard" replace />} />

      {/* ========================================= */}
      {/* 1. ADMIN ENVIRONMENT ROUTES              */}
      {/* ========================================= */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/moderators" element={<AdminRoute><AdminModeratorsPage /></AdminRoute>} />
      <Route path="/admin/incidents" element={<AdminRoute><AdminIncidentsPage /></AdminRoute>} />
      <Route path="/admin/community" element={<AdminRoute><AdminCommunityPage /></AdminRoute>} />
      <Route path="/admin/destinations" element={<AdminRoute><AdminDestinationsPage /></AdminRoute>} />
      <Route path="/admin/prices" element={<AdminRoute><AdminPricesPage /></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/ai-config" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/api-mgmt" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

      {/* ========================================= */}
      {/* 2. MODERATOR ENVIRONMENT ROUTES          */}
      {/* ========================================= */}
      <Route path="/moderator" element={<Navigate to="/moderator/dashboard" replace />} />
      <Route path="/moderator/dashboard" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
      <Route path="/moderator/reports" element={<ModeratorRoute><ModeratorReportsPage /></ModeratorRoute>} />
      <Route path="/moderator/community" element={<ModeratorRoute><ModeratorCommunityPage /></ModeratorRoute>} />
      <Route path="/moderator/reported-posts" element={<ModeratorRoute><ModeratorCommunityPage /></ModeratorRoute>} />
      <Route path="/moderator/reported-comments" element={<ModeratorRoute><ModeratorCommunityPage /></ModeratorRoute>} />
      <Route path="/moderator/prices" element={<ModeratorRoute><ModeratorPricesPage /></ModeratorRoute>} />
      <Route path="/moderator/complaints" element={<ModeratorRoute><ModeratorComplaintsPage /></ModeratorRoute>} />
      <Route path="/moderator/history" element={<ModeratorRoute><ModeratorHistoryPage /></ModeratorRoute>} />
      <Route path="/moderator/notifications" element={<ModeratorRoute><ModeratorDashboard /></ModeratorRoute>} />
      <Route path="/moderator/profile" element={<ModeratorRoute><ModeratorProfilePage /></ModeratorRoute>} />

      {/* ========================================= */}
      {/* 3. USER ENVIRONMENT (CATCH-ALL SPA)      */}
      {/* ========================================= */}
      <Route
        path="*"
        element={(() => {
          const hasSidebar = currentTab !== 'landing';
          const handleSidebarNav = (key: NavSectionKey) => {
            if (key === 'settings') {
              setProfileSubSection('SETTINGS');
              setCurrentTab('profile');
            } else if (key === 'profile') {
              setProfileSubSection('OVERVIEW');
              setCurrentTab('profile');
            } else if (key === 'highlights') {
              setCommunitySubSection('HIGHLIGHTS');
              setCurrentTab('community');
            } else if (key === 'community') {
              setCommunitySubSection('POSTS');
              setCurrentTab('community');
            } else {
              setCurrentTab(key);
            }
          };

          return (
            <div
              className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 selection:bg-sky-600 selection:text-white ${
                currentTab === 'map' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen pb-16 md:pb-0'
              }`}
            >
              {/* Skip Link for Keyboard & Screen Reader Users */}
              <a
                href="#main-content"
                className="visually-hidden fixed top-3 left-3 z-[300] px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-lg keep-white"
              >
                Skip to main content
              </a>

              {/* Collapsible Workspace Sidebar (shown on all app pages; Drawer on < lg) */}
              {hasSidebar && (
                <Sidebar
                  currentTab={currentTab}
                  activeSubSection={
                    currentTab === 'profile'
                      ? profileSubSection === 'SETTINGS'
                        ? 'SETTINGS'
                        : 'PROFILE'
                      : currentTab === 'community'
                      ? communitySubSection === 'HIGHLIGHTS'
                        ? 'HIGHLIGHTS'
                        : 'COMMUNITY'
                      : undefined
                  }
                  onSelectNav={handleSidebarNav}
                  openEmergencyModal={openEmergency}
                  collapsed={sidebarCollapsed}
                  onToggleCollapse={toggleSidebarCollapsed}
                  mobileOpen={isSidebarDrawerOpen}
                  onCloseMobile={() => setIsSidebarDrawerOpen(false)}
                />
              )}

              <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navbar */}
                <Navbar
                  currentTab={currentTab}
                  setCurrentTab={setCurrentTab}
                  openEmergencyModal={openEmergency}
                  openAuthModal={openAuth}
                  openIncidentModal={openIncident}
                  openOnboarding={() => setIsOnboardingOpen(true)}
                  hasSidebar={hasSidebar}
                  onOpenSidebarDrawer={() => setIsSidebarDrawerOpen(true)}
                />

                {/* Main Content Router */}
                <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 focus:outline-none">
                  <Suspense fallback={<RouteFallback />}>
                  {/* Landing Page */}
                  {currentTab === 'landing' && (
                    <LandingPage
                      setCurrentTab={setCurrentTab}
                      openEmergencyModal={openEmergency}
                      openAuthModal={openAuth}
                      openIncidentModal={openIncident}
                    />
                  )}

                  {/* Primary Screen Views */}
                  {currentTab === 'dashboard' && (
                    <Dashboard
                      setCurrentTab={setCurrentTab}
                      openEmergencyModal={openEmergency}
                      openIncidentModal={openIncident}
                    />
                  )}

                  {currentTab === 'map' && (
                    <MapPage
                      openEmergencyModal={openEmergency}
                      openIncidentModal={openIncident}
                      setCurrentTab={setCurrentTab}
                    />
                  )}

                  {/* Real-Time Community Scam & Safety Alert Feed (/safety/alerts) */}
                  {currentTab === 'alerts' && (
                    <AlertsPage
                      onOpenReportModal={openIncident}
                      onNavigateToMap={() => setCurrentTab('map')}
                    />
                  )}

                  {/* Real Route-Wise Price Intelligence & Comparison (/explore/routes) */}
                  {currentTab === 'routes' && (
                    <RoutesPage
                      onNavigateToMap={() => setCurrentTab('map')}
                    />
                  )}

                  {/* City-Wise Local Prices & Benchmarks */}
                  {(currentTab === 'fare' || currentTab === 'costs') && <CostsPage />}

                  {currentTab === 'safety' && <SafetyPage />}

                  {currentTab === 'scams' && <ScamsPage />}

                  {(currentTab === 'services' || currentTab === 'nearby' || currentTab === 'places') && (
                    <NearbyPlacesPage openEmergencyModal={openEmergency} />
                  )}

                  {currentTab === 'guardian' && <GuardianPage />}

                  {currentTab === 'trips' && <TripsPage />}

                  {currentTab === 'expenses' && <ExpensesPage />}

                  {currentTab === 'weather' && (
                    <WeatherPage
                      onNavigateToAlerts={() => setCurrentTab('alerts')}
                      onNavigateToTrips={() => setCurrentTab('trips')}
                    />
                  )}

                  {currentTab === 'women-safety' && (
                    <WomenSafetyPage
                      openEmergencyModal={openEmergency}
                      openIncidentModal={openIncident}
                    />
                  )}

                  {currentTab === 'offline-emergency' && <OfflineEmergencyPage />}

                  {currentTab === 'road-crowd' && <RoadCrowdPage />}

                  {currentTab === 'lost-found' && <LostFoundPage />}

                  {currentTab === 'vault' && <VaultPage />}

                  {currentTab === 'translator' && <TranslatorPage />}

                  {/* Travel Community */}
                  {currentTab === 'community' && (
                    <CommunityPage key={communitySubSection} initialView={communitySubSection} />
                  )}

                  {/* Dedicated Travel Buddy Exploration & Connections */}
                  {currentTab === 'buddy' && <TravelBuddyPage />}

                  {/* Dedicated User Profile & Personal Dashboard */}
                  {currentTab === 'profile' && (
                    <ProfilePage
                      key={profileSubSection}
                      initialSection={profileSubSection}
                      setCurrentTab={setCurrentTab}
                      openEmergencyModal={openEmergency}
                      openAuthModal={openAuth}
                    />
                  )}

                  {/* Legacy Tab Admin Fallback */}
                  {currentTab === 'admin' && <AdminPage />}

                  {currentTab === 'shared_trip' && shareToken && (
                    <SharedTripPage
                      token={shareToken}
                      onBack={() => {
                        setShareToken(null);
                        setCurrentTab('dashboard');
                      }}
                    />
                  )}
                  </Suspense>
                </main>
              </div>

              {/* Persistent Bottom Navigation for Mobile */}
              <MobileNav
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                openMoreSheet={() => setIsMoreSheetOpen(true)}
              />

              {/* Mobile "More" Drawer Sheet */}
              {isMoreSheetOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="All platform features"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setIsMoreSheetOpen(false);
                  }}
                  className="md:hidden fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-sm flex flex-col justify-end"
                >
                  <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 max-h-[85dvh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">All Platform Features</span>
                      <button
                        type="button"
                        onClick={() => setIsMoreSheetOpen(false)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold px-3 py-1.5 rounded-xl touch-min flex items-center justify-center"
                      >
                        Close
                      </button>
                    </div>

                    {/* Urgent Mobile Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreSheetOpen(false);
                          openEmergency();
                        }}
                        className="p-3 rounded-2xl bg-red-600 text-white flex items-center justify-center gap-2 keep-white shadow-sm min-h-[44px]"
                      >
                        <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                        <span>SOS Emergency</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreSheetOpen(false);
                          openIncident();
                        }}
                        className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                        <span>Report Scam</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      {[
                        { id: 'landing', label: 'Home', icon: Compass },
                        { id: 'routes', label: 'Travel Tariff', icon: IndianRupee },
                        { id: 'fare', label: 'Local Prices', icon: IndianRupee },
                        { id: 'services', label: 'Nearby Places', icon: Building2 },
                        { id: 'buddy', label: 'Travel Buddy', icon: Users },
                        { id: 'alerts', label: 'Risk & Scam Alerts', icon: AlertTriangle },
                        { id: 'weather', label: 'Weather Forecast', icon: CloudSun },
                        { id: 'women-safety', label: 'Women Safety', icon: ShieldCheck },
                        { id: 'offline-emergency', label: 'Offline Emergency', icon: WifiOff },
                        { id: 'road-crowd', label: 'Crowd & Road Intel', icon: Navigation },
                        { id: 'lost-found', label: 'Lost & Found', icon: PackageSearch },
                        { id: 'safety', label: 'Emergency Services', icon: ShieldCheck },
                        { id: 'guardian', label: 'AI Assistant', icon: Bot },
                        { id: 'community', label: 'Travel Community', icon: Users },
                        { id: 'trips', label: 'Trip Planner', icon: Compass },
                        { id: 'expenses', label: 'Expense Tracker', icon: IndianRupee },
                        { id: 'vault', label: 'Emergency Vault', icon: Lock },
                        { id: 'translator', label: 'Translator', icon: Languages },
                        { id: 'profile', label: 'Profile & Settings', icon: UserIcon },
                        { id: 'admin', label: 'Admin Portal', icon: ShieldAlert },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCurrentTab(item.id);
                              setIsMoreSheetOpen(false);
                            }}
                            className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 text-left min-h-[44px]"
                          >
                            <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Modal Dialog */}
              <EmergencyModal isOpen={isEmergencyOpen} onClose={closeEmergency} />

              {/* Crowdsourced Incident Submission Modal Dialog */}
              <IncidentModal isOpen={isIncidentOpen} onClose={closeIncident} />

              {/* User Authentication & Onboarding Modal (Google OAuth & Email/Password) */}
              <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                initialMode={authMode}
              />

              {/* First-Time User Interactive Onboarding Guided Walkthrough */}
              <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
                onNavigateToTab={(tab) => {
                  setCurrentTab(tab);
                  setIsOnboardingOpen(false);
                }}
              />
            </div>
          );
        })()}
      />
    </Routes>
    </Suspense>
  );
};
