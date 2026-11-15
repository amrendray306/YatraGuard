import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { City, SafetyScoreData } from '../types';
import { fetchCities, fetchSafetyScore } from '../services/api';
import { locationService, LocationSource } from '../services/locationService';
import { geolocationFallback } from '../services/geolocationFallback';
import { mapProviderService } from '../services/mapProviderService';
import { reverseGeocodingService } from '../services/reverseGeocodingService';

export interface ReportPinData {
  lat: number;
  lng: number;
  address?: string;
  timestamp?: number;
}

interface CityContextType {
  cities: City[];
  currentCity: City | null;
  userCoords: { lat: number; lng: number };
  userAddress: string;
  detectedCityName: string | null;
  locationSource: LocationSource;
  locationAccuracy: number | null;
  lastLocationUpdate: Date | null;
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied';
  locationError: string | null;
  safetyScoreData: SafetyScoreData | null;
  isLoading: boolean;
  // Pin Reporting Mode
  isReportPinMode: boolean;
  reportPin: ReportPinData | null;
  setIsReportPinMode: (active: boolean) => void;
  setReportPin: (pin: ReportPinData | null) => void;
  dropReportPinAt: (lat: number, lng: number) => Promise<void>;
  // Map Provider Management
  currentMapProviderId: string;
  setCurrentMapProviderId: (id: string) => void;
  switchMapProviderFallback: () => string;
  // Context Actions
  setCity: (city: City) => void;
  setUserCoords: (coords: { lat: number; lng: number }) => void;
  setUserSelectedPin: (coords: { lat: number; lng: number }, address?: string) => Promise<void>;
  refreshSafetyScore: () => Promise<void>;
  requestUserLocation: (forcePrompt?: boolean) => Promise<boolean>;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 28.6139,
    lng: 77.209,
  }); // Default to Delhi (National Hub)
  const [userAddress, setUserAddress] = useState<string>('Delhi, India');
  const [detectedCityName, setDetectedCityName] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource>('city_default');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>('idle');
  const [safetyScoreData, setSafetyScoreData] = useState<SafetyScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Report Pin on Map
  const [isReportPinMode, setIsReportPinMode] = useState(false);
  const [reportPin, setReportPin] = useState<ReportPinData | null>(null);

  // Map Provider Fallback Management
  const [currentMapProviderId, setCurrentMapProviderId] = useState<string>('carto-voyager');

  // Match coordinates to closest supported city in database
  const matchNearestCity = useCallback(
    (lat: number, lng: number, cityList: City[]): City | null => {
      if (!cityList || cityList.length === 0) return null;
      let closest = cityList[0];
      let minDistance = locationService.computeDistanceKm(lat, lng, closest.lat, closest.lng);

      for (const c of cityList) {
        const d = locationService.computeDistanceKm(lat, lng, c.lat, c.lng);
        if (d < minDistance) {
          minDistance = d;
          closest = c;
        }
      }
      return closest;
    },
    []
  );

  // Load cities and inspect session cached location on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCities();
        setCities(data);

        // Check if user has a valid cached location in this session
        const cached = locationService.getSessionCachedLocation();
        if (cached) {
          setUserCoords({ lat: cached.coords.lat, lng: cached.coords.lng });
          setLocationAccuracy(cached.coords.accuracy);
          setLocationSource('session_cache');
          setLastLocationUpdate(new Date(cached.timestamp));
          setGpsStatus('granted');

          if (cached.address?.displayName) {
            setUserAddress(cached.address.displayName);
            setDetectedCityName(cached.address.city || null);
          }

          const matchedCity = matchNearestCity(cached.coords.lat, cached.coords.lng, data);
          if (matchedCity) {
            setCurrentCity(matchedCity);
          }
        } else if (data.length > 0) {
          const preferred =
            data.find((c: City) => c.name === 'Manali') ||
            data.find((c: City) => c.name === 'Delhi') ||
            data[0];
          setCurrentCity(preferred);
          setUserCoords({ lat: preferred.lat, lng: preferred.lng });
          setUserAddress(`${preferred.name}, ${preferred.state}`);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [matchNearestCity]);

  // Recalculate safety score whenever city or coords change
  const refreshSafetyScore = useCallback(async () => {
    if (!currentCity) return;
    try {
      const score = await fetchSafetyScore(userCoords.lat, userCoords.lng, currentCity.id);
      setSafetyScoreData(score);
    } catch (err) {
      console.error('Failed to calculate safety score:', err);
    }
  }, [currentCity, userCoords.lat, userCoords.lng]);

  useEffect(() => {
    if (currentCity) {
      refreshSafetyScore();
    }
  }, [currentCity, userCoords, refreshSafetyScore]);

  const setCity = (city: City) => {
    setCurrentCity(city);
    setUserCoords({ lat: city.lat, lng: city.lng });
    setUserAddress(`${city.name}, ${city.state}`);
    setLocationSource('city_default');
    setLocationAccuracy(null);
  };

  /**
   * Request GPS Geolocation from browser with high accuracy & reverse geocoding
   */
  const requestUserLocation = async (forcePrompt: boolean = false): Promise<boolean> => {
    setGpsStatus('locating');
    setLocationError(null);

    try {
      const fallbackResult = await geolocationFallback.resolveLocationWithFallback({
        currentCity,
        defaultFallbackCity: cities[0],
        forceRefreshGps: true,
      });

      const { location, tierUsed } = fallbackResult;
      const { lat, lng, accuracy } = location.coords;

      setUserCoords({ lat, lng });
      setLocationAccuracy(accuracy);
      setLocationSource(location.source);
      setLastLocationUpdate(new Date(location.timestamp));
      setGpsStatus(tierUsed === 1 || tierUsed === 2 ? 'granted' : 'denied');

      if (location.address?.displayName) {
        setUserAddress(location.address.displayName);
        setDetectedCityName(location.address.city || null);
      }

      // Match closest city
      const matched = matchNearestCity(lat, lng, cities);
      if (matched) {
        setCurrentCity(matched);
      }

      if (fallbackResult.error) {
        setLocationError(fallbackResult.error.message);
      }

      return tierUsed === 1 || tierUsed === 2;
    } catch (err: any) {
      setGpsStatus('denied');
      setLocationError(err?.message || 'Unable to detect geolocation.');
      return false;
    }
  };

  /**
   * Drop report pin dynamically on the map
   */
  const dropReportPinAt = async (lat: number, lng: number) => {
    try {
      const rev = await reverseGeocodingService.reverseGeocode(lat, lng);
      setReportPin({
        lat,
        lng,
        address: rev.displayName,
        timestamp: Date.now(),
      });
    } catch {
      setReportPin({
        lat,
        lng,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        timestamp: Date.now(),
      });
    }
  };

  /**
   * Set user coordinates to a pinned or selected location
   */
  const setUserSelectedPin = async (coords: { lat: number; lng: number }, address?: string) => {
    setUserCoords(coords);
    setLocationSource('map_pin');
    setLocationAccuracy(5);
    setLastLocationUpdate(new Date());

    if (address) {
      setUserAddress(address);
    } else {
      const rev = await reverseGeocodingService.reverseGeocode(coords.lat, coords.lng);
      setUserAddress(rev.displayName);
      setDetectedCityName(rev.city || null);
    }

    const matched = matchNearestCity(coords.lat, coords.lng, cities);
    if (matched) {
      setCurrentCity(matched);
    }
  };

  /**
   * Switch Map Provider fallback on tile failure
   */
  const switchMapProviderFallback = (): string => {
    const next = mapProviderService.getNextFallbackProvider(currentMapProviderId);
    setCurrentMapProviderId(next.id);
    return next.name;
  };

  return (
    <CityContext.Provider
      value={{
        cities,
        currentCity,
        userCoords,
        userAddress,
        detectedCityName,
        locationSource,
        locationAccuracy,
        lastLocationUpdate,
        gpsStatus,
        locationError,
        safetyScoreData,
        isLoading,
        isReportPinMode,
        reportPin,
        setIsReportPinMode,
        setReportPin,
        dropReportPinAt,
        currentMapProviderId,
        setCurrentMapProviderId,
        switchMapProviderFallback,
        setCity,
        setUserCoords,
        setUserSelectedPin,
        refreshSafetyScore,
        requestUserLocation,
      }}
    >
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
