/**
 * Google Maps Platform REST & Resilient Open-Routing/Geocoding Hybrid Service
 *
 * Uses official current-generation Google Maps Platform endpoints when
 * process.env.GOOGLE_MAPS_API_KEY is configured:
 *  - Places API (New): places:searchNearby, places:searchText, places:autocomplete, places/{id}
 *  - Routes API: directions/v2:computeRoutes, distanceMatrix/v2:computeRouteMatrix
 *  - Geocoding API v4: geocode/address, geocode/location
 *
 * Keeps API keys strictly on the server (never exposed to frontend code).
 * Includes explicit X-Goog-FieldMask headers and X-Goog-Maps-Solution-ID attribution.
 */

export interface DetailedRouteStep {
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  distanceLabel: string;
  durationSeconds: number;
  durationLabel: string;
}

export interface ComputedRouteGeometry {
  id: string;
  summary: string;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  coordinates: [number, number][];
  steps: DetailedRouteStep[];
  tollInfo?: {
    hasTolls: boolean;
    estimatedAmount?: number;
    currency?: string;
    note?: string;
  };
  routingProvider: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
  isEstimated: boolean;
  labels?: string[];
}

export interface AutocompleteSuggestion {
  id: string;
  placeId?: string;
  name: string;
  secondaryText: string;
  fullText: string;
  lat?: number;
  lng?: number;
  category?: string;
  source: 'LOCAL_REGISTRY' | 'GOOGLE_PLACES' | 'NOMINATIM';
}

const SOLUTION_ID = 'gmp_git_agentskills_v1';
const NOMINATIM_UA = 'YatraGuard-TravelSafetyPlatform/2.0 (contact: support@yatraguard.org)';

export class GoogleMapsService {
  public getApiKey(): string {
    return (process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '').trim();
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return key.length > 10;
  }

  /**
   * Decodes a Google encoded polyline string into Leaflet-compatible [lat, lng][] pairs
   */
  public decodeEncodedPolyline(encoded: string): [number, number][] {
    if (!encoded) return [];
    const points: [number, number][] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    while (index < len) {
      let result = 1;
      let shift = 0;
      let b: number;
      do {
        b = encoded.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f && index < len);
      lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

      result = 1;
      shift = 0;
      do {
        if (index >= len) break;
        b = encoded.charCodeAt(index++) - 63 - 1;
        result += b << shift;
        shift += 5;
      } while (b >= 0x1f && index < len);
      lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

      points.push([lat * 1e-5, lng * 1e-5]);
    }
    return points;
  }

