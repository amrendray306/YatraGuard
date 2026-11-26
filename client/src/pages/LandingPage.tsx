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
  PhoneCall,
  Search,
  Users,
  CloudSun,
  HeartPulse,
  MessageSquare,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
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
}) => {
  const { cities, setCity, setUserCoords, userAddress, gpsStatus, requestUserLocation } = useCity();
  const [searchQuery, setSearchQuery] = useState('');
  const [communityPreview, setCommunityPreview] = useState<any[]>([]);

  const popularDestinations = [
    {
      id: 'manali',
      name: 'Manali',
      state: 'Himachal Pradesh',
      description: 'Alpine resort on the Beas River, gateway to Solang Valley and Atal Tunnel.',
      safetyScore: 86,
      tag: 'Mountain Hub',
      fareType: 'Union & Hill Tariff',
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'shimla',
      name: 'Shimla',
      state: 'Himachal Pradesh',
      description: 'Historic hill capital with pedestrian Mall Road, The Ridge, and UNESCO railway.',
      safetyScore: 88,
      tag: 'Heritage Hill',
      fareType: 'HRTC & Union Cabs',
      image: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'rishikesh',
      name: 'Rishikesh',
      state: 'Uttarakhand',
      description: 'Yoga capital and river rafting hub with Ram Jhula and Ganga Aarti ghats.',
      safetyScore: 89,
      tag: 'Adventure',
      fareType: 'Shared Jeeps ₹30+',
      image: 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'haridwar',
      name: 'Haridwar',
      state: 'Uttarakhand',
      description: 'Sacred Himalayan gateway famous for evening Ganga Aarti at Har Ki Pauri.',
      safetyScore: 79,
      tag: 'Sacred Gateway',
      fareType: 'Prepaid Taxi Booth',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'jaipur',
      name: 'Jaipur',
      state: 'Rajasthan',
      description: 'The Pink City with Amer Fort, Hawa Mahal, and dedicated tourist police outposts.',
      safetyScore: 82,
      tag: 'Royal Heritage',
      fareType: 'Prepaid Auto Counter',
      image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'goa',
      name: 'Goa',
      state: 'Goa',
      description: 'Monitored beach corridors, certified water sports, and GoaMiles metered cabs.',
      safetyScore: 84,
      tag: 'Coastal Hub',
      fareType: 'GoaMiles App Meter',
      image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'leh',
      name: 'Leh',
      state: 'Ladakh',
      description: 'High-altitude Himalayan capital at 3,500m with ancient monasteries and high safety.',
      safetyScore: 89,
      tag: 'High Altitude',
      fareType: 'Ladakh Union Tariff',
      image: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1000&q=80',
    },
    {
      id: 'dehradun',
      name: 'Dehradun',
      state: 'Uttarakhand',
      description: 'Scenic Doon Valley capital connecting Mussoorie hills with calm city transit.',
      safetyScore: 84,
      tag: 'Valley Hub',
      fareType: 'ISBT City Transit',
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
    <div className="space-y-16 pb-20">
      {/* A. HERO SECTION */}
      <section className="photo-overlay relative min-h-[72vh] sm:min-h-[78vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=2000&q=85"
            alt="Scenic Himalayan travel route"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5 py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-400/35 text-xs font-semibold text-sky-200 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>YatraGuard • Intelligent Travel Safety &amp; Fare Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Explore Freely.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-teal-300 to-emerald-300">
              Travel Safely.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
            Real-time area safety scores, fair transport tariffs, nearby emergency services, and verified traveler reports.
          </p>

          {/* Destination Search */}
          <div className="max-w-2xl mx-auto pt-1 space-y-3">
            <div className="flex items-center bg-slate-900/95 border border-slate-700 rounded-2xl p-2 shadow-xl focus-within:border-sky-400 transition-colors backdrop-blur-xl">
              <Search className="w-5 h-5 text-sky-400 ml-3 mr-2 flex-shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a destination (e.g. Manali, Jaipur, Goa, Delhi)..."
                aria-label="Search destination"
                className="w-full bg-transparent border-none text-white text-sm placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (filteredDestinations.length > 0) {
                    handleSelectDestination(filteredDestinations[0].name);
                  } else {
                    setCurrentTab('dashboard');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 flex-shrink-0 keep-white"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={async () => {
                  const ok = await requestUserLocation(true);
                  if (ok) setCurrentTab('map');
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-sky-500/40 bg-slate-900/90 text-sky-200 hover:text-white font-bold transition-colors"
              >
                <Navigation className="w-3 h-3 text-sky-400" />
                <span>{gpsStatus === 'granted' ? `GPS: ${userAddress}` : 'Use Current Location'}</span>
              </button>
              {['Manali', 'Shimla', 'Rishikesh', 'Jaipur', 'Goa', 'Leh'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectDestination(city)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentTab('routes')}
              className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg transition-colors flex items-center gap-2 keep-white"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Check Travel Tariff</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm transition-colors flex items-center gap-2"
            >
              <Navigation className="w-4 h-4 text-teal-400" />
              <span>Open Safety Map</span>
            </button>
            <button
              type="button"
              onClick={openEmergencyModal}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg transition-colors flex items-center gap-2 keep-white"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>
      </section>

      {/* B. POPULAR DESTINATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Curated Destinations
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">Popular Destinations</h2>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('map')}
            className="text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Open Safety Map</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* C. CORE CAPABILITIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Platform Capabilities
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Everything You Need to Travel Safely
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            title="Travel Tariff & Routes"
            description="Plan routes worldwide and check fair vs estimated local transport costs."
            icon={IndianRupee}
            badge="Routes + Fares"
            badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            ctaText="Open Tariff Planner"
            onClick={() => setCurrentTab('routes')}
            accentColor="amber"
          />
          <FeatureCard
            title="Travel Safety Score"
            description="Dynamic 0–100 area rating based on hospitals, police, lighting, and reports."
            icon={ShieldCheck}
            badge="Live Score"
            badgeColor="bg-emerald-950 text-emerald-300 border-emerald-800"
            ctaText="View Safety Index"
            onClick={() => setCurrentTab('safety')}
            accentColor="emerald"
          />
          <FeatureCard
            title="Hospitals & Police"
            description="Find verified 24/7 hospitals, pharmacies, and tourist police desks nearby."
            icon={HeartPulse}
            badge="24/7 Care"
            badgeColor="bg-red-950 text-red-300 border-red-800"
            ctaText="Find Nearby Places"
            onClick={() => setCurrentTab('services')}
            accentColor="red"
          />
          <FeatureCard
            title="AI Travel Assistant"
            description="Ask about transit fares, local safety practices, or emergency actions."
            icon={Bot}
            badge="24/7 AI"
            badgeColor="bg-purple-950 text-purple-300 border-purple-800"
            ctaText="Ask Assistant"
            onClick={() => setCurrentTab('guardian')}
            accentColor="purple"
          />
          <FeatureCard
            title="Scam & Safety Alerts"
            description="Read verified traveler reports on touting, overcharging, and hazards."
            icon={AlertTriangle}
            badge="Vigilance"
            badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            ctaText="View Alerts"
            onClick={() => setCurrentTab('alerts')}
            accentColor="amber"
          />
          <FeatureCard
            title="Local Price Guide"
            description="Check fair benchmarks for meals, stays, monument tickets, and rentals."
            icon={Compass}
            badge="Benchmarks"
            badgeColor="bg-blue-950 text-blue-300 border-blue-800"
            ctaText="Browse Prices"
            onClick={() => setCurrentTab('fare')}
            accentColor="blue"
          />
          <FeatureCard
            title="Emergency Assistance"
            description="Quick SOS broadcast with live GPS coordinates and 112/108 dialing."
            icon={ShieldAlert}
            badge="SOS"
            badgeColor="bg-red-950 text-red-300 border-red-800"
            ctaText="Open SOS Desk"
            onClick={openEmergencyModal}
            accentColor="rose"
          />
          <FeatureCard
            title="Community & Weather"
            description="Connect with fellow travelers and view live city weather advisories."
            icon={CloudSun}
            badge="Community"
            badgeColor="bg-cyan-950 text-cyan-300 border-cyan-800"
            ctaText="Open Community"
            onClick={() => setCurrentTab('community')}
            accentColor="cyan"
          />
        </div>
      </section>

      {/* D. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="yg-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              How YatraGuard Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Three simple steps before or during your trip.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Step 01</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pick Your Location</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Search any city or landmark to load local safety scores, police stations, and hospitals.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 02</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Verify Routes &amp; Fares</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Preview road routes, travel durations, and official vs estimated transport fares.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Step 03</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stay Prepared</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect with verified travel buddies, open the vault, and trigger one-tap SOS anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* E. COMMUNITY HIGHLIGHTS */}
      {communityPreview.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Traveler Notes
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Community Highlights</h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('community')}
              className="text-xs sm:text-sm font-bold text-sky-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View All Posts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
      )}

      {/* F. EMERGENCY HELPLINES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-950/70 via-slate-900 to-red-950/70 border border-red-500/35 rounded-3xl p-6 sm:p-8 shadow-lg space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-900/60 border border-red-700/50 text-[11px] font-bold text-red-200">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>National Helplines</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                24/7 Emergency Assistance
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Quick access to Police, Medical, Women Safety, and Tourist helplines with GPS location sharing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={openEmergencyModal}
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 keep-white"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Open SOS Desk</span>
              </button>
              <a
                href="tel:112"
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>Call 112</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-red-900/40 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">112</span>
              <span className="text-white font-bold">All Emergencies</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">108</span>
              <span className="text-white font-bold">Ambulance</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">1090 / 1091</span>
              <span className="text-white font-bold">Women Safety</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 block font-semibold">1363</span>
              <span className="text-white font-bold">Tourist Helpline</span>
            </div>
          </div>
        </div>
      </section>

      {/* G. FOOTER */}
      <footer className="border-t border-slate-800 pt-12 pb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-400">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-sky-500 to-teal-600 rounded-xl keep-white">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-white text-base">
                Yatra<span className="text-amber-400">Guard</span>
              </span>
            </div>
            <p className="leading-relaxed">
              Travel safety scoring, transparent transport tariffs, and emergency assistance.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Explore</h4>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={() => setCurrentTab('routes')} className="hover:text-sky-400">
                  Travel Tariff Planner
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('map')} className="hover:text-sky-400">
                  Interactive Safety Map
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('services')} className="hover:text-sky-400">
                  Nearby Places &amp; Care
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('guardian')} className="hover:text-sky-400">
                  AI Travel Assistant
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Safety &amp; Account</h4>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={openEmergencyModal} className="text-red-400 font-bold hover:underline">
                  Emergency SOS
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('alerts')} className="hover:text-sky-400">
                  Scam &amp; Safety Alerts
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('vault')} className="hover:text-sky-400">
                  Emergency Vault
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('profile')} className="hover:text-sky-400">
                  Profile &amp; Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} YatraGuard. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setCurrentTab('dashboard')} className="hover:text-sky-400 font-semibold">
              Explore
            </button>
            <button type="button" onClick={() => setCurrentTab('community')} className="hover:text-sky-400 font-semibold">
              Community
            </button>
            <button type="button" onClick={() => setCurrentTab('admin')} className="hover:text-sky-400 font-semibold">
              Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
