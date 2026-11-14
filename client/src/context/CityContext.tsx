import React, { createContext, useContext, useState, useEffect } from 'react';
import { City, SafetyScoreData } from '../types';
import { fetchCities, fetchSafetyScore } from '../services/api';

interface CityContextType {
  cities: City[];
  currentCity: City | null;
  userCoords: { lat: number; lng: number };
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied';
  safetyScoreData: SafetyScoreData | null;
  isLoading: boolean;
  setCity: (city: City) => void;
  setUserCoords: (coords: { lat: number; lng: number }) => void;
  refreshSafetyScore: () => Promise<void>;
  requestUserLocation: () => Promise<boolean>;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

// Helper to calculate distance in km
function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 28.6139,
    lng: 77.2090,
  }); // Default to Delhi (National Hub)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>('idle');
  const [safetyScoreData, setSafetyScoreData] = useState<SafetyScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cities on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCities();
        setCities(data);
        if (data.length > 0) {
          // Default to Manali or Delhi
          const preferred =
            data.find((c: City) => c.name === 'Manali') ||
            data.find((c: City) => c.name === 'Delhi') ||
            data[0];
          setCurrentCity(preferred);
          setUserCoords({ lat: preferred.lat, lng: preferred.lng });
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Recalculate safety score whenever city or coords change
  const refreshSafetyScore = async () => {
    if (!currentCity) return;
    try {
      const score = await fetchSafetyScore(userCoords.lat, userCoords.lng, currentCity.id);
      setSafetyScoreData(score);
    } catch (err) {
      console.error('Failed to calculate safety score:', err);
    }
  };

  useEffect(() => {
    if (currentCity) {
      refreshSafetyScore();
    }
  }, [currentCity, userCoords]);

  const setCity = (city: City) => {
    setCurrentCity(city);
    setUserCoords({ lat: city.lat, lng: city.lng });
  };

  /**
   * Request GPS Geolocation from browser with explicit permission handling
   */
  const requestUserLocation = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return false;
    }

    setGpsStatus('locating');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setGpsStatus('granted');

          // Auto-match nearest supported city
          if (cities.length > 0) {
            let closest = cities[0];
            let minD = distanceBetween(lat, lng, closest.lat, closest.lng);
            for (const c of cities) {
              const d = distanceBetween(lat, lng, c.lat, c.lng);
              if (d < minD) {
                minD = d;
                closest = c;
              }
            }
            setCurrentCity(closest);
          }
          resolve(true);
        },
        (err) => {
          console.warn('Geolocation access denied or failed:', err);
          setGpsStatus('denied');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  return (
    <CityContext.Provider
      value={{
        cities,
        currentCity,
        userCoords,
        gpsStatus,
        safetyScoreData,
        isLoading,
        setCity,
        setUserCoords,
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
