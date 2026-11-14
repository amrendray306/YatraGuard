import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white pb-16 md:pb-0">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openEmergencyModal={openEmergency}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {/* Landing Page (Section 27) */}
        {currentTab === 'landing' && (
          <div className="space-y-16 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-6">
              {/* Subtle background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-red-600/20 via-blue-600/10 to-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 shadow-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>YatraGuard • AI Travel Safety & Fare Transparency</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400">Production Architecture</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
                Where To Go. How Much To Pay. <br className="hidden sm:inline" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-red-500">
                  How To Stay Safe.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Your AI-powered context-aware guardian answering the four vital questions of any traveler in India:
                Where should I go? Is it safe? How much should transportation cost? Am I being overcharged?
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  id="explore-demo-btn"
                  onClick={() => setCurrentTab('fare')}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Check Local Fares & Overcharging</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Explore Travel Dashboard</span>
                </button>

                <button
                  onClick={() => setCurrentTab('map')}
                  className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <span>Interactive Map</span>
                </button>

                <button
                  onClick={openEmergency}
                  className="px-5 py-3.5 rounded-2xl bg-red-950/80 hover:bg-red-900/80 text-red-300 border border-red-800/80 font-extrabold text-sm transition-all flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Emergency Mode</span>
                </button>
              </div>

              {/* Supported MVP Cities Banner */}
              <div className="pt-8 border-t border-slate-900 max-w-4xl mx-auto">
                <div className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3">
                  Configured Across Major Tourist Destinations & Mountain Corridors:
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-300">
                  {['Manali', 'Haridwar', 'Rishikesh', 'Delhi', 'Mumbai', 'Agra', 'Jaipur', 'Bengaluru', 'Goa', 'Varanasi', 'Dehradun'].map((city) => (
                    <span
                      key={city}
                      onClick={() => setCurrentTab('fare')}
                      className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg hover:border-amber-500/50 cursor-pointer transition-colors"
                    >
                      📍 {city}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Comprehensive Platform Capabilities
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white">
                  Built For Safety, Not Generic Tourism
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    tab: 'fare',
                    icon: IndianRupee,
                    color: 'text-amber-400 bg-amber-500/20',
                    title: 'Local Fare Intelligence & Overcharge Checker',
                    desc: 'Compare regulated taxi, auto, bus, and metro fares across any Indian city with hill terrain and night surcharge adjustments.',
                  },
                  {
                    tab: 'dashboard',
                    icon: ShieldCheck,
                    color: 'text-emerald-400 bg-emerald-500/20',
                    title: 'Transparent Safety Scoring',
                    desc: 'Dynamic 0-100 score engine analyzing nearby police outposts, verified hospital trauma centres, incident density, and night time factors.',
                  },
                  {
                    tab: 'emergency',
                    icon: ShieldAlert,
                    color: 'text-red-400 bg-red-500/20',
                    title: 'One-Tap SOS & Helplines',
                    desc: 'Integrated official Indian helplines (112, 100, 108, 1090/1091, 1363), audio deterrent siren, and WhatsApp live coordinate broadcasting.',
                  },
                  {
                    tab: 'guardian',
                    icon: Bot,
                    color: 'text-indigo-400 bg-indigo-500/20',
                    title: 'AI Travel Guardian',
                    desc: 'Context-grounded assistant answering "Is this taxi fare reasonable?", emergency steps, and itinerary safety without hallucinations.',
                  },
                  {
                    tab: 'routes',
                    icon: Navigation,
                    color: 'text-blue-400 bg-blue-500/20',
                    title: 'Real-Time Route Risk Engine',
                    desc: 'Evaluates Fastest vs Safest vs Balanced routes between your origin and destination, flagging unlit alleys and incident clusters.',
                  },
                  {
                    tab: 'scams',
                    icon: AlertTriangle,
                    color: 'text-amber-400 bg-amber-500/20',
                    title: 'Verified Scam Intelligence',
                    desc: 'Catalog of known touting tricks, fake tickets, marble shop detours, and auto meter manipulation with confidence scores.',
                  },
                ].map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (feat.tab === 'emergency') {
                          openEmergency();
                        } else {
                          setCurrentTab(feat.tab);
                        }
                      }}
                      className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feat.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-extrabold text-base text-white group-hover:text-red-400 transition-colors">
                          {feat.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>

                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1 group-hover:text-white">
                        <span>Launch Feature</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
    </div>
  );
};
