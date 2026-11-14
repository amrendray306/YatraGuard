import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm, formatDistance } from './geoService.js';

const prisma = new PrismaClient();

export interface PlaceSearchParams {
  query?: string;
  category?: string;
  cityId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: 'distance' | 'rating';
  limit?: number;
}

export interface EnrichedPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string | null;
  rating?: number | null;
  openStatus: string;
  isVerified: boolean;
  cityId: string;
  cityName?: string;
  distanceKm?: number;
  distanceLabel?: string;
}

export class PlacesService {
  /**
   * Search places with category filtering, text query, and spatial radius
   */
  public async searchPlaces(params: PlaceSearchParams): Promise<EnrichedPlace[]> {
    const { query, category, cityId, lat, lng, radiusKm, sortBy = 'distance', limit = 50 } = params;

    const where: any = {};

    if (cityId) {
      where.cityId = cityId;
    }

    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { address: { contains: q } },
      ];
    }

    const services = await prisma.locationService.findMany({
      where,
      include: {
        city: {
          select: { name: true, state: true },
        },
      },
    });

    // Compute distances if reference coordinates provided
    let enriched: EnrichedPlace[] = services.map((s) => {
      let distanceKm: number | undefined;
      let distanceLabel: string | undefined;

      if (lat !== undefined && lng !== undefined) {
        distanceKm = calculateDistanceKm(lat, lng, s.lat, s.lng);
        distanceLabel = formatDistance(distanceKm);
      }

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        lat: s.lat,
        lng: s.lng,
        address: s.address,
        phone: s.phone,
        rating: s.rating,
        openStatus: s.openStatus,
        isVerified: s.isVerified,
        cityId: s.cityId,
        cityName: s.city?.name,
        distanceKm,
        distanceLabel,
      };
    });

    // Filter by radius if specified
    if (radiusKm && lat !== undefined && lng !== undefined) {
      enriched = enriched.filter((p) => p.distanceKm !== undefined && p.distanceKm <= radiusKm);
    }

    // Sort
    if (sortBy === 'rating') {
      enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (lat !== undefined && lng !== undefined) {
      enriched.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return enriched.slice(0, limit);
  }

  /**
   * Universal destination search across Indian cities and major landmarks
   */
  public async searchDestinations(query: string) {
    if (!query || query.trim().length === 0) {
      return prisma.city.findMany({
        take: 10,
        orderBy: { name: 'asc' },
      });
    }

    const q = query.trim();
    // Search cities matching query
    const cities = await prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { state: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 8,
    });

    // Also search landmark services matching query
    const landmarks = await prisma.locationService.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { address: { contains: q } },
        ],
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
      },
      take: 6,
    });

    return {
      cities,
      landmarks: landmarks.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        address: l.address,
        lat: l.lat,
        lng: l.lng,
        cityId: l.cityId,
        cityName: l.city?.name,
        cityState: l.city?.state,
      })),
    };
  }

  /**
   * Find nearest emergency services (Hospitals, Police, Pharmacies)
   */
  public async getNearestEmergencyServices(lat: number, lng: number, cityId?: string) {
    const services = await this.searchPlaces({
      lat,
      lng,
      cityId,
      limit: 30,
    });

    const hospitals = services.filter((s) => s.category === 'HOSPITAL');
    const police = services.filter((s) => s.category === 'POLICE');
    const pharmacies = services.filter((s) => s.category === 'PHARMACY');
    const transport = services.filter((s) => s.category === 'TRANSPORT');

    return {
      nearestHospital: hospitals[0] || null,
      nearestPolice: police[0] || null,
      nearestPharmacy: pharmacies[0] || null,
      nearestTransport: transport[0] || null,
      allNearby: services.slice(0, 15),
    };
  }
}

export const placesService = new PlacesService();
