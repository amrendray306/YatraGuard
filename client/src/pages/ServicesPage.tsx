import React, { useState, useEffect } from 'react';
import {
  Building2,
  HeartPulse,
  Shield,
  Pill,
  Bus,
  Search,
  Phone,
  Navigation,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { fetchNearbyServices } from '../services/api';
import { LocationService } from '../types';

export const ServicesPage: React.FC = () => {
  const { currentCity, userCoords } = useCity();
  const [services, setServices] = useState<LocationService[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchNearbyServices({
      lat: userCoords.lat,
      lng: userCoords.lng,
      category: category === 'ALL' ? undefined : category,
      cityId: currentCity?.id,
      sortBy,
    })
      .then(setServices)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentCity, userCoords, category, sortBy]);

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'HOSPITAL':
        return <HeartPulse className="w-5 h-5 text-emerald-400" />;
      case 'POLICE':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'PHARMACY':
        return <Pill className="w-5 h-5 text-purple-400" />;
      case 'TRANSPORT':
        return <Bus className="w-5 h-5 text-cyan-400" />;
      default:
        return <Building2 className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
          <Building2 className="w-4 h-4" />
          Verified Local Services Directory
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
          Nearby Emergency & Support Services ({currentCity?.name || 'Local City'})
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Verified 24/7 hospitals, tourist police outposts, chemists, and transit hubs
        </p>
      </div>

      {/* Search & Sort Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service name, address, landmark..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories</option>
            <option value="HOSPITAL">Hospitals (24/7 Trauma)</option>
            <option value="POLICE">Police Stations (112)</option>
            <option value="PHARMACY">Pharmacies (Chemist)</option>
            <option value="TRANSPORT">Transit & Prepaid Taxi</option>
            <option value="ATM">ATMs & Banking</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="distance">Sort: Nearest Distance</option>
            <option value="rating">Sort: Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-slate-800 rounded-2xl border border-slate-700">
                    {getCategoryIcon(service.category)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {service.category}
                    </span>
                    <h3 className="font-extrabold text-sm text-white line-clamp-1 mt-0.5">
                      {service.name}
                    </h3>
                  </div>
                </div>

                {service.isVerified && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">
                {service.address}
              </p>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded">
                  📍 {service.distanceLabel}
                </span>
                <span className="text-emerald-400 font-medium text-[11px]">
                  {service.openStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {service.phone && (
                <a
                  href={`tel:${service.phone.split('/')[0].trim()}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call ({service.phone.split('/')[0].trim()})
                </a>
              )}

              <a
                href={`https://maps.google.com/?q=${service.lat},${service.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-red-400" /> Directions
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