  private formatMeters(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDurationSeconds(seconds: number): string {
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }

  /**
   * Map YatraGuard categories & subcategories to valid Google Places API (New) Table A types
   */
  public mapCategoryToTableATypes(category: string, subCategory?: string): string[] {
    const cat = category.toUpperCase();
    const sub = (subCategory || '').toUpperCase();

    if (sub && sub !== 'ALL') {
      if (sub === 'PHARMACY_24_7' || sub === 'PHARMACY_DAY') return ['pharmacy', 'drugstore'];
      if (sub === 'TRAUMA_CENTER' || sub === 'HOSPITAL') return ['hospital', 'general_hospital'];
      if (sub === 'CLINIC') return ['medical_clinic', 'doctor', 'dental_clinic'];
      if (sub === 'DIAGNOSTIC_LAB' || sub === 'BLOOD_BANK') return ['medical_lab', 'medical_center'];
      if (sub === 'AMBULANCE') return ['hospital', 'medical_center'];
      if (sub === 'TEMPLE') return ['hindu_temple', 'church', 'mosque', 'buddhist_temple'];
      if (sub === 'PARK') return ['park', 'national_park', 'city_park', 'botanical_garden'];
      if (sub === 'MUSEUM') return ['museum', 'art_museum', 'history_museum', 'art_gallery'];
      if (sub === 'ADVENTURE') return ['adventure_sports_center', 'hiking_area', 'sports_activity_location'];
      if (sub === 'ATTRACTION') return ['tourist_attraction', 'historical_landmark', 'monument'];
      if (sub === 'CAFE') return ['cafe', 'coffee_shop', 'bakery'];
      if (sub === 'STREET_FOOD' || sub === 'FOOD_MARKET') return ['meal_takeaway', 'food_court', 'farmers_market'];
      if (sub === 'RESTAURANT') return ['restaurant'];
      if (sub === 'HOTEL') return ['hotel', 'resort_hotel'];
      if (sub === 'HOSTEL') return ['hostel'];
      if (sub === 'HOMESTAY') return ['guest_house', 'farmstay', 'bed_and_breakfast', 'lodging'];
      if (sub === 'RAILWAY_STATION') return ['train_station'];
      if (sub === 'BUS_STAND') return ['bus_station', 'bus_stop'];
      if (sub === 'METRO_STATION') return ['subway_station', 'light_rail_station'];
      if (sub === 'AUTO_STAND') return ['taxi_stand', 'taxi_service'];
      if (sub === 'PARKING') return ['parking', 'parking_garage', 'parking_lot'];
      if (sub === 'RENTAL') return ['car_rental', 'bike_sharing_station'];
      if (sub === 'MALL') return ['shopping_mall', 'department_store'];
      if (sub === 'LOCAL_MARKET' || sub === 'BAZAAR') return ['market', 'farmers_market', 'flea_market'];
      if (sub === 'LOCAL_SHOP') return ['store', 'gift_shop', 'supermarket'];
    }

    if (cat === 'PHARMACY') return ['pharmacy', 'drugstore'];
    if (cat === 'HOSPITAL') return ['hospital', 'general_hospital'];
    if (cat === 'MEDICAL_SERVICES') return ['medical_clinic', 'medical_lab', 'doctor', 'medical_center'];
    if (cat === 'EMERGENCY_SERVICES' || cat === 'POLICE') return ['police', 'hospital', 'fire_station'];
    if (cat === 'MEDICAL') return ['pharmacy', 'drugstore', 'hospital', 'medical_clinic', 'medical_lab'];
    if (cat === 'TOURISM' || cat === 'ATTRACTION')
      return ['tourist_attraction', 'museum', 'park', 'hindu_temple', 'historical_landmark', 'adventure_sports_center'];
    if (cat === 'FOOD' || cat === 'RESTAURANT') return ['restaurant', 'cafe', 'bakery', 'food_court', 'meal_takeaway'];
    if (cat === 'ACCOMMODATION' || cat === 'HOTEL') return ['hotel', 'hostel', 'guest_house', 'lodging', 'resort_hotel'];
    if (cat === 'TRANSPORT')
      return ['train_station', 'bus_station', 'subway_station', 'taxi_stand', 'transit_station', 'parking', 'car_rental'];
    if (cat === 'SHOPPING') return ['shopping_mall', 'market', 'department_store', 'supermarket', 'store'];

    return [];
  }

  /**
   * Query Places API (New): searchNearby or searchText
   */
  public async searchNearbyPlaces(params: {
    lat: number;
    lng: number;
    radiusMeters: number;
    category: string;
    subCategory?: string;
    query?: string;
  }): Promise<any[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    const { lat, lng, radiusMeters, category, subCategory, query } = params;
    const clampedRadius = Math.max(200, Math.min(50000.0, radiusMeters));
    const includedTypes = this.mapCategoryToTableATypes(category, subCategory);

    const fieldMask =
      'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.primaryType,places.nationalPhoneNumber,places.regularOpeningHours,places.currentOpeningHours,places.websiteUri,places.googleMapsUri,places.businessStatus';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let url = 'https://places.googleapis.com/v1/places:searchNearby';
      let payload: any;

      if (query && query.trim().length > 0) {
        url = 'https://places.googleapis.com/v1/places:searchText';
        payload = {
          textQuery: query.trim(),
          maxResultCount: 20,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: clampedRadius,
            },
          },
        };
        if (includedTypes.length === 1) {
          payload.includedType = includedTypes[0];
        }
      } else {
        payload = {
          maxResultCount: 20,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: clampedRadius,
            },
          },
        };
        if (includedTypes.length > 0) {
          payload.includedTypes = includedTypes;
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': SOLUTION_ID,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn('Google Places API (New) non-OK status:', res.status);
        return [];
      }

      const data: any = await res.json();
      if (!data.places || !Array.isArray(data.places)) return [];

      return data.places.map((p: any) => {
        const types: string[] = p.types || [];
        const primaryType: string = p.primaryType || types[0] || '';
        const hasOpeningInfo = p.currentOpeningHours?.openNow !== undefined;
        const isOpen: boolean | null = hasOpeningInfo ? Boolean(p.currentOpeningHours.openNow) : null;
        const weekdayText: string | undefined = p.regularOpeningHours?.weekdayDescriptions?.[0];
        const allHoursText = (p.regularOpeningHours?.weekdayDescriptions || []).join(' | ').toLowerCase();
        const is24H = allHoursText.includes('open 24 hours') || (weekdayText || '').toLowerCase().includes('24 hours');

        let mappedCat = 'TOURIST_INFO';
        let mappedSub: string | null = primaryType ? primaryType.toUpperCase() : null;

        if (types.includes('pharmacy') || types.includes('drugstore')) {
          mappedCat = 'PHARMACY';
          mappedSub = is24H ? 'PHARMACY_24_7' : 'PHARMACY_DAY';
        } else if (types.includes('hospital') || types.includes('general_hospital')) {
          mappedCat = 'HOSPITAL';
          mappedSub = 'HOSPITAL';
        } else if (types.includes('medical_clinic') || types.includes('doctor') || types.includes('medical_lab')) {
          mappedCat = 'HOSPITAL';
          mappedSub = types.includes('medical_lab') ? 'DIAGNOSTIC_LAB' : 'CLINIC';
        } else if (types.includes('police') || types.includes('fire_station')) {
          mappedCat = 'POLICE';
          mappedSub = primaryType.toUpperCase();
        } else if (types.includes('restaurant') || types.includes('cafe') || types.includes('bakery') || types.includes('food_court')) {
          mappedCat = 'RESTAURANT';
          mappedSub = types.includes('cafe') ? 'CAFE' : 'RESTAURANT';
        } else if (types.includes('hotel') || types.includes('lodging') || types.includes('hostel') || types.includes('guest_house')) {
          mappedCat = 'HOTEL';
          mappedSub = types.includes('hostel') ? 'HOSTEL' : types.includes('guest_house') ? 'HOMESTAY' : 'HOTEL';
        } else if (
          types.includes('transit_station') ||
          types.includes('bus_station') ||
          types.includes('train_station') ||
          types.includes('subway_station') ||
          types.includes('taxi_stand') ||
          types.includes('parking') ||
          types.includes('car_rental')
        ) {
          mappedCat = 'TRANSPORT';
          if (types.includes('subway_station')) mappedSub = 'METRO_STATION';
          else if (types.includes('train_station')) mappedSub = 'RAILWAY_STATION';
          else if (types.includes('bus_station')) mappedSub = 'BUS_STAND';
          else if (types.includes('parking')) mappedSub = 'PARKING';
          else if (types.includes('car_rental')) mappedSub = 'RENTAL';
          else mappedSub = 'AUTO_STAND';
        } else if (types.includes('shopping_mall') || types.includes('market') || types.includes('department_store') || types.includes('store')) {
          mappedCat = 'SHOPPING';
          mappedSub = types.includes('shopping_mall') ? 'MALL' : 'LOCAL_MARKET';
        }

        const openStatusLabel = is24H
          ? 'Open 24/7'
          : isOpen === true
          ? 'Open Now'
          : isOpen === false
          ? 'Closed Now'
          : 'Hours unavailable';

        return {
          id: `gp_${p.id}`,
          placeId: p.id,
          name: p.displayName?.text || 'Discovered Place',
          category: mappedCat,
          subCategory: mappedSub,
          lat: p.location?.latitude ?? lat,
          lng: p.location?.longitude ?? lng,
          address: p.formattedAddress || 'Address available on Google Maps',
          phone: p.nationalPhoneNumber || null,
          rating: p.rating ?? null,
          openStatus: openStatusLabel,
          openingHours: weekdayText || (is24H ? 'Open 24 hours' : null),
          isOpenNow: isOpen,
          is24Hours: is24H,
          isVerified: true,
          website: p.websiteUri || null,
          googleMapsUri: p.googleMapsUri || null,
        };
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('Google Places fetch exception:', err);
      return [];
    }
  }

  /**
   * Autocomplete worldwide (Google Places Autocomplete New -> fallback OpenStreetMap Nominatim)
   */
  public async autocompletePlaces(params: {
    input: string;
    lat?: number;
    lng?: number;
    sessionToken?: string;
  }): Promise<{ suggestions: AutocompleteSuggestion[]; provider: 'GOOGLE_PLACES' | 'NOMINATIM' | 'LOCAL' }> {
    const query = params.input.trim();
    if (query.length < 2) return { suggestions: [], provider: 'LOCAL' };

    const apiKey = this.getApiKey();
    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const body: any = { input: query };
        if (params.sessionToken) body.sessionToken = params.sessionToken;
        if (params.lat !== undefined && params.lng !== undefined) {
          body.origin = { latitude: params.lat, longitude: params.lng };
          body.locationBias = {
            circle: {
              center: { latitude: params.lat, longitude: params.lng },
              radius: 50000.0,
            },
          };
        }

        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
            'X-Goog-Maps-Solution-ID': SOLUTION_ID,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          const list: AutocompleteSuggestion[] = (data.suggestions || [])
            .filter((s: any) => s.placePrediction)
            .map((s: any) => {
              const pred = s.placePrediction;
              const main = pred.structuredFormat?.mainText?.text || pred.text?.text || query;
              const sec = pred.structuredFormat?.secondaryText?.text || '';
              return {
                id: `gp_pred_${pred.placeId}`,
                placeId: pred.placeId,
                name: main,
                secondaryText: sec,
                fullText: pred.text?.text || `${main} ${sec}`.trim(),
                category: pred.types?.[0]?.toUpperCase(),
                source: 'GOOGLE_PLACES',
              };
            });
          if (list.length > 0) return { suggestions: list, provider: 'GOOGLE_PLACES' };
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    // Fallback to worldwide OpenStreetMap Nominatim search
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': NOMINATIM_UA,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const items: any = await res.json();
        if (Array.isArray(items)) {
          const list: AutocompleteSuggestion[] = items.map((item: any, idx: number) => {
            const parts = String(item.display_name || '').split(',').map((p) => p.trim());
            return {
              id: `osm_${item.place_id || idx}`,
              name: item.name || parts[0] || query,
              secondaryText: parts.slice(1, 4).join(', '),
              fullText: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              category: String(item.type || item.class || 'PLACE').toUpperCase(),
              source: 'NOMINATIM',
            };
          });
          return { suggestions: list, provider: 'NOMINATIM' };
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    return { suggestions: [], provider: 'LOCAL' };
  }

  /**
   * Resolve a Google Place ID or text address to lat/lng + formattedAddress
   */
  public async geocodeLocation(params: {
    placeId?: string;
    address?: string;
    sessionToken?: string;
  }): Promise<{ lat: number; lng: number; formattedAddress: string; source: string } | null> {
    const apiKey = this.getApiKey();

    if (apiKey && params.placeId) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const qs = params.sessionToken ? `?sessionToken=${encodeURIComponent(params.sessionToken)}` : '';
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(params.placeId)}${qs}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
              'X-Goog-Maps-Solution-ID': SOLUTION_ID,
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          const d: any = await res.json();
          if (d.location?.latitude !== undefined) {
            return {
              lat: d.location.latitude,
              lng: d.location.longitude,
              formattedAddress: d.formattedAddress || d.displayName?.text || '',
              source: 'GOOGLE_PLACES',
            };
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    if (params.address && params.address.trim()) {
      const addr = params.address.trim();
      if (apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          const url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(addr)}?languageCode=en`;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'results.location,results.formattedAddress',
              'X-Goog-Maps-Solution-ID': SOLUTION_ID,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const d: any = await res.json();
            const first = d.results?.[0];
            if (first?.location?.latitude !== undefined) {
              return {
                lat: first.location.latitude,
                lng: first.location.longitude,
                formattedAddress: first.formattedAddress || addr,
                source: 'GOOGLE_GEOCODING',
              };
            }
          }
        } catch {
          clearTimeout(timeoutId);
        }
      }

      // Nominatim fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`,
          {
            headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data) && data[0]) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              formattedAddress: data[0].display_name || addr,
              source: 'NOMINATIM',
            };
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    return null;
  }

  /**
   * Reverse Geocode coordinates using Google Geocoding v4 -> fallback Nominatim
   */
  public async reverseGeocodeCoordinates(lat: number, lng: number): Promise<{
    formattedAddress: string;
    city?: string;
    state?: string;
    country?: string;
    source: string;
  }> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const url = `https://geocode.googleapis.com/v4/geocode/location?location.latitude=${lat}&location.longitude=${lng}&languageCode=en`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'results.formattedAddress,results.addressComponents',
            'X-Goog-Maps-Solution-ID': SOLUTION_ID,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data: any = await res.json();
          const first = data.results?.[0];
          if (first?.formattedAddress) {
            const comps: any[] = first.addressComponents || [];
            const findComp = (t: string) => comps.find((c) => c.types?.includes(t))?.longText;
            return {
              formattedAddress: first.formattedAddress,
              city: findComp('locality') || findComp('administrative_area_level_2'),
              state: findComp('administrative_area_level_1'),
              country: findComp('country'),
              source: 'GOOGLE_GEOCODING',
            };
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    // Fallback to OpenStreetMap Nominatim
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: { 'User-Agent': NOMINATIM_UA, Accept: 'application/json' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const d: any = await res.json();
        const addr = d.address || {};
        const city = addr.city || addr.town || addr.village || addr.state_district;
        return {
          formattedAddress: d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          city,
          state: addr.state,
          country: addr.country,
          source: 'NOMINATIM',
        };
      }
    } catch {
      clearTimeout(timeoutId);
    }

    return {
      formattedAddress: `Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      source: 'COORDINATES_ONLY',
    };
  }

  /**
   * Batch compute actual road distance & driving duration from origin to multiple destinations
   * using Google Routes API computeRouteMatrix or OSRM Table API.
   */
  public async computeRoadMatrix(
    origin: { lat: number; lng: number },
    destinations: Array<{ lat: number; lng: number }>
  ): Promise<Map<number, { roadDistanceKm: number; drivingTimeMin: number; source: 'GOOGLE_ROUTES' | 'OSRM_ROAD' }>> {
    const resultMap = new Map<
      number,
      { roadDistanceKm: number; drivingTimeMin: number; source: 'GOOGLE_ROUTES' | 'OSRM_ROAD' }
    >();
    if (destinations.length === 0) return resultMap;

    const batch = destinations.slice(0, 25);
    const apiKey = this.getApiKey();

    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
            'X-Goog-Maps-Solution-ID': SOLUTION_ID,
          },
          body: JSON.stringify({
            origins: [
              {
                waypoint: {
                  location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
                },
              },
            ],
            destinations: batch.map((d) => ({
              waypoint: {
                location: { latLng: { latitude: d.lat, longitude: d.lng } },
              },
            })),
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const rows: any = await res.json();
          if (Array.isArray(rows)) {
            for (const row of rows) {
              if (row.condition === 'ROUTE_EXISTS' && row.distanceMeters) {
                const durSec = parseInt(String(row.duration || '60s').replace('s', ''), 10) || 60;
                resultMap.set(row.destinationIndex, {
                  roadDistanceKm: Math.round((row.distanceMeters / 1000) * 10) / 10,
                  drivingTimeMin: Math.max(2, Math.round(durSec / 60)),
                  source: 'GOOGLE_ROUTES',
                });
              }
            }
            if (resultMap.size > 0) return resultMap;
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    // Fallback: OSRM Table API (real road distances & durations for top candidates)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const coordsList = [
        `${origin.lng},${origin.lat}`,
        ...batch.map((d) => `${d.lng},${d.lat}`),
      ].join(';');
      const destIndices = batch.map((_, idx) => idx + 1).join(';');
      const url = `https://router.project-osrm.org/table/v1/driving/${coordsList}?sources=0&destinations=${destIndices}&annotations=distance,duration`;

      const res = await fetch(url, {
        headers: { 'User-Agent': NOMINATIM_UA },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const distances: number[] | undefined = data.distances?.[0];
        const durations: number[] | undefined = data.durations?.[0];
        if (Array.isArray(distances) && Array.isArray(durations)) {
          distances.forEach((distM, idx) => {
            if (typeof distM === 'number' && distM > 0) {
              const durS = typeof durations[idx] === 'number' ? durations[idx] : (distM / 1000 / 30) * 3600;
              resultMap.set(idx, {
                roadDistanceKm: Math.round((distM / 1000) * 10) / 10,
                drivingTimeMin: Math.max(2, Math.round(durS / 60)),
                source: 'OSRM_ROAD',
              });
            }
          });
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    return resultMap;
  }

  /**
   * Compute full routes with polyline geometry, alternative routes, toll advisory, and turn-by-turn steps
   * via Google Routes API (computeRoutes) -> fallback OSRM -> fallback straight/terrain estimate.
   */
  public async computeDetailedRoutes(params: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
    avoidTolls?: boolean;
    avoidHighways?: boolean;
  }): Promise<{
    routes: ComputedRouteGeometry[];
    provider: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
    notice: string;
  }> {
    const {
      origin,
      destination,
      travelMode = 'DRIVE',
      avoidTolls = false,
      avoidHighways = false,
    } = params;

    const apiKey = this.getApiKey();

    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const body: any = {
          origin: {
            location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
          },
          destination: {
            location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
          },
          travelMode,
          computeAlternativeRoutes: travelMode !== 'TRANSIT',
          languageCode: 'en-US',
          units: 'METRIC',
        };

        if (travelMode === 'DRIVE') {
          body.routingPreference = 'TRAFFIC_AWARE';
          body.extraComputations = ['TOLLS'];
          body.routeModifiers = {
            avoidTolls,
            avoidHighways,
            avoidFerries: false,
          };
        }

        const fieldMask = [
          'routes.duration',
          'routes.distanceMeters',
          'routes.polyline.encodedPolyline',
          'routes.routeLabels',
          'routes.legs.steps.navigationInstruction',
          'routes.legs.steps.distanceMeters',
          'routes.legs.steps.staticDuration',
          ...(travelMode === 'DRIVE' ? ['routes.travelAdvisory.tollInfo'] : []),
        ].join(',');

        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
            'X-Goog-Maps-Solution-ID': SOLUTION_ID,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data.routes) && data.routes.length > 0) {
            const parsedRoutes: ComputedRouteGeometry[] = data.routes.map((r: any, idx: number) => {
              const distM = r.distanceMeters || 0;
              const distKm = Math.round((distM / 1000) * 10) / 10;
              const durSec = parseInt(String(r.duration || '60s').replace('s', ''), 10) || 60;
              const durMin = Math.max(1, Math.round(durSec / 60));
              const coords = this.decodeEncodedPolyline(r.polyline?.encodedPolyline || '');

              const rawSteps: any[] = r.legs?.[0]?.steps || [];
              const steps: DetailedRouteStep[] = rawSteps
                .filter((st) => st.navigationInstruction?.instructions)
                .map((st) => {
                  const sDist = st.distanceMeters || 0;
                  const sDur = parseInt(String(st.staticDuration || '0s').replace('s', ''), 10) || 0;
                  return {
                    instruction: st.navigationInstruction.instructions,
                    maneuver: st.navigationInstruction.maneuver || 'STRAIGHT',
                    distanceMeters: sDist,
                    distanceLabel: this.formatMeters(sDist),
                    durationSeconds: sDur,
                    durationLabel: this.formatDurationSeconds(sDur),
                  };
                });

              const tollPrices: any[] = r.travelAdvisory?.tollInfo?.estimatedPrice || [];
              const firstToll = tollPrices[0];

              return {
                id: `google_route_${idx}`,
                summary:
                  idx === 0
                    ? 'Primary Recommended Route'
                    : `Alternative Route ${idx}`,
                distanceKm: distKm,
                distanceLabel: this.formatMeters(distM),
                durationMinutes: durMin,
                durationLabel: this.formatDurationSeconds(durSec),
                coordinates: coords.length > 1 ? coords : [[origin.lat, origin.lng], [destination.lat, destination.lng]],
                steps,
                tollInfo: firstToll
                  ? {
                      hasTolls: true,
                      estimatedAmount: Number(firstToll.units || 0),
                      currency: firstToll.currencyCode || 'INR',
                      note: `Estimated highway toll: ${firstToll.currencyCode || 'INR'} ${firstToll.units || 0}`,
                    }
                  : { hasTolls: false },
                routingProvider: 'GOOGLE_ROUTES',
                isEstimated: false,
                labels: r.routeLabels || [],
              };
            });

            return {
              routes: parsedRoutes,
              provider: 'GOOGLE_ROUTES',
              notice: 'Live road geometry, alternatives, and turn-by-turn steps computed via Google Routes API.',
            };
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Google Routes API error:', err);
      }
    }

    // Fallback: OSRM (note: OSRM supports driving, foot, bike — not public transit)
    if (travelMode !== 'TRANSIT') {
      const osrmProfile = travelMode === 'WALK' ? 'foot' : travelMode === 'BICYCLE' ? 'bike' : 'driving';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      try {
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
        const res = await fetch(url, {
          headers: { 'User-Agent': NOMINATIM_UA },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (Array.isArray(data.routes) && data.routes.length > 0) {
            const parsedRoutes: ComputedRouteGeometry[] = data.routes.map((r: any, idx: number) => {
              const distM = r.distance || 0;
              const distKm = Math.round((distM / 1000) * 10) / 10;
              const durSec = r.duration || 60;
              const durMin = Math.max(1, Math.round(durSec / 60));
              const coordinates: [number, number][] = (r.geometry?.coordinates || []).map(
                (c: [number, number]) => [c[1], c[0]]
              );

              const rawSteps: any[] = r.legs?.[0]?.steps || [];
              const steps: DetailedRouteStep[] = rawSteps.map((st) => {
                const mType = st.maneuver?.type || 'continue';
                const mod = st.maneuver?.modifier ? ` ${st.maneuver.modifier}` : '';
                const roadName = st.name ? ` onto ${st.name}` : '';
                const instruction =
                  mType === 'depart'
                    ? `Head${mod}${st.name ? ` on ${st.name}` : ''}`
                    : mType === 'arrive'
                    ? 'Arrive at your destination'
                    : `${mType.charAt(0).toUpperCase() + mType.slice(1)}${mod}${roadName}`;
                const sDist = st.distance || 0;
                const sDur = st.duration || 0;
                return {
                  instruction: instruction.trim(),
                  maneuver: mType.toUpperCase(),
                  distanceMeters: Math.round(sDist),
                  distanceLabel: this.formatMeters(sDist),
                  durationSeconds: Math.round(sDur),
                  durationLabel: this.formatDurationSeconds(sDur),
                };
              });

              return {
                id: `osrm_route_${idx}`,
                summary: idx === 0 ? `Recommended (${r.legs?.[0]?.summary || 'Road Route'})` : `Alternative (${r.legs?.[0]?.summary || `Option ${idx + 1}`})`,
                distanceKm: distKm,
                distanceLabel: this.formatMeters(distM),
                durationMinutes: durMin,
                durationLabel: this.formatDurationSeconds(durSec),
                coordinates: coordinates.length > 1 ? coordinates : [[origin.lat, origin.lng], [destination.lat, destination.lng]],
                steps,
                tollInfo: { hasTolls: false, note: 'Toll detection unavailable without Google Routes API key' },
                routingProvider: 'OSRM_ROAD',
                isEstimated: false,
              };
            });

            return {
              routes: parsedRoutes,
              provider: 'OSRM_ROAD',
              notice: apiKey
                ? 'Google Routes unavailable for this corridor; showing live OpenStreetMap OSRM road route.'
                : 'Google Routes API key not configured; showing live OpenStreetMap (OSRM) road geometry and turn-by-turn directions.',
            };
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
    }

    // Final non-fabricated terrain-calibrated estimate if routing service unreachable or TRANSIT without Google key
    return {
      routes: [],
      provider: 'ESTIMATED_TERRAIN',
      notice:
        travelMode === 'TRANSIT' && !apiKey
          ? 'Live public transit timetable routing requires GOOGLE_MAPS_API_KEY in server/.env. Distance and corridor fares are estimated using verified terrain parameters.'
          : 'Live road routing service is temporarily unreachable. Showing terrain-calibrated distance and travel estimates.',
    };
  }
}

export const googleMapsService = new GoogleMapsService();
