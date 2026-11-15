import React, { useState, useEffect } from 'react';
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
  Heart,
  CloudSun,
  Activity,
  HeartPulse,
  Radio,
  FileText,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { fetchCommunityPosts } from '../services/api';
import { FeatureCard } from '../components/cards/FeatureCard';
import { DestinationCard } from '../components/cards/DestinationCard';
import { CommunityPostCard } from '../components/cards/CommunityPostCard';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  openIncidentModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  setCurrentTab,
  openEmergencyModal,
  openAuthModal,
  openIncidentModal,
}) => {
  const { cities, currentCity, setCity, setUserCoords, userAddress, gpsStatus, requestUserLocation } = useCity();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [communityPreview, setCommunityPreview] = useState<any[]>([]);

  // 8 Specific Popular Destinations requested
  const popularDestinations = [
    {
      id: 'manali',
      name: 'Manali',
      state: 'Himachal Pradesh',
      description: 'High-altitude Himalayan resort on Beas River. Gateway to Solang Valley and Atal Tunnel.',
      safetyScore: 86,
      tag: 'Mountain Hub',
      fareType: 'Hill Surcharge 20%',
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'shimla',
      name: 'Shimla',
      state: 'Himachal Pradesh',
      description: 'Queen of the Hills featuring pedestrian Mall Road, The Ridge, and UNESCO toy train.',
      safetyScore: 88,
      tag: 'Colonial Heritage',
      fareType: 'HRTC & Union Cabs',
      image: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'rishikesh',
      name: 'Rishikesh',
      state: 'Uttarakhand',
      description: 'World Yoga Capital and adventure hub. Ram Jhula pedestrian bridges & sacred Ganga Aarti.',
      safetyScore: 89,
      tag: 'Pilgrim & Adventure',
      fareType: 'Shared Jeeps ₹30',
      image: 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'haridwar',
      name: 'Haridwar',
      state: 'Uttarakhand',
      description: 'Holy gateway to the Himalayas. World-renowned evening Ganga Aarti at Har Ki Pauri.',
      safetyScore: 79,
      tag: 'Sacred Gateway',
      fareType: 'Prepaid Taxi Booth',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'jaipur',
      name: 'Jaipur',
      state: 'Rajasthan',
      description: 'The Pink City. Royal Amer Fort, City Palace, Hawa Mahal, and tourist police outposts.',
      safetyScore: 82,
      tag: 'Royal Heritage',
      fareType: 'Prepaid Auto Counter',
      image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'goa',
      name: 'Goa',
      state: 'Goa',
      description: 'Coastal travel paradise. Monitored beach corridors, certified water sports & GoaMiles taxis.',
      safetyScore: 84,
      tag: 'Coastal Transit',
      fareType: 'GoaMiles / App Meter',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'leh',
      name: 'Leh',
      state: 'Ladakh',
      description: 'High-altitude capital of Ladakh at 3,500m. Ancient gompas, Shanti Stupa, and high safety.',
      safetyScore: 89,
      tag: 'Himalayan Frontier',
      fareType: 'Ladakh Union Tariff',
      image: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'dehradun',
      name: 'Dehradun',
      state: 'Uttarakhand',
      description: 'State capital nestled in Doon Valley. Gateway to Mussoorie hills with calm lifestyle.',
      safetyScore: 84,
      tag: 'Valley Hub',
      fareType: 'ISBT City Roadways',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    },
  ];

  useEffect(() => {
    fetchCommunityPosts({ limit: 3 })
      .then((res) => setCommunityPreview(res.posts || []))
      .catch((err) => console.error('Failed to load community preview:', err));
  }, []);

  const handleSelectDestination = (cityName: string) => {
    const matched = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (matched) {
      setCity(matched);
      setUserCoords({ lat: matched.lat, lng: matched.lng });
    }
    setCurrentTab('dashboard');
  };

  const filteredDestinations = popularDestinations.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-24 pb-24 text-slate-100">
      {/* =========================================================================
          A. HERO SECTION: "Explore Freely. Travel Safely."
          ========================================================================= */}
      <section className="relative min-h-[85vh] sm:min-h-[88vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Full-Bleed High Quality Travel Destination Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=2000&q=85"
            alt="Scenic Himalayan Travel Destination"
            className="w-full h-full object-cover object-center scale-105 animate-fade-in"
          />
          {/* Multi-Stop Gradient Overlays for High Legibility */}
          <div className="absolute inset-0 bg-slate-950/75 via-slate-950/80 to-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 pt-12 sm:pt-20">
          {/* Verified Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-xs font-black text-amber-300 shadow-2xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>YatraGuard • AI Context-Aware Travel Safety & Transit Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] drop-shadow-xl">
            Explore Freely.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-red-500">
              Travel Safely.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            AI-powered travel safety, official RTO transit fare intelligence, verified local emergency infrastructure, and trusted community guidance across India.
          </p>

          {/* Destination Search Bar */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center bg-slate-900/95 border border-slate-700 rounded-2xl p-2 shadow-2xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all backdrop-blur-xl">
              <Search className="w-5 h-5 text-amber-400 ml-3 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where are you traveling in India? (e.g. Manali, Shimla, Rishikesh, Goa)..."
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
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Destination Corridor Pills & Location Beacon */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 text-xs">
              <button
                onClick={async () => {
                  const ok = await requestUserLocation(true);
                  if (ok) {
                    setCurrentTab('map');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all mr-1 ${
                  gpsStatus === 'granted'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                    : 'bg-blue-950/80 hover:bg-blue-900/90 text-blue-300 border-blue-700/60'
                }`}
                title="Detect your device GPS coordinates"
              >
                <Navigation className={`w-3 h-3 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
                <span>{gpsStatus === 'granted' ? `GPS: ${userAddress}` : 'Use Current Location'}</span>
              </button>
              <span className="text-slate-400 font-semibold mr-1">Popular Circuits:</span>
              {['Manali', 'Shimla', 'Rishikesh', 'Haridwar', 'Jaipur', 'Goa', 'Leh', 'Dehradun'].map(
                (city) => (
                  <button
                    key={city}
                    onClick={() => handleSelectDestination(city)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 font-bold transition-colors"
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
              onClick={() => setCurrentTab('dashboard')}
              className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Destinations</span>
            </button>

            <button
              onClick={() => setCurrentTab('map')}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2 hover:border-slate-500"
            >
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>View Safety Map</span>
            </button>

            <button
              onClick={() => setCurrentTab('fare')}
              className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2 hover:border-slate-500"
            >
              <IndianRupee className="w-4 h-4 text-amber-400" />
              <span>Local Prices</span>
            </button>

            <button
              onClick={openEmergencyModal}
              className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-950/60 transition-all flex items-center gap-2 animate-pulse"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          B. POPULAR DESTINATIONS (8 Cards: Manali, Shimla, Rishikesh, Haridwar, Jaipur, Goa, Leh, Dehradun)
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Curated Travel Hubs
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">Popular Destinations</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Verified safety infrastructure, regulated RTO taxi tariffs, and trauma emergency coverage.
            </p>
          </div>

          <button
            onClick={() => setCurrentTab('map')}
            className="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Open Interactive Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDestinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              name={dest.name}
              state={dest.state}
              description={dest.description}
              imageUrl={dest.image}
              safetyScore={dest.safetyScore}
              tag={dest.tag}
              fareType={dest.fareType}
              onExplore={() => handleSelectDestination(dest.name)}
              onViewMap={() => {
                handleSelectDestination(dest.name);
                setCurrentTab('map');
              }}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          C. EXPLORE YATRAGUARD FEATURES (10 Cards with Working Navigation)
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Intelligent Protection Suite
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Explore YatraGuard Features
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Every feature is backed by real PostgreSQL databases, verified municipal circulars, and 24/7 AI assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* 1. Travel Safety Score */}
          <FeatureCard
            title="1. Travel Safety Score"
            description="Bayesian 0–100 index combining trauma healthcare proximity, police presence, lighting, and time-of-day risks."
            icon={ShieldCheck}
            badge="Real-time"
            badgeColor="bg-emerald-950 text-emerald-300 border-emerald-800"
            ctaText="View Safety Index"
            onClick={() => setCurrentTab('safety')}
            accentColor="emerald"
          />

          {/* 2. Smart Route Recommendations */}
          <FeatureCard
            title="2. Route Price & Safety"
            description="Compare cheapest, fastest, recommended, and alternative routes with official RTO tariffs and night surcharges."
            icon={Navigation}
            badge="4 Comparison Modes"
            badgeColor="bg-blue-950 text-blue-300 border-blue-800"
            ctaText="Compare Route Prices"
            onClick={() => setCurrentTab('routes')}
            accentColor="blue"
          />

          {/* 3. Nearby Hospitals & Police */}
          <FeatureCard
            title="3. Hospitals & Police"
            description="GPS-filtered directory of verified 24/7 Level-1 trauma centers, tourist police desks, and round-the-clock chemists."
            icon={HeartPulse}
            badge="Verified 24/7"
            badgeColor="bg-red-950 text-red-300 border-red-800"
            ctaText="Find Nearby Care"
            onClick={() => setCurrentTab('services')}
            accentColor="red"
          />

          {/* 4. Local Price Intelligence */}
          <FeatureCard
            title="4. Local Price Intelligence"
            description="City-wise price benchmarks for food, street snacks, hotels, homestays, adventure sports, and entry tickets."
            icon={IndianRupee}
            badge="Anti-Overcharge"
            badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            ctaText="Explore Local Prices"
            onClick={() => setCurrentTab('fare')}
            accentColor="amber"
          />

          {/* 5. AI Travel Assistant */}
          <FeatureCard
            title="5. AI Travel Assistant"
            description="Context-aware conversational guardian. Ask taxi tariff benchmarks, cultural etiquette, or instant emergency actions."
            icon={Bot}
            badge="24/7 Live AI"
            badgeColor="bg-purple-950 text-purple-300 border-purple-800"
            ctaText="Chat with Guardian"
            onClick={() => setCurrentTab('guardian')}
            accentColor="purple"
          />

          {/* 6. Emergency Assistance */}
          <FeatureCard
            title="6. Emergency Assistance"
            description="1-tap SOS priority broadcast alerting family ICE contacts with live GPS coordinates, battery level, and nearest police."
            icon={ShieldAlert}
            badge="Priority SOS"
            badgeColor="bg-red-950 text-red-300 border-red-800"
            ctaText="Trigger SOS Desk"
            onClick={openEmergencyModal}
            accentColor="rose"
          />

          {/* 7. Community Incident Reports */}
          <FeatureCard
            title="7. Scam & Safety Alerts"
            description="Live community scam feed with GPS distance, verification statuses, and one-click incident reporting."
            icon={AlertTriangle}
            badge="Live Vigilance"
            badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            ctaText="View Scam Feed"
            onClick={() => setCurrentTab('alerts')}
            accentColor="amber"
          />

          {/* 8. Weather Information */}
          <FeatureCard
            title="8. Weather Information"
            description="City-specific mountain alerts, monsoon precipitation probabilities, and UV safety guidance before day trips."
            icon={CloudSun}
            badge="Live Met Alerts"
            badgeColor="bg-cyan-950 text-cyan-300 border-cyan-800"
            ctaText="Check City Weather"
            onClick={() => setCurrentTab('dashboard')}
            accentColor="cyan"
          />

          {/* 9. Travel Buddy Finder */}
          <FeatureCard
            title="9. Travel Buddy Finder"
            description="Connect with verified solo travelers, backpackers, and adventure groups heading to the same Himalayan or coastal circuits."
            icon={Users}
            badge="Match & Share"
            badgeColor="bg-indigo-950 text-indigo-300 border-indigo-800"
            ctaText="Find Travel Buddy"
            onClick={() => setCurrentTab('community')}
            accentColor="indigo"
          />

          {/* 10. Travel Community */}
          <FeatureCard
            title="10. Travel Community"
            description="Read firsthand travel experiences, safety tips, and destination recommendations shared by verified travelers."
            icon={MessageSquare}
            badge="Knowledge Hub"
            badgeColor="bg-emerald-950 text-emerald-300 border-emerald-800"
            ctaText="Explore Stories"
            onClick={() => setCurrentTab('community')}
            accentColor="emerald"
          />
        </div>
      </section>

      {/* =========================================================================
          D. HOW YATRAGUARD WORKS (3-Step Simple Process)
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Simple & Transparent
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">How YatraGuard Works</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Three streamlined steps to eliminate travel friction, avoid tout extortion, and travel safely across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {/* Step 1 */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 relative group hover:border-amber-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg mb-4 border border-amber-500/30">
                01
              </div>
              <h3 className="text-base font-black text-white mb-2">1. Search Your Destination</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter any Indian city, hill station, or landmark. Instant loading of nearest tourist police stations, trauma hospitals, and verified RTO transit rates.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 relative group hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg mb-4 border border-emerald-500/30">
                02
              </div>
              <h3 className="text-base font-black text-white mb-2">2. Explore Travel & Safety Data</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Audit taxi quotes against official government tariff rate cards with night and hill adjustments, inspect active scam hotspots, and check crowd levels.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 relative group hover:border-blue-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-lg mb-4 border border-blue-500/30">
                03
              </div>
              <h3 className="text-base font-black text-white mb-2">3. Travel With Better Preparation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Navigate unfamiliar roads with 24/7 AI Guardian assistance, offline encrypted document vault, and 1-tap live emergency SOS broadcasting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          E. TRAVEL COMMUNITY PREVIEW
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Collective Wisdom
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-1">Travel Community Highlights</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real stories, verified operator recommendations, and safety tips from travelers on the ground.
            </p>
          </div>

          <button
            onClick={() => setCurrentTab('community')}
            className="text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View All Stories ({communityPreview.length}+)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {communityPreview.map((post) => (
            <CommunityPostCard
              key={post.id}
              id={post.id}
              authorName={post.user?.name || 'Traveler'}
              authorRole={post.user?.role}
              authorAvatar={post.user?.avatarUrl}
              destinationName={post.destinationName}
              title={post.title}
              content={post.content}
              category={post.category}
              likesCount={post.likesCount}
              commentsCount={post.comments?.length || 0}
              createdAt={new Date(post.createdAt).toLocaleDateString()}
              imageUrl={post.imageUrl}
              onComment={() => setCurrentTab('community')}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          F. SAFETY INFORMATION SECTION
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-red-950/70 border border-red-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/60 border border-red-700/60 text-xs font-bold text-red-200">
                <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                <span>Integrated Government Safety Helplines</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Emergency Assistance & Essential Services
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect directly with 112 (National Emergency), 108 (Trauma Ambulance), 1090 (Women Safety), and 1363 (Tourist Helpline) with instant GPS location broadcasting.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openEmergencyModal}
                className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-950/60 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all animate-pulse"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>TRIGGER SOS EMERGENCY</span>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-red-900/40 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">112 National</span>
              <span className="text-white font-black text-base">All Emergencies</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">108 Medical</span>
              <span className="text-white font-black text-base">Ambulance Service</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">1090 Women Helpline</span>
              <span className="text-white font-black text-base">Women Safety Cell</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">1363 Tourist Helpline</span>
              <span className="text-white font-black text-base">Ministry of Tourism</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          G. FOOTER
          ========================================================================= */}
      <footer className="border-t border-slate-800 pt-16 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-slate-400">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg">
                Yatra<span className="text-amber-400">Guard</span>
              </span>
            </div>
            <p className="leading-relaxed text-slate-400">
              An AI-Powered Context-Aware Travel Safety, Transportation Fare Intelligence, and Emergency Assistance Platform for India.
            </p>
            <div className="text-[11px] text-slate-500">
              Production-Grade Architecture • PostgreSQL & Neon Cloud Grounded
            </div>
          </div>

          {/* Core Features */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Features</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => setCurrentTab('safety')} className="hover:text-amber-400 transition-colors">
                  Travel Safety Score (0-100)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('fare')} className="hover:text-amber-400 transition-colors">
                  RTO Fare Overcharge Audit
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('map')} className="hover:text-amber-400 transition-colors">
                  Interactive Safety Map
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('routes')} className="hover:text-amber-400 transition-colors">
                  Safe Route Planner
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('guardian')} className="hover:text-amber-400 transition-colors">
                  AI Travel Guardian
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('community')} className="hover:text-amber-400 transition-colors">
                  Travel Buddy Finder
                </button>
              </li>
            </ul>
          </div>

          {/* Quick Links & Safety */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Safety & Assistance</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={openEmergencyModal} className="text-red-400 font-bold hover:underline">
                  Emergency SOS Protocol
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('services')} className="hover:text-amber-400 transition-colors">
                  Trauma Hospitals Directory
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('scams')} className="hover:text-amber-400 transition-colors">
                  Verified Scam Intelligence
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('vault')} className="hover:text-amber-400 transition-colors">
                  Offline Encrypted Vault
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('profile')} className="hover:text-amber-400 transition-colors">
                  Personal Travel Profile
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Capstone Info */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Project Info</h4>
            <p className="leading-relaxed text-slate-400">
              Designed as a Senior Full-Stack Engineering Capstone Platform. Built with React, TypeScript, Leaflet, Express, Prisma ORM, and Neon PostgreSQL.
            </p>
            <div className="pt-2 flex items-center gap-3 text-slate-400">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer">Support</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} YatraGuard Platform. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentTab('admin')} className="hover:text-amber-400 font-bold">
              Admin Portal
            </button>
            <span>•</span>
            <button onClick={() => setCurrentTab('community')} className="hover:text-amber-400 font-bold">
              Community Hub
            </button>
            <span>•</span>
            <button onClick={() => setCurrentTab('dashboard')} className="hover:text-amber-400 font-bold">
              Explore Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
