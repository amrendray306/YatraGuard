import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm, formatDistance } from './geoService.js';
import { fareEstimationService } from './FareEstimationService.js';
import { googleMapsService, AutocompleteSuggestion } from './googleMapsService.js';
import { evaluateRouteSafety } from './routeRiskEngine.js';

const prisma = new PrismaClient();

export interface PlaceSearchParams {
  query?: string;
  category?: string;
  subCategory?: string;
  cityId?: string;
  strictCityFilter?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  openNow?: boolean;
  is24Hours?: boolean;
  sortBy?: 'distance' | 'roadDistance' | 'fastest' | 'category' | 'rating';
  limit?: number;
}

export interface EnrichedPlace {
  id: string;
  placeId?: string;
  name: string;
  category: string;
  subCategory?: string | null;
  lat: number;
  lng: number;
  address: string;
  phone?: string | null;
  rating?: number | null;
  openStatus: string;
  openingHours?: string | null;
  isOpenNow: boolean | null;
  is24Hours: boolean;
  isVerified: boolean;
  cityId?: string;
  cityName?: string;
  straightLineDistanceKm: number;
  straightLineLabel: string;
  roadDistanceKm: number;
  roadDistanceLabel: string;
  distanceSource: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
  estimatedDrivingTimeMin: number;
  estimatedWalkingTimeMin: number;
  estimatedCyclingTimeMin: number;
  source: 'OFFICIAL_REGISTRY' | 'GOOGLE_PLACES' | 'COMMUNITY_VERIFIED';
  website?: string | null;
  googleMapsUri?: string | null;
}

export interface MultimodalFareBreakdown {
  baseFare: number;
  distanceCharge: number;
  waitingCharge: number;
  nightCharge: number;
  hillSurcharge: number;
  tollCharge: number;
  luggageCharge: number;
}

export interface MultimodalFareOption {
  modeId: string;
  name: string;
  vehicleType: string;
  durationMin: number;
  distanceKm: number;
  fareMin: number;
  fareAvg: number;
  fareMax: number;
  fareLabel: string;
  priceType:
    | 'OFFICIAL_GOVT'
    | 'LIVE_PROVIDER'
    | 'ESTIMATED'
    | 'COMMUNITY_VERIFIED'
    | 'COMMUNITY_REPORTED'
    | 'UNAVAILABLE';
  priceTypeLabel:
    | 'Official Price'
    | 'Live Provider Price'
    | 'Estimated Price'
    | 'Verified Community Price'
    | 'Community-Reported Price'
    | 'Fare information unavailable';
  description: string;
  conditions: string[];
  breakdown?: MultimodalFareBreakdown;
  isAvailable: boolean;
  circularRef?: string | null;
}

export function evaluateOpeningHoursStatus(
  openStatus?: string | null,
  openingHours?: string | null,
  referenceUtcMs: number = Date.now()
): { isOpenNow: boolean | null; is24Hours: boolean } {
  const combined = `${openingHours || ''} ${openStatus || ''}`.trim();
  if (!combined) return { isOpenNow: null, is24Hours: false };

  const lower = combined.toLowerCase();
  if (lower.includes('24/7') || lower.includes('24 hours') || lower.includes('24-hour') || lower.includes('always open')) {
    return { isOpenNow: true, is24Hours: true };
  }

  // Convert UTC timestamp to IST (UTC + 5:30)
  const ist = new Date(referenceUtcMs + 5.5 * 60 * 60 * 1000);
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = dayNames[ist.getUTCDay()];
  const closedMatch = lower.match(/closed\s+(mon|tue|wed|thu|fri|sat|sun)/i);
  if (closedMatch && closedMatch[1].toLowerCase() === currentDay) {
    return { isOpenNow: false, is24Hours: false };
  }

  // Match time range like "08:00 AM – 11:00 PM" or "10:00 AM - 06:00 PM"
  const timeMatch = combined.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-to]+\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (timeMatch) {
    const toMinutes = (hStr: string, mStr: string, mer: string) => {
      let h = parseInt(hStr, 10) % 12;
      if (mer.toUpperCase() === 'PM') h += 12;
      return h * 60 + parseInt(mStr, 10);
    };

    const startMin = toMinutes(timeMatch[1], timeMatch[2], timeMatch[3]);
    const endMin = toMinutes(timeMatch[4], timeMatch[5], timeMatch[6]);
    const nowMin = ist.getUTCHours() * 60 + ist.getUTCMinutes();

    let isOpen = false;
    if (endMin > startMin) {
      isOpen = nowMin >= startMin && nowMin <= endMin;
    } else {
      // Spans past midnight
      isOpen = nowMin >= startMin || nowMin <= endMin;
    }
    return { isOpenNow: isOpen, is24Hours: false };
  }

  if (lower.includes('closed now')) return { isOpenNow: false, is24Hours: false };
  if (lower.includes('open now')) return { isOpenNow: true, is24Hours: false };

  return { isOpenNow: null, is24Hours: false };
}

export class PlacesService {
  private isMountainRegion(lat: number, lng: number): boolean {
    return lat >= 30.0 && lng >= 76.8;
  }

