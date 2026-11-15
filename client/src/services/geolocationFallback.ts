import {
  locationService,
  LocationResult,
  LocationSource,
  LocationError,
} from './locationService';
import { reverseGeocodingService } from './reverseGeocodingService';
import { City } from '../types';

export interface LocationFallbackStrategyResult {
  location: LocationResult;
  tierUsed: 1 | 2 | 3 | 4;
  strategyDescription: string;
  error?: LocationError;
}

export const geolocationFallback = {
  /**
   * Execute 4-tier location resolution:
   * 1. Browser GPS
   * 2. Session Cached Coordinates
   * 3. User Selected Map Pin (if passed)
   * 4. Destination City Fallback (e.g., Delhi or preferred city)
   */
  async resolveLocationWithFallback(params: {
    userSelectedPin?: { lat: number; lng: number; address?: string } | null;
    currentCity?: City | null;
    defaultFallbackCity?: City;
    forceRefreshGps?: boolean;
  }): Promise<LocationFallbackStrategyResult> {
    const { userSelectedPin, currentCity, defaultFallbackCity, forceRefreshGps = false } = params;

    // Tier 1: Browser GPS (if requested or permission previously granted)
    let gpsError: LocationError | undefined;
    if (forceRefreshGps || locationService.isGeolocationSupported()) {
      try {
        const gpsResult = await locationService.requestBrowserLocation();
        return {
          location: gpsResult,
          tierUsed: 1,
          strategyDescription: `High-Accuracy GPS (±${Math.round(gpsResult.coords.accuracy)}m)`,
        };
      } catch (err: any) {
        gpsError = err as LocationError;
      }
    }

    // Tier 2: Previously permitted, recent session cached coordinates
    const cached = locationService.getSessionCachedLocation();
    if (cached) {
      const ageText = locationService.formatLocationAge(cached.timestamp);
      return {
        location: {
          ...cached,
          source: 'session_cache' as LocationSource,
        },
        tierUsed: 2,
        strategyDescription: `Session Cached Coordinates (${ageText})`,
        error: gpsError,
      };
    }

    // Tier 3: User-selected location on the map
    if (userSelectedPin) {
      let addressResult;
      try {
        addressResult = await reverseGeocodingService.reverseGeocode(
          userSelectedPin.lat,
          userSelectedPin.lng
        );
      } catch {
        // ignore
      }

      return {
        location: {
          coords: {
            lat: userSelectedPin.lat,
            lng: userSelectedPin.lng,
            accuracy: 10,
          },
          timestamp: Date.now(),
          source: 'map_pin' as LocationSource,
          address: addressResult || {
            displayName: userSelectedPin.address || `${userSelectedPin.lat.toFixed(4)}, ${userSelectedPin.lng.toFixed(4)}`,
            lat: userSelectedPin.lat,
            lng: userSelectedPin.lng,
          },
        },
        tierUsed: 3,
        strategyDescription: 'User-Selected Map Pin Position',
        error: gpsError,
      };
    }

    // Tier 4: Manual City / Destination Fallback
    const targetCity = currentCity || defaultFallbackCity || {
      id: 'city-delhi',
      name: 'Delhi',
      state: 'Delhi',
      lat: 28.6139,
      lng: 77.2090,
      safetyScore: 78,
    };

    return {
      location: {
        coords: {
          lat: targetCity.lat,
          lng: targetCity.lng,
          accuracy: 5000,
        },
        timestamp: Date.now(),
        source: 'city_default' as LocationSource,
        address: {
          displayName: `${targetCity.name}, ${targetCity.state}`,
          city: targetCity.name,
          state: targetCity.state,
          lat: targetCity.lat,
          lng: targetCity.lng,
        },
      },
      tierUsed: 4,
      strategyDescription: `Default Destination Hub (${targetCity.name})`,
      error: gpsError,
    };
  },
};
