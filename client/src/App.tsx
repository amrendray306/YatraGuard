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
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check URL query parameters for direct shared trip links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const tab = params.get('tab');
    if (token) {
      setShareToken(token);
      setCurrentTab('shared_trip');
    } else if (tab) {
      setCurrentTab(tab);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white pb-16 md:pb-0">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openEmergencyModal={openEmergency}
        openAuthModal={openAuth}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {/* Landing Page */}
        {currentTab === 'landing' && (
          <LandingPage
            setCurrentTab={setCurrentTab}
            openEmergencyModal={openEmergency}
            openAuthModal={openAuth}
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

        {currentTab === 'safety' && <SafetyPage />}

        {currentTab === 'scams' && <ScamsPage />}

        {currentTab === 'services' && <ServicesPage />}

        {currentTab === 'routes' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-16">
            <RouteSafetyModal />
          </div>
        )}

        {currentTab === 'guardian' && <GuardianPage />}

        {currentTab === 'trips' && <TripsPage />}

        {currentTab === 'vault' && <VaultPage />}

        {(currentTab === 'fare' || currentTab === 'costs') && <FareIntelligencePage />}

        {currentTab === 'translator' && <TranslatorPage />}

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
                { id: 'routes', label: 'Safe Routes', icon: Navigation },
                { id: 'scams', label: 'Scam Alerts', icon: AlertTriangle },
                { id: 'services', label: 'Nearby Services', icon: Building2 },
                { id: 'trips', label: 'Trip Sharing', icon: Compass },
                { id: 'vault', label: 'Emergency Vault', icon: Lock },
                { id: 'costs', label: 'Travel Costs', icon: IndianRupee },
                { id: 'translator', label: 'Hindi Translator', icon: Languages },
                { id: 'admin', label: 'Admin Console', icon: ShieldAlert },
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
                    <Icon className="w-4 h-4 text-red-400" />
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