  private matchesCategoryFilter(place: EnrichedPlace, category: string, subCategory?: string): boolean {
    const cat = category.toUpperCase();
    const pCat = (place.category || '').toUpperCase();
    const pSub = (place.subCategory || '').toUpperCase();
    const nameLower = place.name.toLowerCase();

    if (cat !== 'ALL') {
      if (cat === 'PHARMACY' && pCat !== 'PHARMACY') return false;
      if (cat === 'HOSPITAL') {
        const isMainHospital =
          pCat === 'HOSPITAL' && !['CLINIC', 'DIAGNOSTIC_LAB', 'BLOOD_BANK', 'AMBULANCE'].includes(pSub);
        if (!isMainHospital) return false;
      }
      if (cat === 'MEDICAL_SERVICES') {
        const isMedicalSvc =
          (pCat === 'HOSPITAL' && ['CLINIC', 'DIAGNOSTIC_LAB', 'BLOOD_BANK', 'AMBULANCE'].includes(pSub)) ||
          pSub.includes('CLINIC') ||
          pSub.includes('LAB') ||
          pSub.includes('DOCTOR');
        if (!isMedicalSvc) return false;
      }
      if (cat === 'MEDICAL' && pCat !== 'PHARMACY' && pCat !== 'HOSPITAL') return false;
      if (cat === 'EMERGENCY_SERVICES') {
        const isEmerg =
          pCat === 'POLICE' ||
          pSub === 'TRAUMA_CENTER' ||
          pSub === 'AMBULANCE' ||
          pSub === 'FIRE_STATION' ||
          (pCat === 'HOSPITAL' && place.is24Hours) ||
          nameLower.includes('emergency') ||
          nameLower.includes('trauma');
        if (!isEmerg) return false;
      }
      if (cat === 'POLICE' && pCat !== 'POLICE') return false;
      if ((cat === 'TOURISM' || cat === 'ATTRACTION') && pCat !== 'TOURIST_INFO') return false;
      if ((cat === 'FOOD' || cat === 'RESTAURANT') && pCat !== 'RESTAURANT') return false;
      if ((cat === 'ACCOMMODATION' || cat === 'HOTEL') && pCat !== 'HOTEL') return false;
      if (cat === 'TRANSPORT' && pCat !== 'TRANSPORT') return false;
      if (cat === 'SHOPPING' && pCat !== 'SHOPPING') return false;
    }

    if (subCategory && subCategory !== 'ALL') {
      const targetSub = subCategory.toUpperCase();
      if (targetSub === 'PHARMACY_24_7') {
        return pCat === 'PHARMACY' && (pSub === 'PHARMACY_24_7' || place.is24Hours);
      }
      if (targetSub === 'PHARMACY_DAY') {
        return pCat === 'PHARMACY' && !place.is24Hours;
      }
      if (targetSub === 'TRAUMA_CENTER') {
        return pSub === 'TRAUMA_CENTER' || nameLower.includes('trauma') || nameLower.includes('emergency');
      }
      if (targetSub === 'DIAGNOSTIC_LAB') {
        return pSub === 'DIAGNOSTIC_LAB' || pSub === 'MEDICAL_LAB' || nameLower.includes('diagnostic') || nameLower.includes('lab');
      }
      if (targetSub === 'BLOOD_BANK') {
        return pSub === 'BLOOD_BANK' || nameLower.includes('blood bank');
      }
      return pSub === targetSub || pSub.includes(targetSub) || nameLower.includes(targetSub.replace(/_/g, ' ').toLowerCase());
    }

    return true;
  }

