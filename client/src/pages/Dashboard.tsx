import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Compass,
  MapPin,
  HeartPulse,
  Shield,
  Pill,
  Bus,
  AlertTriangle,
  CloudSun,
  Users,
  Bot,
  Navigation,
  ArrowRight,
  PlusCircle,
  IndianRupee,
  Car,
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
  const { currentCity, setCity, setUserCoords, safetyScoreData } = useCity();
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [crowds, setCrowds] = useState<CrowdLevel[]>([]);

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

  // Determine current greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = user?.name ? user.name.split(' ')[0] : 'Traveler';

  const nearest = safetyScoreData?.nearestServices;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Active Guardian Protection
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {greeting}, {displayName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1">
            <MapPin className="w-4 h-4 text-red-400" />
            <span>
              {currentCity?.name}, {currentCity?.state}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openEmergencyModal}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/40 flex items-center gap-1.5 transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SOS Emergency Mode</span>
          </button>
          <button
            onClick={openIncidentModal}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Universal Destination Search Bar */}
      <div className="glass-panel-elevated p-4 sm:p-5 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-amber-400" />
          Where do you want to travel in India?
        </label>
        <DestinationSearch
          placeholder="Search any Indian destination (e.g. Manali, Haridwar, Rishikesh, Jaipur, Mumbai)..."
          onSelect={(dest) => {
            if (dest.city) {
              setCity(dest.city);
            }
            setUserCoords({ lat: dest.lat, lng: dest.lng });
          }}
        />
      </div>

      {/* CORE PRODUCT PRINCIPLE: "What should I do right now?" Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400">
                Action-Oriented Guardian AI
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                What Should I Do Right Now in {currentCity?.name || 'this city'}?
              </h2>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('guardian')}
            className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
          >
            <span>Ask Travel Guardian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Situation Analysis */}
          <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Current Conditions
            </span>
            <div className="text-xs text-slate-200 space-y-1">
              <div>• Weather: {weather?.condition || 'Clear & Dry'} ({weather?.temp || 29.5}°C)</div>
              <div>• Active Nearby Incidents: {safetyScoreData?.incidentCountNearby || 0} reported</div>
              <div>• Known Active Scams: {safetyScoreData?.scamCountNearby || 0} patterns</div>
              <div>• Crowd Footfall: {crowds[0]?.currentLevel || 'Moderate'}</div>
            </div>
          </div>

          {/* Recommended Safe Next Action */}
          <div className="space-y-1.5 bg-indigo-950/30 p-4 rounded-2xl border border-indigo-900/40 md:col-span-2">
            <span className="text-[11px] font-bold uppercase text-indigo-400 flex items-center gap-1">
              ⭐ Recommended Immediate Action
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {currentCity?.name === 'Agra' ? (
                <>
                  Use the <strong>UP Police Prepaid Auto/Taxi Booth</strong> at Agra Cantt Platform 1 exit. 
                  Expected fair rate to Tajganj is <strong>₹120–₹160</strong>. Decline touts offering private detours to marble emporiums. 
                  Nearest verified medical support is <strong>S.N. Medical College</strong> (1.2 km away).
                </>
              ) : currentCity?.name === 'Delhi' ? (
                <>
                  Board the <strong>Airport Express Metro</strong> to New Delhi Station (₹50–₹60). 
                  Beware of touts falsely asserting the Government Tourist Bureau is closed. 
                  Keep backpacks zipped in crowded Chandni Chowk bottlenecks.
                </>
              ) : (
                <>
                  Stick to arterial thoroughfares with active streetlights. 
                  Nearest police outpost is within reach ({nearest?.police?.distance || '1.8 km'}). 
                  Use app-based metered transit or government prepaid booths for fair travel.
                </>
              )}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentTab('routes')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" /> Plan Safe Route
              </button>
              <button
                onClick={() => setCurrentTab('guardian')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors"
              >
                Ask Custom Question →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LOCAL FARE INTELLIGENCE BANNER */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                Fare Intelligence
              </span>
              <span className="text-xs text-slate-400">Avoid Tourist Overcharging</span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-1">
              Estimated Local Transportation Fares ({currentCity?.name})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Check regulated rates for Auto Rickshaws, Shared Cabs, Local Taxis, Buses, and Metro before you board.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab('fare')}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2 flex-shrink-0"
        >
          <span>Check Fares & Audit Driver Quote</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Score Section */}
      {safetyScoreData && (
        <SafetyScoreCard data={safetyScoreData} cityName={currentCity?.name} />
      )}

      {/* Nearby Vital Services Matrix (Hospitals, Police, Pharmacies, Transport) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-white">
            Nearby Emergency & Transit Services
          </h3>
          <button
            onClick={() => setCurrentTab('services')}
            className="text-xs text-red-400 hover:text-red-300 font-bold"
          >
            View All Services →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Hospital */}
          <div
            onClick={() => setCurrentTab('services')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <HeartPulse className="w-5 h-5" />
              <span className="text-xs font-bold">
                {nearest?.hospital?.distance || '1.2 km'}
              </span>
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mt-2">
              Emergency Hospital
            </div>
            <div className="font-extrabold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.hospital?.name || 'Trauma Centre (108)'}
            </div>
          </div>

          {/* Police */}
          <div
            onClick={() => setCurrentTab('services')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-blue-400">
              <Shield className="w-5 h-5" />
              <span className="text-xs font-bold">
                {nearest?.police?.distance || '1.8 km'}
              </span>
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mt-2">
              Police Station
            </div>
            <div className="font-extrabold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.police?.name || 'Tourist Police Thana (112)'}
            </div>
          </div>

          {/* Pharmacy */}
          <div
            onClick={() => setCurrentTab('services')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-purple-400">
              <Pill className="w-5 h-5" />
              <span className="text-xs font-bold">
                {nearest?.pharmacy?.distance || '400 m'}
              </span>
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mt-2">
              24x7 Pharmacy
            </div>
            <div className="font-extrabold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.pharmacy?.name || 'Apollo / MedPlus Chemist'}
            </div>
          </div>

          {/* Transport */}
          <div
            onClick={() => setCurrentTab('services')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between text-cyan-400">
              <Bus className="w-5 h-5" />
              <span className="text-xs font-bold">
                {nearest?.transport?.distance || '600 m'}
              </span>
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-400 mt-2">
              Transit / Prepaid Booth
            </div>
            <div className="font-extrabold text-sm text-white line-clamp-1 mt-0.5">
              {nearest?.transport?.name || 'Railway & Metro Terminal'}
            </div>
          </div>
        </div>
      </div>

      {/* Weather & Crowd Intelligence Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Intelligence */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-amber-400" />
              Weather & Travel Advisory
            </span>
            <span className="text-sm font-bold text-white">
              {weather?.temp || 29.5}°C
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
            <div>
              <span className="text-slate-400">Condition:</span>{' '}
              <strong className="text-white">{weather?.condition || 'Partly Sunny'}</strong>
            </div>
            <div>
              <span className="text-slate-400">Humidity:</span>{' '}
              <strong className="text-white">{weather?.humidity || 48}%</strong>
            </div>
            <div>
              <span className="text-slate-400">Rain Chance:</span>{' '}
              <strong className="text-white">{weather?.rainChance || 12}%</strong>
            </div>
          </div>

          {weather?.alertMessage && (
            <div className="bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-xl text-xs text-amber-200">
              ☀️ <strong>Advisory:</strong> {weather.alertMessage}
            </div>
          )}
        </div>

        {/* Crowd Intelligence */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              Crowd Footfall & Best Visiting Hours
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {crowds[0]?.currentLevel || 'HIGH'} CROWD
            </span>
          </div>

          <div className="text-xs space-y-1.5 border-t border-slate-800/80 pt-3">
            <div className="font-bold text-white">{crowds[0]?.attractionName || 'Major Heritage Monument'}</div>
            <div className="text-slate-300">
              🕒 <strong>Best Visiting Hours:</strong> {crowds[0]?.bestVisitingHours || '06:00 AM – 08:30 AM (Sunrise)'}
            </div>
            <div className="text-slate-400 text-[11px]">
              {crowds[0]?.crowdEstimateLabel || 'Moderate queues at security screening.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
