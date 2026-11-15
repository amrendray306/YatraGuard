import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { SafetyPage } from './pages/SafetyPage';
import { ScamsPage } from './pages/ScamsPage';
import { ServicesPage } from './pages/ServicesPage';
import { RouteSafetyModal } from './components/RouteSafetyModal';
import { GuardianPage } from './pages/GuardianPage';
import { TripsPage } from './pages/TripsPage';
import { SharedTripPage } from './pages/SharedTripPage';
import { VaultPage } from './pages/VaultPage';
import { CostsPage } from './pages/CostsPage';
import { FareIntelligencePage } from './pages/FareIntelligencePage';
import { TranslatorPage } from './pages/TranslatorPage';
import { AdminPage } from './pages/AdminPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';
import { AlertsPage } from './pages/AlertsPage';
import { RoutesPage } from './pages/RoutesPage';
import { EmergencyModal } from './components/EmergencyModal';
import { IncidentModal } from './components/IncidentModal';
import { AuthModal } from './components/AuthModal';
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
  User as UserIcon,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check URL query parameters or pathname for direct navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const tab = params.get('tab');
    const path = window.location.pathname;

    if (token) {
      setShareToken(token);
      setCurrentTab('shared_trip');
    } else if (tab) {
      setCurrentTab(tab);
    } else if (path === '/admin' || path === '/admin/login' || path === '/admin/dashboard') {
      setCurrentTab('admin');
    } else if (path === '/profile') {
      setCurrentTab('profile');
    } else if (path === '/community') {
      setCurrentTab('community');
    } else if (path === '/safety/alerts' || path === '/alerts') {
      setCurrentTab('alerts');
    } else if (path === '/safety/map' || path === '/map') {
      setCurrentTab('map');
    } else if (path === '/explore/routes' || path === '/routes') {
      setCurrentTab('routes');
    } else if (path === '/explore/prices' || path === '/prices') {
      setCurrentTab('fare');
    }
  }, []);

  const openEmergency = () => setIsEmergencyOpen(true);
  const closeEmergency = () => setIsEmergencyOpen(false);

  const openIncident = () => setIsIncidentOpen(true);
  const closeIncident = () => setIsIncidentOpen(false);

  const openAuth = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 pb-16 md:pb-0">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openEmergencyModal={openEmergency}
        openAuthModal={openAuth}
        openIncidentModal={openIncident}
      />

      {/* Main Content Router */}
      <main className="flex-1">
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

        {/* City-Wise Local Prices & Benchmarks (Food, Stays, Activities & RTO Tariffs) */}
        {(currentTab === 'fare' || currentTab === 'costs') && <CostsPage />}

        {currentTab === 'safety' && <SafetyPage />}

        {currentTab === 'scams' && <ScamsPage />}

        {currentTab === 'services' && <ServicesPage />}

        {currentTab === 'guardian' && <GuardianPage />}

        {currentTab === 'trips' && <TripsPage />}

        {currentTab === 'vault' && <VaultPage />}

        {currentTab === 'translator' && <TranslatorPage />}

        {/* Travel Community & Travel Buddy Finder */}
        {currentTab === 'community' && <CommunityPage />}

        {/* Dedicated User Profile & Personal Dashboard */}
        {currentTab === 'profile' && (
          <ProfilePage
            setCurrentTab={setCurrentTab}
            openEmergencyModal={openEmergency}
            openAuthModal={openAuth}
          />
        )}

        {/* Dedicated Admin Portal & Dashboard */}
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
      </main>

      {/* Persistent Bottom Navigation for Mobile */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openMoreSheet={() => setIsMoreSheetOpen(true)}
      />

      {/* Mobile "More" Drawer Sheet */}
      {isMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end animate-fade-in">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-extrabold text-sm text-white">All Platform Features</span>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="text-xs text-slate-400 hover:text-white font-bold p-1 touch-min"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {[
                { id: 'landing', label: 'Home Page', icon: Compass },
                { id: 'community', label: 'Community & Buddies', icon: Users },
                { id: 'profile', label: 'My Profile & Vault', icon: UserIcon },
                { id: 'routes', label: 'Safe Routes', icon: Navigation },
                { id: 'scams', label: 'Scam Alerts', icon: AlertTriangle },
                { id: 'services', label: 'Nearby Services', icon: Building2 },
                { id: 'trips', label: 'Trip Sharing', icon: Compass },
                { id: 'vault', label: 'Emergency Vault', icon: Lock },
                { id: 'fare', label: 'Fare Intelligence', icon: IndianRupee },
                { id: 'translator', label: 'Hindi Translator', icon: Languages },
                { id: 'admin', label: 'Admin Portal', icon: ShieldAlert },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMoreSheetOpen(false);
                    }}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-2 text-slate-200 text-left"
                  >
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{item.label}</span>
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
    </div>
  );
};