  /**
   * Universal spatial place search combining PostgreSQL verified registry, live Google Places API (New),
   * live IST opening-hour evaluation, and actual Google/OSRM road distance enrichment.
   */
  public async searchNearbyPlaces(params: PlaceSearchParams): Promise<{
    places: EnrichedPlace[];
    center: { lat: number; lng: number };
    radiusKm: number;
    totalCount: number;
    googlePlacesConfigured: boolean;
    apiNotice: string;
  }> {
    const {
      query,
      category = 'ALL',
      subCategory,
      cityId,
      strictCityFilter = false,
      lat = 28.6139,
      lng = 77.2090,
      radiusKm = 5,
      openNow = false,
      is24Hours = false,
      sortBy = 'distance',
      limit = 60,
    } = params;

    const isMountain = this.isMountainRegion(lat, lng);
    const roadFactor = isMountain ? 1.48 : 1.25;
    const drivingSpeedKmh = isMountain ? 22 : 34;
    const walkingSpeedKmh = 4.5;
    const cyclingSpeedKmh = 14;

    const dbWhere: any = {};
    if (strictCityFilter && cityId) {
      dbWhere.cityId = cityId;
    }

    // 1. Fetch verified registry locations (never restricting to a predefined city during spatial searches)
    const services = await prisma.locationService.findMany({
      where: dbWhere,
      include: {
        city: {
          select: { name: true, state: true },
        },
      },
    });

    const queryLower = (query || '').trim().toLowerCase();

    let candidates: EnrichedPlace[] = [];
    for (const s of services) {
      const straightLine = calculateDistanceKm(lat, lng, s.lat, s.lng);
      if (straightLine > radiusKm) continue;

      if (queryLower) {
        const matchText = `${s.name} ${s.address} ${s.category} ${s.subCategory || ''}`.toLowerCase();
        if (!matchText.includes(queryLower)) continue;
      }

      const { isOpenNow, is24Hours: is24H } = evaluateOpeningHoursStatus(s.openStatus, s.openingHours);
      const roadEst = Math.max(0.1, Math.round(straightLine * roadFactor * 10) / 10);

      candidates.push({
        id: s.id,
        name: s.name,
        category: s.category,
        subCategory: s.subCategory,
        lat: s.lat,
        lng: s.lng,
        address: s.address,
        phone: s.phone,
        rating: s.rating,
        openStatus: s.openStatus || (is24H ? 'Open 24/7' : 'Hours unavailable'),
        openingHours: s.openingHours || s.openStatus,
        isOpenNow,
        is24Hours: is24H,
        isVerified: s.isVerified,
        cityId: s.cityId,
        cityName: s.city?.name,
        straightLineDistanceKm: straightLine,
        straightLineLabel: formatDistance(straightLine),
        roadDistanceKm: roadEst,
        roadDistanceLabel: formatDistance(roadEst),
        distanceSource: 'ESTIMATED_TERRAIN',
        estimatedDrivingTimeMin: Math.max(2, Math.round((roadEst / drivingSpeedKmh) * 60)),
        estimatedWalkingTimeMin: Math.max(2, Math.round((roadEst / walkingSpeedKmh) * 60)),
        estimatedCyclingTimeMin: Math.max(2, Math.round((roadEst / cyclingSpeedKmh) * 60)),
        source: 'OFFICIAL_REGISTRY',
        website: s.website,
        googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`,
      });
    }

    // 2. Query live Google Places API (New) when configured
    const isGoogleConfigured = googleMapsService.isConfigured();
    let apiNotice = isGoogleConfigured
      ? 'Google Places & Routes APIs connected and active for global location discovery.'
      : 'Google Places API key is not configured in server/.env (GOOGLE_MAPS_API_KEY). Searching YatraGuard’s verified registry & OpenStreetMap routing. Add GOOGLE_MAPS_API_KEY for live Google Places coverage anywhere in the world.';

    if (isGoogleConfigured) {
      const googlePlaces = await googleMapsService.searchNearbyPlaces({
        lat,
        lng,
        radiusMeters: radiusKm * 1000,
        category: category.toUpperCase(),
        subCategory,
        query,
      });

      if (googlePlaces.length > 0) {
        for (const gp of googlePlaces) {
          const straightLine = calculateDistanceKm(lat, lng, gp.lat, gp.lng);
          if (straightLine > radiusKm) continue;

          const isDup = candidates.some(
            (existing) =>
              calculateDistanceKm(existing.lat, existing.lng, gp.lat, gp.lng) < 0.08 ||
              existing.name.toLowerCase() === gp.name.toLowerCase()
          );
          if (isDup) continue;

          const roadEst = Math.max(0.1, Math.round(straightLine * roadFactor * 10) / 10);
          candidates.push({
            id: gp.id,
            placeId: gp.placeId,
            name: gp.name,
            category: gp.category,
            subCategory: gp.subCategory,
            lat: gp.lat,
            lng: gp.lng,
            address: gp.address,
            phone: gp.phone,
            rating: gp.rating,
            openStatus: gp.openStatus,
            openingHours: gp.openingHours,
            isOpenNow: gp.isOpenNow,
            is24Hours: gp.is24Hours,
            isVerified: true,
            straightLineDistanceKm: straightLine,
            straightLineLabel: formatDistance(straightLine),
            roadDistanceKm: roadEst,
            roadDistanceLabel: formatDistance(roadEst),
            distanceSource: 'ESTIMATED_TERRAIN',
            estimatedDrivingTimeMin: Math.max(2, Math.round((roadEst / drivingSpeedKmh) * 60)),
            estimatedWalkingTimeMin: Math.max(2, Math.round((roadEst / walkingSpeedKmh) * 60)),
            estimatedCyclingTimeMin: Math.max(2, Math.round((roadEst / cyclingSpeedKmh) * 60)),
            source: 'GOOGLE_PLACES',
            website: gp.website,
            googleMapsUri: gp.googleMapsUri,
          });
        }
        apiNotice = `Live Google Places active (${googlePlaces.length} live discoveries merged with local safety registry).`;
      } else {
        apiNotice = 'Google Places API active (0 additional live results matched inside this sector/filter).';
      }
    }

    // 3. Apply Category, SubCategory, Open Now, and 24-Hour Filters
    candidates = candidates.filter((p) => this.matchesCategoryFilter(p, category, subCategory));

    if (openNow) {
      candidates = candidates.filter((p) => p.isOpenNow === true);
    }
    if (is24Hours) {
      candidates = candidates.filter((p) => p.is24Hours === true);
    }

    // 4. Sort initially by straight-line so top candidates get real Road Matrix enrichment
    candidates.sort((a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm);

    // 5. Enrich top 20 candidates with real Road Matrix distances (Google Routes Matrix -> OSRM Table API)
    const matrixTargets = candidates.slice(0, 20);
    if (matrixTargets.length > 0) {
      const roadMatrix = await googleMapsService.computeRoadMatrix(
        { lat, lng },
        matrixTargets.map((m) => ({ lat: m.lat, lng: m.lng }))
      );

      matrixTargets.forEach((place, idx) => {
        const roadMetric = roadMatrix.get(idx);
        if (roadMetric) {
          place.roadDistanceKm = Math.max(place.straightLineDistanceKm, roadMetric.roadDistanceKm);
          place.roadDistanceLabel = formatDistance(place.roadDistanceKm);
          place.estimatedDrivingTimeMin = roadMetric.drivingTimeMin;
          place.estimatedWalkingTimeMin = Math.max(2, Math.round((place.roadDistanceKm / walkingSpeedKmh) * 60));
          place.estimatedCyclingTimeMin = Math.max(2, Math.round((place.roadDistanceKm / cyclingSpeedKmh) * 60));
          place.distanceSource = roadMetric.source;
        }
      });
    }

    // 6. Final Sorting according to user preference
    if (sortBy === 'roadDistance') {
      candidates.sort((a, b) => a.roadDistanceKm - b.roadDistanceKm);
    } else if (sortBy === 'fastest') {
      candidates.sort((a, b) => a.estimatedDrivingTimeMin - b.estimatedDrivingTimeMin);
    } else if (sortBy === 'category') {
      candidates.sort((a, b) => {
        const cCmp = a.category.localeCompare(b.category);
        return cCmp !== 0 ? cCmp : a.straightLineDistanceKm - b.straightLineDistanceKm;
      });
    } else if (sortBy === 'rating') {
      candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      candidates.sort((a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm);
    }

    const totalCount = candidates.length;
    return {
      places: candidates.slice(0, limit),
      center: { lat, lng },
      radiusKm,
      totalCount,
      googlePlacesConfigured: isGoogleConfigured,
      apiNotice,
    };
  }

  /**
   * Emergency Quick Actions: Nearest Hospital, 24/7 Pharmacy, Trauma/Emergency Dept, Police, Helplines
   */
  public async getEmergencyShortcuts(lat: number, lng: number) {
    const placesResult = await this.searchNearbyPlaces({
      lat,
      lng,
      radiusKm: 35,
      limit: 60,
      sortBy: 'roadDistance',
    });

    const all = placesResult.places;
    const medicalHospitals = all.filter(
      (p) =>
        p.category === 'HOSPITAL' &&
        !['DIAGNOSTIC_LAB', 'BLOOD_BANK', 'AMBULANCE'].includes((p.subCategory || '').toUpperCase())
    );
    const pharmacies = all.filter((p) => p.category === 'PHARMACY');
    const pharmacies24 = pharmacies.filter((p) => p.is24Hours);
    const policeStations = all.filter((p) => p.category === 'POLICE');
    const emergencyDepts = all.filter(
      (p) =>
        (p.category === 'HOSPITAL' &&
          (p.subCategory === 'TRAUMA_CENTER' ||
            p.subCategory === 'AMBULANCE' ||
            (p.openStatus || '').toLowerCase().includes('emergency') ||
            (p.openStatus || '').toLowerCase().includes('trauma') ||
            p.is24Hours))
    );

    return {
      nearestHospital: medicalHospitals[0] || all.find((p) => p.category === 'HOSPITAL') || null,
      nearestPharmacy: pharmacies24[0] || pharmacies[0] || null,
      nearestTraumaCenter: emergencyDepts[0] || medicalHospitals[0] || null,
      nearestPolice: policeStations[0] || null,
      allMedicalFacilities: medicalHospitals.concat(pharmacies).slice(0, 10),
      helplines: [
        { name: 'National Emergency Helpline (Police / Fire / Medical)', number: '112', type: 'EMERGENCY' },
        { name: 'National Ambulance Service (CATS / Govt 108)', number: '108', type: 'AMBULANCE' },
        { name: 'National Tourist Helpline (Toll-Free, Multilingual)', number: '1363', type: 'TOURIST_ASSISTANCE' },
        { name: 'Women Travel Helpline', number: '1091', type: 'WOMEN_SAFETY' },
      ],
      userLocation: { lat, lng },
      googlePlacesConfigured: placesResult.googlePlacesConfigured,
    };
  }

  /**
   * Plan full source-to-destination route with geometry polylines, alternatives, turn-by-turn steps,
   * safety scoring along the corridor, and 8-mode fare estimation.
   */
  public async planCompleteRoute(params: {
    origin: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name?: string };
    travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    travelHour?: number;
    waitingMins?: number;
    hasLuggage?: boolean;
  }) {
    const {
      origin,
      destination,
      travelMode = 'DRIVE',
      avoidTolls = false,
      avoidHighways = false,
      travelHour,
      waitingMins = 0,
      hasLuggage = false,
    } = params;

    const [routeGeometryResult, safetyResult] = await Promise.all([
      googleMapsService.computeDetailedRoutes({
        origin,
        destination,
        travelMode,
        avoidTolls,
        avoidHighways,
      }),
      evaluateRouteSafety(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
        origin.name || 'Origin',
        destination.name || 'Destination'
      ).catch(() => null),
    ]);

    const primaryRoute = routeGeometryResult.routes[0];
    const tollAmount = primaryRoute?.tollInfo?.estimatedAmount || 0;

    const multimodalFares = await this.calculateMultimodalFares({
      origin,
      destination,
      travelHour,
      explicitRoadDistanceKm: primaryRoute?.distanceKm,
      routingProvider: routeGeometryResult.provider,
      waitingMins,
      hasLuggage,
      tollAmount,
    });

    return {
      origin: multimodalFares.origin,
      destination: multimodalFares.destination,
      travelMode,
      routes: routeGeometryResult.routes,
      routingProvider: routeGeometryResult.provider,
      routingNotice: routeGeometryResult.notice,
      safetyEvaluation: safetyResult,
      fares: multimodalFares,
    };
  }

  /**
   * Truthful Multi-Modal Local Transit & Fare Estimation Comparator between any two points.
   * Integrates with CityFareRule, FareReport, PriceRecord, and actual road distances.
   * Never fabricates city RTO rates for unsupported locations outside mapped corridors.
   */
  public async calculateMultimodalFares(params: {
    origin: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name?: string };
    cityName?: string;
    travelHour?: number;
    explicitRoadDistanceKm?: number;
    routingProvider?: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
    waitingMins?: number;
    hasLuggage?: boolean;
    tollAmount?: number;
  }): Promise<{
    origin: { lat: number; lng: number; name: string };
    destination: { lat: number; lng: number; name: string };
    straightLineKm: number;
    roadDistanceKm: number;
    distanceSource: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
    terrainType: 'PLAINS' | 'MOUNTAIN';
    coveredCityName: string | null;
    isCityTariffCovered: boolean;
    options: MultimodalFareOption[];
    nightSurchargeApplied: boolean;
    mountainSurchargeApplied: boolean;
    timestamp: string;
  }> {
    const {
      origin,
      destination,
      cityName,
      travelHour = new Date().getHours(),
      explicitRoadDistanceKm,
      routingProvider,
      waitingMins = 0,
      hasLuggage = false,
      tollAmount = 0,
    } = params;

    const straightLine = calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
    const isMountain =
      this.isMountainRegion(origin.lat, origin.lng) || this.isMountainRegion(destination.lat, destination.lng);
    const roadFactor = isMountain ? 1.48 : 1.25;

    let roadDistanceKm = explicitRoadDistanceKm || 0;
    let finalDistanceSource: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN' = routingProvider || 'ESTIMATED_TERRAIN';

    // If caller didn't supply live routed distance, attempt single-pair road matrix lookup
    if (!roadDistanceKm && straightLine > 0.05) {
      const matrix = await googleMapsService.computeRoadMatrix(origin, [destination]);
      const entry = matrix.get(0);
      if (entry) {
        roadDistanceKm = Math.max(straightLine, entry.roadDistanceKm);
        finalDistanceSource = entry.source;
      }
    }

    if (!roadDistanceKm) {
      roadDistanceKm = Math.round(straightLine * roadFactor * 10) / 10;
      finalDistanceSource = 'ESTIMATED_TERRAIN';
    }

    const isNight = travelHour >= 23 || travelHour < 5;

    // Determine if origin lies within a covered YatraGuard city tariff region (75 km radius)
    const allCities = await prisma.city.findMany();
    let closestCity: any = null;
    let minCityDist = Infinity;
    for (const c of allCities) {
      const d = calculateDistanceKm(origin.lat, origin.lng, c.lat, c.lng);
      if (d < minCityDist) {
        minCityDist = d;
        closestCity = c;
      }
    }

    const matchedByCityParam = cityName
      ? allCities.find((c) => c.name.toLowerCase() === cityName.trim().toLowerCase())
      : null;

    // Only treat RTO city rates as valid if origin is genuinely within 75 km of a covered Indian city!
    const isCityTariffCovered = minCityDist <= 75;
    const activeCity = isCityTariffCovered ? closestCity : matchedByCityParam && minCityDist <= 120 ? matchedByCityParam : null;
    const effectiveCityName = activeCity?.name || null;

    let backendFareResult: any = null;
    let cityRules: any[] = [];
    let verifiedReports: any[] = [];
    let localPriceRecords: any[] = [];

    if (activeCity) {
      [cityRules, verifiedReports, localPriceRecords] = await Promise.all([
        prisma.cityFareRule.findMany({
          where: { cityId: activeCity.id },
          include: { transportMode: true },
        }),
        prisma.fareReport.findMany({
          where: { cityId: activeCity.id, verificationStatus: 'COMMUNITY_VERIFIED' },
        }),
        prisma.priceRecord.findMany({
          where: { cityId: activeCity.id, category: 'LOCAL_TRANSPORT', verificationStatus: 'VERIFIED' },
        }),
      ]);

      try {
        backendFareResult = await fareEstimationService.estimateFares({
          cityId: activeCity.id,
          origin: origin.name || 'Origin Point',
          destination: destination.name || 'Destination Point',
          distanceKm: roadDistanceKm,
          travelHour,
          hasLuggage,
        });
      } catch (err) {
        console.warn('FareEstimationService error in multimodal fare comparator:', err);
      }
    }

    const findBackendOption = (modeId: string) =>
      backendFareResult?.options?.find((o: any) => o.transportModeId === modeId);
    const hasExplicitRule = (modeId: string) =>
      cityRules.some((r) => r.transportModeId === modeId);

    const resolveLabelType = (sourceType?: string): Pick<MultimodalFareOption, 'priceType' | 'priceTypeLabel'> => {
      if (sourceType === 'OFFICIAL_GOVT' || sourceType === 'UNION_NOTIFIED') {
        return { priceType: 'OFFICIAL_GOVT', priceTypeLabel: 'Official Price' };
      }
      if (sourceType === 'COMMUNITY_BENCHMARK') {
        return { priceType: 'COMMUNITY_VERIFIED', priceTypeLabel: 'Verified Community Price' };
      }
      if (sourceType === 'COMMUNITY_REPORTED') {
        return { priceType: 'COMMUNITY_REPORTED', priceTypeLabel: 'Community-Reported Price' };
      }
      return { priceType: 'ESTIMATED', priceTypeLabel: 'Estimated Price' };
    };

    const makeUnavailableOption = (
      modeId: string,
      name: string,
      vehicleType: string,
      durationMin: number,
      reason: string
    ): MultimodalFareOption => ({
      modeId,
      name,
      vehicleType,
      distanceKm: roadDistanceKm,
      durationMin,
      fareMin: 0,
      fareAvg: 0,
      fareMax: 0,
      fareLabel: 'Fare information unavailable',
      priceType: 'UNAVAILABLE',
      priceTypeLabel: 'Fare information unavailable',
      description: reason,
      conditions: [reason],
      isAvailable: false,
    });

    const buildModeOption = (
      modeId: string,
      displayName: string,
      vehicleType: string,
      durationMin: number,
      description: string,
      optEstimate: any,
      hasOwnRule: boolean,
      extraConditions: string[] = []
    ): MultimodalFareOption => {
      if (!activeCity || !optEstimate) {
        return makeUnavailableOption(
          modeId,
          displayName,
          vehicleType,
          durationMin,
          !activeCity
            ? 'No verified local fare schedule available for this region.'
            : `${displayName} fare schedule unavailable in ${effectiveCityName}.`
        );
      }

      const waitingCharge = Math.round(((optEstimate.waitingChargePerHour || 30) * Math.max(0, waitingMins)) / 60);
      const luggageAdd = hasLuggage ? Math.round(optEstimate.luggageCharge || 10) : 0;
      const tollAdd = modeId === 'TAXI' ? Math.round(tollAmount) : 0;

      const minF = Math.max(0, Math.round(optEstimate.minFare + waitingCharge + tollAdd));
      const avgF = Math.max(0, Math.round(optEstimate.avgFare + waitingCharge + tollAdd));
      const maxF = Math.max(minF, Math.round(optEstimate.maxFare + waitingCharge + tollAdd));

      const rawBase = Math.round(optEstimate.baseFare);
      const rawExtra = Math.max(0, Math.round((roadDistanceKm - (optEstimate.baseDistanceKm || 1.5)) * optEstimate.perKmRate));
      const nightAmt = optEstimate.nightSurchargeApplied
        ? Math.round(((rawBase + rawExtra) * (optEstimate.nightSurchargePct || 25)) / 100)
        : 0;
      const hillAmt = optEstimate.hillTerrainSurchargeApplied
        ? Math.round(((rawBase + rawExtra) * (optEstimate.hillTerrainSurchargePct || 20)) / 100)
        : 0;

      // Only label Official Price if this exact city actually has an OFFICIAL_GOVT/UNION_NOTIFIED rule for this mode!
      const effectiveSource = hasOwnRule ? optEstimate.sourceType : 'ESTIMATED';
      const labelMeta = resolveLabelType(effectiveSource);

      const conditions: string[] = [
        ...(optEstimate.officialCircularRef ? [optEstimate.officialCircularRef] : []),
        `Base: ₹${rawBase} (first ${optEstimate.baseDistanceKm || 1.5} km) + ₹${optEstimate.perKmRate}/km`,
        ...(optEstimate.nightSurchargeApplied
          ? [`Night surcharge (+${optEstimate.nightSurchargePct || 25}%) for 23:00–05:00`]
          : ['Standard daytime rate']),
        ...(optEstimate.hillTerrainSurchargeApplied
          ? [`Hill terrain adjustment (+${optEstimate.hillTerrainSurchargePct || 20}%) included`]
          : []),
        ...(waitingCharge > 0 ? [`Waiting charge (${waitingMins} mins): ₹${waitingCharge}`] : []),
        ...(tollAdd > 0 ? [`Toll charges: ₹${tollAdd}`] : []),
        ...(luggageAdd > 0 ? [`Heavy luggage charge: ₹${luggageAdd}`] : []),
        ...(optEstimate.communityReportCount > 0
          ? [`Blended with ${optEstimate.communityReportCount} verified traveler fare report(s)`]
          : []),
        ...extraConditions,
      ];

      return {
        modeId,
        name: displayName,
        vehicleType,
        distanceKm: roadDistanceKm,
        durationMin,
        fareMin: minF,
        fareAvg: avgF,
        fareMax: maxF,
        fareLabel: minF === maxF ? `₹${minF}` : `₹${minF} – ₹${maxF}`,
        ...labelMeta,
        description,
        conditions,
        breakdown: {
          baseFare: rawBase,
          distanceCharge: rawExtra,
          waitingCharge,
          nightCharge: nightAmt,
          hillSurcharge: hillAmt,
          tollCharge: tollAdd,
          luggageCharge: luggageAdd,
        },
        circularRef: hasOwnRule ? optEstimate.officialCircularRef : null,
        isAvailable: true,
      };
    };

    const metroCities = ['delhi', 'mumbai', 'bengaluru', 'jaipur', 'hyderabad', 'lucknow'];
    const cityHasMetro = effectiveCityName ? metroCities.includes(effectiveCityName.toLowerCase()) : false;
    const autoOpt = findBackendOption('AUTO');
    const eRickOpt = findBackendOption('E_RICKSHAW');
    const taxiOpt = findBackendOption('LOCAL_TAXI') || findBackendOption('PRIVATE_CAB');
    const bikeOpt = findBackendOption('BIKE_TAXI');
    const busOpt = findBackendOption('GOVT_BUS') || findBackendOption('LOCAL_BUS');
    const metroOpt = findBackendOption('METRO');

    // Check community PriceRecord if any exists for Local Transport
    const bikeRecord = localPriceRecords.find((r) => r.itemName.toLowerCase().includes('bike'));
    const cycleRecord = localPriceRecords.find((r) => r.itemName.toLowerCase().includes('cycle') || r.itemName.toLowerCase().includes('scooter'));

    // Build all 8 requested travel modes transparently
    const walkMin = Math.max(2, Math.round((roadDistanceKm / 4.5) * 60));
    const cycleMin = Math.max(2, Math.round((roadDistanceKm / 14) * 60));

    const options: MultimodalFareOption[] = [
      // 1. WALKING
      {
        modeId: 'WALKING',
        name: 'Walking',
        vehicleType: 'Pedestrian',
        distanceKm: roadDistanceKm,
        durationMin: walkMin,
        fareMin: 0,
        fareAvg: 0,
        fareMax: 0,
        fareLabel: '₹0 (Free)',
        priceType: 'OFFICIAL_GOVT',
        priceTypeLabel: 'Official Price',
        description:
          roadDistanceKm <= 5
            ? 'Direct pedestrian walking route. Zero fare.'
            : 'Long pedestrian distance (>5 km); consider motorized transport.',
        conditions: ['Free pedestrian transit', 'Prefer well-lit arterial sidewalks after dusk'],
        isAvailable: roadDistanceKm <= 15,
      },

      // 2. CYCLING
      {
        modeId: 'CYCLING',
        name: 'Cycling / Public Bike Share',
        vehicleType: 'Bicycle',
        distanceKm: roadDistanceKm,
        durationMin: cycleMin,
        fareMin: cycleRecord ? Math.round(cycleRecord.minPrice) : 0,
        fareAvg: cycleRecord ? Math.round((cycleRecord.minPrice + cycleRecord.maxPrice) / 2) : 0,
        fareMax: cycleRecord ? Math.round(cycleRecord.maxPrice) : 0,
        fareLabel: cycleRecord
          ? `₹${Math.round(cycleRecord.minPrice)} – ₹${Math.round(cycleRecord.maxPrice)} (Rental)`
          : 'Fare information unavailable',
        priceType: cycleRecord ? 'COMMUNITY_VERIFIED' : 'UNAVAILABLE',
        priceTypeLabel: cycleRecord ? 'Verified Community Price' : 'Fare information unavailable',
        description: cycleRecord
          ? `Bicycle/two-wheeler hire benchmark in ${effectiveCityName}. Own cycle is ₹0.`
          : 'No live Smart City dock fare telemetry reported in this sector (personal bicycle is ₹0).',
        conditions: [
          cycleRecord ? cycleRecord.notes || 'Local bicycle rental rate' : 'Personal bicycle: ₹0; Rental pricing unverified here',
        ],
        isAvailable: !isMountain || roadDistanceKm <= 20,
      },

      // 3. AUTO-RICKSHAW
      isCityTariffCovered && autoOpt
        ? buildModeOption(
            'AUTO_RICKSHAW',
            'Auto-Rickshaw',
            '3-Wheeler',
            Math.max(4, Math.round((roadDistanceKm / (isMountain ? 20 : 26)) * 60)),
            '3-wheeler auto-rickshaw calculated from YatraGuard Local Prices city tariff rules.',
            autoOpt,
            hasExplicitRule('AUTO')
          )
        : makeUnavailableOption(
            'AUTO_RICKSHAW',
            'Auto-Rickshaw',
            '3-Wheeler',
            Math.max(4, Math.round((roadDistanceKm / 25) * 60)),
            'Fare information unavailable outside YatraGuard covered RTO tariff cities.'
          ),

      // 4. E-RICKSHAW
      !isCityTariffCovered || isMountain || roadDistanceKm > 8
        ? makeUnavailableOption(
            'E_RICKSHAW',
            'E-Rickshaw',
            'Electric 3-Wheeler',
            Math.max(5, Math.round((roadDistanceKm / 18) * 60)),
            isMountain
              ? 'Electric rickshaws generally do not operate on steep Himalayan gradients.'
              : roadDistanceKm > 8
              ? 'Short-hop service unavailable for distances exceeding 8 km.'
              : 'No verified e-rickshaw fare data available in this area.'
          )
        : eRickOpt
        ? buildModeOption(
            'E_RICKSHAW',
            'E-Rickshaw',
            'Electric 3-Wheeler',
            Math.max(5, Math.round((roadDistanceKm / 18) * 60)),
            'Last-mile shared/private battery rickshaw.',
            eRickOpt,
            hasExplicitRule('E_RICKSHAW')
          )
        : makeUnavailableOption(
            'E_RICKSHAW',
            'E-Rickshaw',
            'Electric 3-Wheeler',
            Math.max(5, Math.round((roadDistanceKm / 18) * 60)),
            `No verified E-Rickshaw tariff rule seeded for ${effectiveCityName || 'this sector'}.`
          ),

      // 5. TAXI
      isCityTariffCovered && taxiOpt
        ? buildModeOption(
            'TAXI',
            'Taxi / Cab',
            'Cab / Sedan',
            Math.max(5, Math.round((roadDistanceKm / (isMountain ? 24 : 34)) * 60)),
            'Local city taxi or union cab computed with base fare, per-km rate, waiting, tolls, and night rules.',
            taxiOpt,
            hasExplicitRule('LOCAL_TAXI') || hasExplicitRule('PRIVATE_CAB')
          )
        : makeUnavailableOption(
            'TAXI',
            'Taxi / Cab',
            'Cab / Sedan',
            Math.max(5, Math.round((roadDistanceKm / 34) * 60)),
            'Fare information unavailable outside YatraGuard covered RTO/Union cities.'
          ),

      // 6. BIKE TAXI
      !isCityTariffCovered || isMountain || roadDistanceKm > 25
        ? makeUnavailableOption(
            'BIKE_TAXI',
            'Bike Taxi',
            '2-Wheeler',
            Math.max(4, Math.round((roadDistanceKm / 32) * 60)),
            isMountain
              ? 'Commercial app bike-taxi service generally unavailable on Himalayan mountain corridors.'
              : 'Bike-taxi pricing information unavailable in this location.'
          )
        : bikeOpt || bikeRecord
        ? bikeOpt
          ? buildModeOption(
              'BIKE_TAXI',
              'Bike Taxi',
              '2-Wheeler',
              Math.max(4, Math.round((roadDistanceKm / 32) * 60)),
              'Single-rider commercial pillion ride where legally licensed.',
              bikeOpt,
              hasExplicitRule('BIKE_TAXI'),
              ['Helmet mandatory; subject to state transport permit rules']
            )
          : {
              modeId: 'BIKE_TAXI',
              name: 'Bike Taxi',
              vehicleType: '2-Wheeler',
              distanceKm: roadDistanceKm,
              durationMin: Math.max(4, Math.round((roadDistanceKm / 32) * 60)),
              fareMin: Math.round(bikeRecord.minPrice),
              fareAvg: Math.round((bikeRecord.minPrice + bikeRecord.maxPrice) / 2),
              fareMax: Math.round(bikeRecord.maxPrice),
              fareLabel: `₹${Math.round(bikeRecord.minPrice)} – ₹${Math.round(bikeRecord.maxPrice)}`,
              priceType: 'COMMUNITY_REPORTED',
              priceTypeLabel: 'Community-Reported Price',
              description: bikeRecord.notes || 'Community-reported commercial 2-wheeler rate.',
              conditions: ['Single passenger only', 'Helmet mandatory'],
              isAvailable: true,
            }
        : makeUnavailableOption(
            'BIKE_TAXI',
            'Bike Taxi',
            '2-Wheeler',
            Math.max(4, Math.round((roadDistanceKm / 32) * 60)),
            `Bike taxi tariff unavailable for ${effectiveCityName || 'this sector'}.`
          ),

      // 7. BUS
      isCityTariffCovered && busOpt
        ? buildModeOption(
            'BUS',
            'Public Bus',
            'Bus',
            Math.max(8, Math.round((roadDistanceKm / (isMountain ? 18 : 22)) * 60) + 6),
            'State / municipal stage-carriage public bus network.',
            busOpt,
            hasExplicitRule('GOVT_BUS') || hasExplicitRule('LOCAL_BUS')
          )
        : makeUnavailableOption(
            'BUS',
            'Public Bus',
            'Bus',
            Math.max(8, Math.round((roadDistanceKm / 22) * 60) + 6),
            'Fare information unavailable outside covered city transit routes.'
          ),

      // 8. METRO
      !isCityTariffCovered || !cityHasMetro
        ? makeUnavailableOption(
            'METRO',
            'Metro Rail',
            'Rail',
            0,
            !activeCity
              ? 'Fare information unavailable outside covered metro cities.'
              : `No active Metro Rail system deployed in ${effectiveCityName}.`
          )
        : metroOpt
        ? buildModeOption(
            'METRO',
            `${effectiveCityName} Metro Rail`,
            'Rail',
            Math.max(6, Math.round((roadDistanceKm / 38) * 60) + 5),
            'Rapid transit metro rail with smart-card / QR distance-slab fare.',
            metroOpt,
            hasExplicitRule('METRO')
          )
        : {
            modeId: 'METRO',
            name: `${effectiveCityName} Metro Rail`,
            vehicleType: 'Rail',
            distanceKm: roadDistanceKm,
            durationMin: Math.max(6, Math.round((roadDistanceKm / 38) * 60) + 5),
            fareMin: roadDistanceKm <= 5 ? 10 : roadDistanceKm <= 12 ? 20 : 30,
            fareAvg: roadDistanceKm <= 5 ? 20 : roadDistanceKm <= 12 ? 30 : 40,
            fareMax: roadDistanceKm <= 5 ? 20 : roadDistanceKm <= 12 ? 40 : 60,
            fareLabel: `₹${roadDistanceKm <= 5 ? 10 : 20} – ₹${roadDistanceKm <= 12 ? 40 : 60}`,
            priceType: 'ESTIMATED',
            priceTypeLabel: 'Estimated Price',
            description: `Urban Metro network available in ${effectiveCityName}. Check station AFC slab.`,
            conditions: ['Distance-based station slab (10% discount often applies on Metro smart cards)'],
            isAvailable: true,
          },
    ];

    return {
      origin: { lat: origin.lat, lng: origin.lng, name: origin.name || 'Origin' },
      destination: { lat: destination.lat, lng: destination.lng, name: destination.name || 'Destination' },
      straightLineKm: straightLine,
      roadDistanceKm,
      distanceSource: finalDistanceSource,
      terrainType: isMountain ? 'MOUNTAIN' : 'PLAINS',
      coveredCityName: effectiveCityName,
      isCityTariffCovered,
      options,
      nightSurchargeApplied: isNight,
      mountainSurchargeApplied: isMountain,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Global Autocomplete & Geocoding Search
   */
  public async autocompleteGlobal(query: string, lat?: number, lng?: number, sessionToken?: string) {
    const q = query.trim();
    if (q.length < 2) return { suggestions: [], provider: 'LOCAL' };

    const [cities, landmarks, remoteResult] = await Promise.all([
      prisma.city.findMany({
        where: {
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { state: { contains: q, mode: 'insensitive' } }],
        },
        take: 4,
      }),
      prisma.locationService.findMany({
        where: {
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { address: { contains: q, mode: 'insensitive' } }],
        },
        include: { city: { select: { name: true, state: true } } },
        take: 4,
      }),
      googleMapsService.autocompletePlaces({ input: q, lat, lng, sessionToken }),
    ]);

    const localSuggestions: AutocompleteSuggestion[] = [
      ...cities.map((c) => ({
        id: `city_${c.id}`,
        name: c.name,
        secondaryText: `${c.state}, India`,
        fullText: `${c.name}, ${c.state}`,
        lat: c.lat,
        lng: c.lng,
        category: 'CITY',
        source: 'LOCAL_REGISTRY' as const,
      })),
      ...landmarks.map((l) => ({
        id: `svc_${l.id}`,
        name: l.name,
        secondaryText: l.address,
        fullText: `${l.name} — ${l.address}`,
        lat: l.lat,
        lng: l.lng,
        category: l.category,
        source: 'LOCAL_REGISTRY' as const,
      })),
    ];

    const merged = [...localSuggestions];
    for (const r of remoteResult.suggestions) {
      if (!merged.some((m) => m.name.toLowerCase() === r.name.toLowerCase())) {
        merged.push(r);
      }
    }

    return {
      suggestions: merged.slice(0, 10),
      provider: remoteResult.provider,
    };
  }

  /**
   * Save Place Bookmark (deduplicated per user)
   */
  public async savePlace(
    userId: string,
    data: {
      placeId?: string;
      name: string;
      category: string;
      address: string;
      lat: number;
      lng: number;
      phone?: string;
      notes?: string;
    }
  ) {
    const existing = await prisma.savedPlace.findFirst({
      where: {
        userId,
        name: data.name,
      },
    });
    if (existing) return existing;

    return prisma.savedPlace.create({
      data: {
        userId,
        placeId: data.placeId,
        name: data.name,
        category: data.category,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        phone: data.phone,
        notes: data.notes,
      },
    });
  }

  public async getSavedPlaces(userId: string) {
    return prisma.savedPlace.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async deleteSavedPlace(userId: string, id: string) {
    return prisma.savedPlace.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Explicit Saved Routes Bookmarks (Opt-in only, never tracks history automatically)
   */
  public async saveRoute(
    userId: string,
    data: {
      originName: string;
      destName: string;
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
      distanceKm: number;
      travelMode?: string;
      estimatedMinutes: number;
    }
  ) {
    return prisma.savedRoute.create({
      data: {
        userId,
        originName: data.originName,
        destName: data.destName,
        originLat: data.originLat,
        originLng: data.originLng,
        destLat: data.destLat,
        destLng: data.destLng,
        distanceKm: data.distanceKm,
        travelMode: data.travelMode || 'DRIVE',
        estimatedMinutes: Math.max(1, Math.round(data.estimatedMinutes)),
      },
    });
  }

  public async getSavedRoutes(userId: string) {
    return prisma.savedRoute.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async deleteSavedRoute(userId: string, id: string) {
    return prisma.savedRoute.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Preserved existing destination search endpoint across Indian cities & landmarks
   */
  public async searchDestinations(query: string) {
    if (!query || query.trim().length === 0) {
      return {
        cities: await prisma.city.findMany({ take: 10, orderBy: { name: 'asc' } }),
        landmarks: [],
      };
    }

    const q = query.trim();
    const cities = await prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { state: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 8,
    });

    const landmarks = await prisma.locationService.findMany({
      where: {
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { address: { contains: q, mode: 'insensitive' } }],
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
      },
      take: 8,
    });

    return {
      cities,
      landmarks: landmarks.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        subCategory: l.subCategory,
        address: l.address,
        lat: l.lat,
        lng: l.lng,
        cityId: l.cityId,
        cityName: l.city?.name,
        cityState: l.city?.state,
      })),
    };
  }
}

export const placesService = new PlacesService();
