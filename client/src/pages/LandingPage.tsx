import React, { useState } from 'react';
import {
  ShieldAlert,
  Compass,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Navigation,
  Bot,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Search,
  CheckCircle2,
  Users,
  Shield,
  Star,
  ExternalLink,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  setCurrentTab,
  openEmergencyModal,
  openAuthModal,
}) => {
  const { cities, setCity } = useCity();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const featuredDestinations = [
    {
      id: 'manali',
      name: 'Manali',
      state: 'Himachal Pradesh',
      tag: 'Mountain Corridor',
      safetyScore: 88,
      fareType: 'Hill Surcharge 25%',
      image:
        'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'jaipur',
      name: 'Jaipur',
      state: 'Rajasthan',
      tag: 'Heritage Circuit',
      safetyScore: 82,
      fareType: 'Prepaid Auto / Cab Booths',
      image:
        'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'goa',
      name: 'Goa',
      state: 'Goa',
      tag: 'Coastal Transit',
      safetyScore: 84,
      fareType: 'GoaMiles / App Meter',
      image:
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'rishikesh',
      name: 'Rishikesh',
      state: 'Uttarakhand',
      tag: 'Pilgrim & Adventure',
      safetyScore: 89,
      fareType: 'Shared Jeeps & E-Rickshaws',
      image:
        'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'varanasi',
      name: 'Varanasi',
      state: 'Uttar Pradesh',
      tag: 'Ancient Cultural Hub',
      safetyScore: 78,
      fareType: 'Standard Auto Rickshaws',
      image:
        'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'agra',
      name: 'Agra',
      state: 'Uttar Pradesh',
      tag: 'Taj Heritage Zone',
      safetyScore: 75,
      fareType: 'UP Police Prepaid Counter',
      image:
        'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const filteredDestinations = featuredDestinations.filter(
    (dest) =>
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDestination = (cityName: string) => {
    const matched = cities.find(
      (c) => c.name.toLowerCase() === cityName.toLowerCase()
    );
    if (matched) {
      setCity(matched);
    }
    setCurrentTab('dashboard');
  };

  return (
    <div className="space-y-20 pb-24 text-slate-100">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-amber-500/15 via-red-600/10 to-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-200 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>YatraGuard • AI Travel Intelligence & Safety Platform</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-extrabold">Production Ready</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]">
            Explore India Confidently.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-red-500">
              Fair Fares. Zero Scams. Safe Travel.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Stop guessing taxi fares, avoid tout overcharging, and navigate unfamiliar cities with real-time safety scores, RTO transit tariffs, and 24/7 AI protection.
          </p>

          {/* Destination Search Bar */}
          <div className="max-w-2xl mx-auto pt-3">
            <div className="relative flex items-center bg-slate-900/95 border border-slate-700/90 rounded-2xl p-2 shadow-2xl focus-within:border-amber-400/80 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
              <Search className="w-5 h-5 text-amber-400 ml-3 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where are you traveling in India? (e.g. Manali, Goa, Jaipur, Agra, Varanasi)..."
                className="w-full bg-transparent border-none text-white text-sm sm:text-base placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (filteredDestinations.length > 0) {
                    handleSelectDestination(filteredDestinations[0].name);
                  } else {
                    setCurrentTab('dashboard');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Destination Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 text-xs">
              <span className="text-slate-400 font-medium mr-1">Popular:</span>
              {['Manali', 'Goa', 'Jaipur', 'Rishikesh', 'Agra', 'Varanasi', 'Delhi'].map(
                (city) => (
                  <button
                    key={city}
                    onClick={() => handleSelectDestination(city)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 font-semibold transition-colors"
                  >
                    📍 {city}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setCurrentTab('fare')}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-900/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Audit Transit Fare & Overcharge</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Open Travel Dashboard</span>
            </button>

            {!user ? (
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2"
              >
                <span>Create Free Account</span>
              </button>
            ) : null}

            <button
              onClick={openEmergencyModal}
              className="px-5 py-3.5 rounded-2xl bg-red-950/80 hover:bg-red-900/80 text-red-300 border border-red-800/80 font-extrabold text-sm transition-all flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. THREE-STEP WORKFLOW CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            How YatraGuard Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Travel Prepared in Three Simple Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative group hover:border-amber-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg mb-4">
              01
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Select Your Destination</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Search any Indian tourist hub, mountain corridor, or metropolitan circuit. Instant loading of local infrastructure, police coverage, and weather alerts.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative group hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg mb-4">
              02
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Verify Regulated Fare & Safety</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Input taxi or auto quotes to detect driver overcharging against official RTO rate charts with night and hill terrain adjustments before stepping in.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative group hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg mb-4">
              03
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Travel with 24/7 AI Guardian</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Stay safeguarded with context-grounded AI recommendations, known scam shields, safe night routes, and 1-tap encrypted emergency SOS broadcasts.
            </p>
          </div>
        </div>
      </section>

      {/* 3. FEATURED DESTINATIONS PHOTOGRAPHY CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              Live Tourist Circuits
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">
              Popular Indian Destinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Click any destination to load instant safety ratings, transit tariffs, and local intelligence.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('map')}
            className="text-xs sm:text-sm text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View Interactive Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              onClick={() => handleSelectDestination(dest.name)}
              className="group relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 hover:border-amber-500/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Destination Image */}
              <div className="h-52 w-full overflow-hidden relative">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Score badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Safety: {dest.safetyScore}/100</span>
                </div>

                {/* Tag */}
                <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide">
                  {dest.tag}
                </div>
              </div>

              {/* Destination Info */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">
                      {dest.name}
                    </h3>
                    <p className="text-xs text-slate-400">{dest.state}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                    <span>{dest.fareType}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Verified RTO Data
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLATFORM CAPABILITIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Intelligent Core Systems
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Everything You Need For Safe Travel in India
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fare Calculator Card */}
          <div
            onClick={() => setCurrentTab('fare')}
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <IndianRupee className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                RTO Fare Calculator & Overcharge Detector
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Compare official base tariffs for Auto-rickshaws, Taxis, Metro, and Buses across Indian cities with automatic hill terrain and midnight surcharge multipliers.
              </p>
            </div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Calculate Transit Fare</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Safety Scoring Card */}
          <div
            onClick={() => setCurrentTab('safety')}
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                Bayesian Safety Index & Live Outposts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Granular 0–100 safety score synthesized from nearest tourist police stations, verified trauma hospitals, verified street lighting, and night footfall factors.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>View Safety Metrics</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Scam Radar Card */}
          <div
            onClick={() => setCurrentTab('scams')}
            className="bg-slate-900/90 border border-slate-800 hover:border-red-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                Verified Tourist Scam Radar
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Crowd-verified intelligence on active scams: fake prepaid counter touts, mandatory gem shop detours, altered taxi meters, and closed monument rumors.
              </p>
            </div>
            <div className="text-xs font-bold text-red-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Inspect Scam Traps</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Safe Route Planning */}
          <div
            onClick={() => setCurrentTab('routes')}
            className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">
                Safest Path vs Fastest Path Routing
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Multi-criteria routing algorithm prioritizing illuminated arterial roads, active police surveillance corridors, and verified transit hubs over dimly-lit shortcuts.
              </p>
            </div>
            <div className="text-xs font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Plan Safe Route</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* AI Travel Guardian */}
          <div
            onClick={() => setCurrentTab('guardian')}
            className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">
                YatraGuard AI Assistant
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Context-aware conversational guardian. Ask "How much is an auto from Agra Cantt to Taj Mahal?", get emergency steps, or verify local cultural etiquette in real time.
              </p>
            </div>
            <div className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Chat with AI Guardian</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Emergency Vault */}
          <div
            onClick={() => setCurrentTab('vault')}
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                Offline Emergency Document Vault
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                AES-256 client-encrypted storage for passports, travel insurance, medical blood group cards, and guardian contacts accessible offline without cell service.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Open Vault</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. EMERGENCY SERVICES BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-red-950/70 border border-red-500/40 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/60 border border-red-700/60 text-xs font-bold text-red-200">
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>Official Indian Helplines Integrated</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Instant Emergency Response Whenever You Need It
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Connect directly with 112 (National Emergency), 108 (Ambulance), 1090 (Women Safety), and 1363 (Tourist Helpline) with 1-tap live GPS broadcast.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={openEmergencyModal}
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-950/60 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all animate-pulse"
            >
              <ShieldAlert className="w-5 h-5" />
              <span>TRIGGER SOS MODAL</span>
            </button>
            <a
              href="tel:112"
              className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-colors flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Call 112 Directly</span>
            </a>
          </div>
        </div>
      </section>

      {/* 6. TRUST & CREDIBILITY METRICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 pt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-amber-400">11+</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Major Indian Cities Covered
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">100%</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Regulated RTO Tariffs
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-indigo-400">0–100</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Transparent Safety Index
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-rose-400">24/7</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Emergency SOS Response
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-800/80 pt-12 pb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm">
                Yatra<span className="text-amber-400">Guard</span>
              </span>
              <p className="text-[11px] text-slate-500">
                AI-Powered Context-Aware Travel Safety & Transportation Fare Intelligence
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('fare')}
              className="hover:text-white transition-colors"
            >
              Fare Intelligence
            </button>
            <button
              onClick={() => setCurrentTab('safety')}
              className="hover:text-white transition-colors"
            >
              Safety Scores
            </button>
            <button
              onClick={() => setCurrentTab('scams')}
              className="hover:text-white transition-colors"
            >
              Scam Radar
            </button>
            <button
              onClick={() => setCurrentTab('services')}
              className="hover:text-white transition-colors"
            >
              Nearby Services
            </button>
            <button
              onClick={() => setCurrentTab('guardian')}
              className="hover:text-white transition-colors"
            >
              AI Guardian
            </button>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-500">
            <div>© {new Date().getFullYear()} YatraGuard Platform.</div>
            <div>B.Tech CSE Capstone Project • Production Ready Architecture</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
