import { reverseGeocodingService, ReverseGeocodeResult } from './reverseGeocodingService';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export type LocationSource = 'gps' | 'session_cache' | 'map_pin' | 'city_default';

export interface LocationResult {
  coords: LocationCoordinates;
  timestamp: number;
  source: LocationSource;
  address?: ReverseGeocodeResult;
}

export type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface LocationError {
  type: GeolocationErrorType;
  message: string;
  code?: number;
}

const SESSION_CACHE_KEY = 'yatraguard_user_location_session';
const DEFAULT_MAX_CACHE_AGE_MS = 30 * 60 * 1000; // 30 minutes

export const locationService = {
  /**
   * Distance calculation between two coordinates in kilometers (Haversine formula)
   */
  computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    return parseFloat((R * c).toFixed(2));
  },

  /**
   * Check if browser supports Geolocation API
   */
  isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  },

  /**
   * Check browser permission status if Permissions API is supported
   */
  async checkPermissionStatus(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return status.state;
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  },

  /**
   * Retrieve cached location from current session storage if fresh
   */
  getSessionCachedLocation(maxAgeMs: number = DEFAULT_MAX_CACHE_AGE_MS): LocationResult | null {
    try {
      const stored = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!stored) return null;
      const parsed: LocationResult = JSON.parse(stored);
      const age = Date.now() - parsed.timestamp;
      if (age < maxAgeMs) {
        return parsed;
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return null;
  },

  /**
   * Persist location to session storage for the current browser session
   */
  saveSessionCachedLocation(location: LocationResult): void {
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(location));
    } catch {
      // Ignore quota errors
    }
  },

  /**
   * Clear session location
   */
  clearSessionCachedLocation(): void {
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Format human-friendly time elapsed since last location fix
   */
  formatLocationAge(timestamp: number): string {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 120) return '1 minute ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    return `${Math.floor(diffSec / 3600)} hours ago`;
  },

  /**
   * Request high-accuracy GPS coordinates with timeout and address resolution
   */
  requestBrowserLocation(options?: PositionOptions): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        const err: LocationError = {
          type: 'UNSUPPORTED',
          message: 'Geolocation is not supported by your browser or environment.',
        };
        return reject(err);
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds reasonable timeout
        maximumAge: 60000, // Accept 1-minute cached OS position if available
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy || 15;

          // Perform reverse geocoding to detect city/state/address
          let address: ReverseGeocodeResult | undefined;
          try {
            address = await reverseGeocodingService.reverseGeocode(lat, lng);
          } catch {
            // Geocoding error should not fail coordinates resolution
          }

          const result: LocationResult = {
            coords: {
              lat,
              lng,
              accuracy,
              altitude: position.coords.altitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp || Date.now(),
            source: 'gps',
            address,
          };

          // Save to session cache
          this.saveSessionCachedLocation(result);
          resolve(result);
        },
        (error) => {
          let type: GeolocationErrorType = 'UNKNOWN';
          let message = 'An unknown error occurred while requesting your location.';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              type = 'PERMISSION_DENIED';
              message = 'Location access was denied. You can select your destination or pin manually.';
              break;
            case error.POSITION_UNAVAILABLE:
              type = 'POSITION_UNAVAILABLE';
              message = 'Current location is unavailable from your device GPS sensors.';
              break;
            case error.TIMEOUT:
              type = 'TIMEOUT';
              message = 'Location request timed out. Please check your signal or select a city manually.';
              break;
          }

          const locationErr: LocationError = {
            type,
            message,
            code: error.code,
          };
          reject(locationErr);
        },
        defaultOptions
      );
    });
  },
};
