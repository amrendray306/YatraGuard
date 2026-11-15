export interface ReverseGeocodeResult {
  displayName: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat: number;
  lng: number;
  isFallback?: boolean;
}

const memoryCache = new Map<string, ReverseGeocodeResult>();
const CACHE_PREFIX = 'yatraguard_rev_geo_';

export const reverseGeocodingService = {
  getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  },

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const key = this.getCacheKey(lat, lng);

    // 1. Check in-memory cache
    if (memoryCache.has(key)) {
      return memoryCache.get(key)!;
    }

    // 2. Check session storage cache
    try {
      const stored = sessionStorage.getItem(CACHE_PREFIX + key);
      if (stored) {
        const parsed: ReverseGeocodeResult = JSON.parse(stored);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {
      // Ignore sessionStorage issues
    }

    // 3. Fetch from OpenStreetMap Nominatim with a 4-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'YatraGuard-TravelSafetyPlatform/2.0 (contact: support@yatraguard.org)',
            Accept: 'application/json',
          },
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const road = address.road || address.pedestrian || address.street;
        const suburb = address.suburb || address.neighbourhood || address.quarter;
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.state_district;
        const state = address.state;
        const country = address.country;
        const postcode = address.postcode;

        // Construct concise readable title
        const parts = [road, suburb, city, state].filter(Boolean);
        const displayName = parts.length > 0 ? parts.join(', ') : data.display_name;

        const result: ReverseGeocodeResult = {
          displayName: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          road,
          suburb,
          city,
          state,
          country,
          postcode,
          lat,
          lng,
          isFallback: false,
        };

        // Cache result
        memoryCache.set(key, result);
        try {
          sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(result));
        } catch {
          // ignore session quota error
        }

        return result;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Fallback
    }

    // 4. Return formatted coordinate fallback
    const fallback: ReverseGeocodeResult = {
      displayName: `Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      lat,
      lng,
      isFallback: true,
    };
    memoryCache.set(key, fallback);
    return fallback;
  },
};
