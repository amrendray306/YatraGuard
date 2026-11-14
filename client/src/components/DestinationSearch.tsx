import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Compass, Landmark, ArrowRight, X, Sparkles } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { searchDestinations } from '../services/api';
import { City } from '../types';

interface DestinationSearchProps {
  onSelect?: (item: { type: 'city' | 'landmark'; id: string; name: string; lat: number; lng: number; city?: City }) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onSelect,
  placeholder = 'Where do you want to travel in India? (e.g. Manali, Rishikesh, Delhi)',
  className = '',
  autoFocus = false,
}) => {
  const { cities, currentCity, setCity, setUserCoords } = useCity();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ cities: City[]; landmarks: any[] }>({ cities: [], landmarks: [] });
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults({ cities: cities.slice(0, 6), landmarks: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchDestinations(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Failed to search destinations:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, cities]);

  const handleSelectCity = (city: City) => {
    setCity(city);
    setUserCoords({ lat: city.lat, lng: city.lng });
    setQuery(city.name);
    setIsOpen(false);
    if (onSelect) {
      onSelect({
        type: 'city',
        id: city.id,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        city,
      });
    }
  };

  const handleSelectLandmark = (landmark: any) => {
    const matchingCity = cities.find((c) => c.id === landmark.cityId);
    if (matchingCity) {
      setCity(matchingCity);
    }
    setUserCoords({ lat: landmark.lat, lng: landmark.lng });
    setQuery(landmark.name);
    setIsOpen(false);
    if (onSelect) {
      onSelect({
        type: 'landmark',
        id: landmark.id,
        name: landmark.name,
        lat: landmark.lat,
        lng: landmark.lng,
        city: matchingCity,
      });
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-amber-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3.5 bg-slate-900/95 hover:bg-slate-900 text-white placeholder-slate-400 rounded-2xl border border-slate-700/80 hover:border-amber-500/60 focus:border-amber-500 focus:outline-none text-sm font-semibold shadow-xl transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3.5 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto divide-y divide-slate-800">
          {/* Quick Info Bar */}
          <div className="px-4 py-2 bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Supported Indian Destinations
            </span>
            {isLoading && <span className="text-amber-400 font-normal">Searching...</span>}
          </div>

          {/* Cities Section */}
          <div className="p-2 space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Destinations & Hill Towns
            </div>
            {results.cities.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">No destinations found for "{query}"</div>
            ) : (
              results.cities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    currentCity?.id === city.id
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-800 rounded-lg text-amber-400">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span>{city.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({city.state})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        Safety Score: {city.defaultSafetyScore}/100 • Tier: {city.tier || 'Tourist Hub'}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                </div>
              ))
            )}
          </div>

          {/* Landmarks / Points of Interest */}
          {results.landmarks && results.landmarks.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Key Attractions & Transport Corridors
              </div>
              {results.landmarks.map((l) => (
                <div
                  key={l.id}
                  onClick={() => handleSelectLandmark(l)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-800 rounded-lg text-blue-400">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white line-clamp-1">{l.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {l.cityName} • {l.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

