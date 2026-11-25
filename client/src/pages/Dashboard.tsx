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
  Bot,
  Navigation,
  ArrowRight,
  PlusCircle,
  IndianRupee,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { fetchWeather, fetchCrowd } from '../services/api';
import { SafetyScoreCard } from '../components/SafetyScoreCard';
import { DestinationSearch } from '../components/DestinationSearch';
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
  const { cities, currentCity, setCity, setUserCoords, safetyScoreData } = useCity();
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [crowds, setCrowds] = useState<CrowdLevel[]>([]);
  const [showMoreAdvisory, setShowMoreAdvisory] = useState(false);

  useEffect(() => {
    if (currentCity) {
      fetchWeather(currentCity.id, currentCity.name)
        .then(setWeather)
        .catch(console.error);

      fetchCrowd(currentCity.id)
        .then(setCrowds)
        .catch(console.error);
    }
  }, [currentCity]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = user?.name ? user.name.split(' ')[0] : 'Traveler';
  const nearest = safetyScoreData?.nearestServices;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Active Destination Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {greeting}, {displayName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>
              {currentCity?.name}, {currentCity?.state}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentTab('routes')}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors keep-white"
          >
            <IndianRupee className="w-4 h-4" />
            <span>Travel Tariff</span>
          </button>
          <button
            type="button"
            onClick={openIncidentModal}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Report Incident</span>
          </button>
          <button
            type="button"
            onClick={openEmergencyModal}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors keep-white"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* 2. Destination Search */}
      <div className="relative z-30 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3 overflow-visible">
        <DestinationSearch
          placeholder="Search any Indian city or landmark..."
          onSelect={(dest) => {
            if (dest.city) setCity(dest.city);
            setUserCoords({ lat: dest.lat, lng: dest.lng });
          }}
        />
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium text-[11px] mr-1">Quick Switch:</span>
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
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {cityName}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Key Action Summary (What to do right now + Tariff shortcut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-white">
                Safety Brief: {currentCity?.name || 'Current Sector'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('guardian')}
              className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Ask AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Weather</span>
              <span className="font-bold text-white mt-0.5 block">
                {weather?.temp ?? 29.5}°C · {weather?.condition || 'Clear'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Nearby Incidents</span>
              <span className="font-bold text-white mt-0.5 block">
                {safetyScoreData?.incidentCountNearby || 0} active
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Scam Alerts</span>
              <span className="font-bold text-white mt-0.5 block">
                {safetyScoreData?.scamCountNearby || 0} known
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Crowd Level</span>
              <span className="font-bold text-white mt-0.5 block">
                {crowds[0]?.currentLevel || 'Moderate'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowMoreAdvisory(!showMoreAdvisory)}
              className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1"
            >
              <span>{showMoreAdvisory ? 'Hide Local Guidance' : 'View Recommended Actions'}</span>
              {showMoreAdvisory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Safety Map</span>
            </button>
          </div>

          {showMoreAdvisory && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-slate-200 leading-relaxed">
              {currentCity?.name === 'Agra'
                ? 'Use the UP Police Prepaid Auto/Taxi Booth at Agra Cantt exit (Tajganj ~₹120–₹160). Nearest verified hospital: S.N. Medical College (1.2 km).'
                : currentCity?.name === 'Delhi'
                ? 'Use Airport Express Metro (₹50–₹60) or official prepaid taxi booths. Keep bags secure in crowded market areas.'
                : `Stick to lit main roads. Nearest police support is ~${nearest?.police?.distance || '1.8 km'} away. Prefer metered or prepaid booths.`}
            </div>
          )}
        </div>

        {/* Travel Tariff Card */}
        <div className="bg-slate-900 border border-amber-500/35 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl">
                <IndianRupee className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Fare &amp; Route Tool
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white">Travel Tariff Planner</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Search any source and destination worldwide, preview routes, and compare fair fares.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('routes')}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Open Travel Tariff</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Safety Score */}
      {safetyScoreData && <SafetyScoreCard data={safetyScoreData} cityName={currentCity?.name} />}

      {/* 5. Nearby Emergency & Transit Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">Nearby Essential Services</h3>
          <button
            type="button"
            onClick={() => setCurrentTab('services')}
            className="text-xs text-sky-400 hover:underline font-bold"
          >
            View All →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => setCurrentTab('services')}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <HeartPulse className="w-4 h-4" />
              <span className="text-xs font-bold">{nearest?.hospital?.distance || '1.2 km'}</span>
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mt-2">Hospital</div>
            <div className="font-bold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.hospital?.name || 'Trauma Centre (108)'}
            </div>
          </div>

          <div
            onClick={() => setCurrentTab('services')}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-blue-400">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-bold">{nearest?.police?.distance || '1.8 km'}</span>
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mt-2">Police</div>
            <div className="font-bold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.police?.name || 'Tourist Police (112)'}
            </div>
          </div>

          <div
            onClick={() => setCurrentTab('services')}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-purple-400">
              <Pill className="w-4 h-4" />
              <span className="text-xs font-bold">{nearest?.pharmacy?.distance || '400 m'}</span>
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mt-2">24x7 Pharmacy</div>
            <div className="font-bold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.pharmacy?.name || 'Medical Store'}
            </div>
          </div>

          <div
            onClick={() => setCurrentTab('services')}
            className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between text-cyan-400">
              <Bus className="w-4 h-4" />
              <span className="text-xs font-bold">{nearest?.transport?.distance || '600 m'}</span>
            </div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mt-2">Transit Hub</div>
            <div className="font-bold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.transport?.name || 'Prepaid Booth / Station'}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Weather & Crowd Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-amber-400" />
              Weather Advisory
            </span>
            <span className="text-sm font-bold text-white">{weather?.temp || 29.5}°C</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs text-slate-300">
            <span>Condition: <strong>{weather?.condition || 'Partly Sunny'}</strong></span>
            <span>Humidity: <strong>{weather?.humidity || 48}%</strong></span>
            <span>Rain: <strong>{weather?.rainChance || 12}%</strong></span>
          </div>
          {weather?.alertMessage && (
            <div className="bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-xl text-xs text-amber-200">
              <strong>Note:</strong> {weather.alertMessage}
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              Crowd &amp; Visiting Hours
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {crowds[0]?.currentLevel || 'MODERATE'}
            </span>
          </div>
          <div className="text-xs space-y-1 border-t border-slate-800 pt-2.5">
            <div className="font-bold text-white">{crowds[0]?.attractionName || 'Popular Landmarks'}</div>
            <div className="text-slate-300">
              Best Hours: <strong>{crowds[0]?.bestVisitingHours || '06:00 AM – 08:30 AM'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
