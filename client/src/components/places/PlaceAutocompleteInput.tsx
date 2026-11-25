import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Compass, Globe, X, Loader2 } from 'lucide-react';
import { autocompletePlacesGlobal, geocodePlaceOrAddress } from '../../services/api';
import { PlaceAutocompleteSuggestion } from '../../types';

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectLocation: (loc: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    source: string;
  }) => void;
  placeholder?: string;
  biasCoords?: { lat: number; lng: number };
  leftIcon?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectLocation,
  placeholder = 'Search any city, landmark, or address worldwide...',
  biasCoords,
  leftIcon,
  rightActions,
  className = '',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteSuggestion[]>([]);
  const [providerLabel, setProviderLabel] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `yg_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (!isOpen || q.length < 2) {
      if (q.length < 2) setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await autocompletePlacesGlobal({
          q,
          lat: biasCoords?.lat,
          lng: biasCoords?.lng,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(res.suggestions || []);
        setProviderLabel(res.provider || '');
      } catch (err) {
        console.warn('Place autocomplete error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, isOpen, biasCoords?.lat, biasCoords?.lng]);

  const handleSelectSuggestion = async (item: PlaceAutocompleteSuggestion) => {
    setIsOpen(false);
    if (item.lat !== undefined && item.lng !== undefined) {
      onChange(item.name);
      onSelectLocation({
        name: item.name,
        address: item.fullText || item.name,
        lat: item.lat,
        lng: item.lng,
        source: item.source,
      });
      return;
    }

    // Resolve Google Place ID or text address to exact coordinates
    setIsResolvingPlace(true);
    try {
      const geo = await geocodePlaceOrAddress({
        placeId: item.placeId,
        address: item.fullText,
        sessionToken: sessionTokenRef.current,
      });
      // Rotate session token after completing Places Autocomplete + Details session
      sessionTokenRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `yg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      if (geo && geo.lat !== undefined && geo.lng !== undefined) {
        onChange(item.name);
        onSelectLocation({
          name: item.name,
          address: geo.formattedAddress || item.fullText,
          lat: geo.lat,
          lng: geo.lng,
          source: geo.source || item.source,
        });
      }
    } catch (err) {
      console.warn('Geocode selection error:', err);
    } finally {
      setIsResolvingPlace(false);
    }
  };

  const handleEnterGeocode = async () => {
    const q = value.trim();
    if (q.length < 2) return;
    setIsResolvingPlace(true);
    try {
      const geo = await geocodePlaceOrAddress({ address: q });
      if (geo && geo.lat !== undefined && geo.lng !== undefined) {
        setIsOpen(false);
        onSelectLocation({
          name: q,
          address: geo.formattedAddress || q,
          lat: geo.lat,
          lng: geo.lng,
          source: geo.source || 'GEOCODE',
        });
      }
    } catch {
      // Ignore if not found; dropdown may already have choices
    } finally {
      setIsResolvingPlace(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 focus-within:border-amber-500 rounded-xl px-3 py-2 transition-colors">
        <span className="flex-shrink-0 text-slate-400">
          {leftIcon || <Search className="w-4 h-4 text-amber-400" />}
        </span>
        <input
          type="text"
          value={value}
          aria-label={ariaLabel || placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestions.length > 0) {
                handleSelectSuggestion(suggestions[0]);
              } else {
                handleEnterGeocode();
              }
            }
          }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
        />
        {(isSearching || isResolvingPlace) && (
          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSuggestions([]);
            }}
            className="p-0.5 text-slate-400 hover:text-white flex-shrink-0"
            title="Clear location"
            aria-label="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {rightActions}
      </div>

      {isOpen && value.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[1200] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
          <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-blue-400" />
              Location Suggestions (India & Global)
            </span>
            {providerLabel && <span className="text-[9px] text-amber-400">{providerLabel}</span>}
          </div>

          {isSearching && suggestions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Searching addresses & landmarks...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400">
              No instant matches for "{value}". Press Enter to geocode or pick a pin directly on the map.
            </div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors"
              >
                <span className="mt-0.5 flex-shrink-0">
                  {item.source === 'LOCAL_REGISTRY' ? (
                    <Compass className="w-4 h-4 text-amber-400" />
                  ) : (
                    <MapPin className="w-4 h-4 text-blue-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{item.name}</div>
                  {item.secondaryText && (
                    <div className="text-[10px] text-slate-400 truncate">{item.secondaryText}</div>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex-shrink-0">
                  {item.source === 'LOCAL_REGISTRY'
                    ? 'Verified'
                    : item.source === 'GOOGLE_PLACES'
                    ? 'Google'
                    : 'OSM'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
