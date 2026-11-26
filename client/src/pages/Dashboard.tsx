import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Compass,
  MapPin,
  HeartPulse,
  Shield,
  Pill,
  Bus,
  CloudSun,
  Users,
  Navigation,
  ArrowRight,
  IndianRupee,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Crosshair,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchWeather,
  fetchCrowd,
  fetchCommunityPosts,
  fetchMyBuddyPlans,
  fetchUserTrips,
  resolveMediaUrl,
} from '../services/api';
import { SafetyScoreCard } from '../components/SafetyScoreCard';
import { DestinationSearch } from '../components/DestinationSearch';
import { FeatureCard } from '../components/cards/FeatureCard';
import { ServiceCard } from '../components/cards/ServiceCard';
import { SectionHeader, EmptyState, StatCard } from '../components/ui';
import { WeatherData, CrowdLevel } from '../types';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openIncidentModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setCurrentTab,
  openEmergencyModal,
  openIncidentModal,
}) => {
  const {
    cities,
    currentCity,
    setCity,
    setUserCoords,
    userAddress,
    gpsStatus,
    requestUserLocation,
    safetyScoreData,
  } = useCity();
  const { user } = useAuth();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [crowds, setCrowds] = useState<CrowdLevel[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [activePlans, setActivePlans] = useState<any[]>([]);

  useEffect(() => {
    if (currentCity) {
      fetchWeather(currentCity.id, currentCity.name)
        .then(setWeather)
        .catch(() => {});

      fetchCrowd(currentCity.id)
        .then(setCrowds)
        .catch(() => {});
    }
  }, [currentCity]);

  useEffect(() => {
    fetchCommunityPosts({ limit: 3 })
      .then((res) => setRecentPosts(res.posts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setActivePlans([]);
      return;
    }
    Promise.allSettled([fetchMyBuddyPlans(), fetchUserTrips()]).then(([buddyRes, tripsRes]) => {
      const merged: any[] = [];
      if (buddyRes.status === 'fulfilled') {
        const buddyList = Array.isArray(buddyRes.value)
          ? buddyRes.value
          : buddyRes.value?.plans || [];
        buddyList
          .filter((p: any) => p.status === 'OPEN')
          .slice(0, 2)
          .forEach((p: any) =>
            merged.push({
              id: `buddy-${p.id}`,
              title: p.destinationCity,
              subtitle: p.fromLocation ? `From ${p.fromLocation}` : p.travelStyle,
              dateLabel: new Date(p.startDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              }),
              badge: 'Buddy Plan',
              targetTab: 'buddy',
            })
          );
      }
      if (tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value)) {
        tripsRes.value.slice(0, 2).forEach((t: any) =>
          merged.push({
            id: `trip-${t.id}`,
            title: t.title || t.destinationCity,
            subtitle: t.destinationCity,
            dateLabel: t.status || 'ACTIVE',
            badge: 'Saved Trip',
            targetTab: 'trips',
          })
        );
      }
      setActivePlans(merged.slice(0, 3));
    });
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.name ? user.name.split(' ')[0] : 'Traveler';
  const nearest = safetyScoreData?.nearestServices;

  const recommendedServices = [
    {
      name: nearest?.hospital?.name || `${currentCity?.name || 'City'} General Hospital`,
      category: 'HOSPITAL',
      address: `${currentCity?.name || 'Sector'} • ${nearest?.hospital?.distance || '1.2 km'} away`,
      phone: nearest?.hospital?.phone || '108',
      openStatus: '24/7 Emergency Care',
      rating: 4.7,
    },
    {
      name: nearest?.police?.name || `${currentCity?.name || 'City'} Tourist Police Desk`,
      category: 'POLICE',
      address: `${currentCity?.name || 'Sector'} • ${nearest?.police?.distance || '1.8 km'} away`,
      phone: nearest?.police?.phone || '112',
      openStatus: '24/7 Assistance',
      rating: 4.6,
    },
    {
      name: nearest?.pharmacy?.name || '24x7 Apollo / Medical Pharmacy',
      category: 'PHARMACY',
      address: `${currentCity?.name || 'Sector'} • ${nearest?.pharmacy?.distance || '450 m'} away`,
      phone: nearest?.pharmacy?.phone,
      openStatus: 'Open Now',
      rating: 4.5,
    },
    {
      name: nearest?.transport?.name || 'Official Prepaid Transit Hub',
      category: 'TRANSPORT',
      address: `${currentCity?.name || 'Sector'} • ${nearest?.transport?.distance || '650 m'} away`,
      openStatus: 'Verified Tariffs',
      rating: 4.4,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-14 space-y-8 yg-page-enter">
      {/* ===================================================================== */}
      {/* A. WELCOME SECTION                                                    */}
      {/* ===================================================================== */}
      <section className="yg-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {user?.avatarUrl ? (
              <img
                src={resolveMediaUrl(user.avatarUrl)}
                alt={user.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 flex items-center justify-center text-white text-lg font-bold keep-white flex-shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {greeting}, {displayName}
                </h1>
                {safetyScoreData && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    Safety {safetyScoreData.score}/100
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" aria-hidden="true" />
                  {currentCity?.name}, {currentCity?.state}
                </span>
                <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
                <span>Everything you need to plan fares, check safety, and find help nearby.</span>
              </p>
            </div>
          </div>

          {/* Primary Welcome Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => requestUserLocation(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors yg-press"
              title="Refresh GPS location"
            >
              <Crosshair
                className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${
                  gpsStatus === 'locating' ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span>{gpsStatus === 'granted' && userAddress ? 'GPS Active' : 'Detect GPS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('routes')}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors keep-white yg-press"
            >
              <IndianRupee className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Check Fair Tariff</span>
            </button>

            <button
              type="button"
              onClick={openEmergencyModal}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors keep-white yg-press"
            >
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>

        {/* Location Search + Quick City Switcher */}
        <div className="relative z-30 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 overflow-visible">
          <DestinationSearch
            placeholder="Switch destination city or search any Indian landmark..."
            onSelect={(dest) => {
              if (dest.city) setCity(dest.city);
              setUserCoords({ lat: dest.lat, lng: dest.lng });
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mr-1">
              Popular hubs:
            </span>
            {['Manali', 'Goa', 'Jaipur', 'Rishikesh', 'Agra', 'Delhi', 'Varanasi'].map((cityName) => (
              <button
                key={cityName}
                type="button"
                onClick={() => {
                  const found = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
                  if (found) {
                    setCity(found);
                    setUserCoords({ lat: found.lat, lng: found.lng });
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  currentCity?.name.toLowerCase() === cityName.toLowerCase()
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                }`}
              >
                {cityName}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* B. QUICK ACTIONS                                                      */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Explore Tools"
          icon={Compass}
          title="Quick Actions"
          subtitle="Jump straight into any YatraGuard safety or travel intelligence tool."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            title="Safety Map"
            description="View live safety zones, verified reports, and emergency pins around your route."
            icon={Navigation}
            badge={safetyScoreData ? `${safetyScoreData.score}/100 Sector` : 'Live Map'}
            badgeColor="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
            ctaText="Open Map"
            accentColor="blue"
            onClick={() => setCurrentTab('map')}
          />

          <FeatureCard
            title="Nearby Places"
            description="Locate 24/7 hospitals, pharmacies, police desks, and official transit hubs."
            icon={HeartPulse}
            badge="Medical & Help"
            badgeColor="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
            ctaText="Explore Nearby"
            accentColor="teal"
            onClick={() => setCurrentTab('services')}
          />

          <FeatureCard
            title="Travel Buddy"
            description="Match with verified travelers heading to the same destination and dates."
            icon={Users}
            badge="Verified Plans"
            badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
            ctaText="Find Travel Buddy"
            accentColor="indigo"
            onClick={() => setCurrentTab('buddy')}
          />

          <FeatureCard
            title="SOS Emergency"
            description="Broadcast live GPS distress alert and dial 112, 108, or women safety lines."
            icon={ShieldAlert}
            badge="Instant Alert"
            badgeColor="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800"
            ctaText="Open SOS Desk"
            accentColor="red"
            variant="emergency"
            onClick={openEmergencyModal}
          />

          <FeatureCard
            title="Report a Scam"
            description="Flag overcharging, fake guides, or unsafe spots to warn fellow travelers."
            icon={AlertTriangle}
            badge="Community Shield"
            badgeColor="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
            ctaText="Submit Report"
            accentColor="amber"
            onClick={openIncidentModal}
          />

          <FeatureCard
            title="Travel Community"
            description="Read local safety advisories, hidden gems, and verified traveler updates."
            icon={MessageSquare}
            badge="Highlights"
            badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
            ctaText="Open Community"
            accentColor="emerald"
            onClick={() => setCurrentTab('community')}
          />
        </div>
      </section>

      {/* ===================================================================== */}
      {/* C. TRAVEL OVERVIEW                                                    */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Live Intelligence"
          icon={Sparkles}
          title={`Travel Overview — ${currentCity?.name || 'Current Area'}`}
          subtitle="Current sector metrics, active plans, and recent community updates."
          actionLabel="Full Safety Index"
          onAction={() => setCurrentTab('safety')}
        />

        {/* Compact Key Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Local Weather"
            value={`${weather?.temp ?? 28}°C`}
            subtext={
              weather?.alertMessage && (weather?.severity === 'HIGH' || weather?.severity === 'MODERATE')
                ? `${weather.condition} • ${weather.severity} Advisory`
                : `${weather?.condition || 'Clear conditions'} • ${weather?.rainChance ?? 15}% rain`
            }
            icon={CloudSun}
            accentColor="amber"
            onClick={() => setCurrentTab('weather')}
          />
          <StatCard
            title="Nearby Reports"
            value={safetyScoreData?.incidentCountNearby ?? 0}
            subtext="Active incidents nearby"
            icon={AlertTriangle}
            accentColor="red"
            onClick={() => setCurrentTab('alerts')}
          />
          <StatCard
            title="Scam Advisories"
            value={safetyScoreData?.scamCountNearby ?? 0}
            subtext="Verified warnings logged"
            icon={Shield}
            accentColor="blue"
            onClick={() => setCurrentTab('alerts')}
          />
          <StatCard
            title="Crowd Level"
            value={crowds[0]?.currentLevel || 'Moderate'}
            subtext="Current tourist density"
            icon={Users}
            accentColor="teal"
          />
        </div>

        {/* Overview Split: Safety Score + Active Plans & Community Updates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {safetyScoreData && (
              <SafetyScoreCard data={safetyScoreData} cityName={currentCity?.name} />
            )}
          </div>

          <div className="space-y-5">
            {/* Active Travel Plans Card */}
            <div className="yg-card p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span>Active Travel Plans</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentTab('buddy')}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Manage
                </button>
              </div>

              {activePlans.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {user
                      ? 'No active travel plans yet. Post a plan to find buddies or share live ETA.'
                      : 'Sign in to save trips and match with verified travel buddies.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('buddy')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors keep-white"
                  >
                    Create Travel Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activePlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setCurrentTab(plan.targetTab)}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {plan.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {plan.subtitle} • {plan.dateLabel}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 flex-shrink-0">
                        {plan.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Community Updates */}
            <div className="yg-card p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>Recent Community Updates</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentTab('community')}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>

              {recentPosts.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No recent updates"
                  description="Share a tip or safety note with the traveler community."
                  actionLabel="Open Community"
                  onAction={() => setCurrentTab('community')}
                  accentColor="teal"
                />
              ) : (
                <div className="space-y-2.5">
                  {recentPosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setCurrentTab('community')}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                          {post.destinationName || currentCity?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {post.title}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                        {post.content}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* D. RECOMMENDED SERVICES                                               */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Emergency & Transit"
          icon={HeartPulse}
          title="Recommended Nearby Services"
          subtitle={`Closest verified hospitals, police assistance, pharmacies, and transit counters in ${currentCity?.name || 'your area'}.`}
          actionLabel="Explore All Nearby"
          onAction={() => setCurrentTab('services')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendedServices.map((svc, idx) => (
            <ServiceCard
              key={idx}
              name={svc.name}
              category={svc.category}
              address={svc.address}
              phone={svc.phone || undefined}
              rating={svc.rating}
              openStatus={svc.openStatus}
              actionLabel="Locate"
              onAction={() => setCurrentTab('services')}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
