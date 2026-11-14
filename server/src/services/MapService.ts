import { calculateDistanceKm, formatDistance } from './geoService.js';

export interface GeoPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteDetail {
  origin: GeoPoint;
  destination: GeoPoint;
  straightLineDistanceKm: number;
  estimatedRoadDistanceKm: number;
  formattedDistance: string;
  terrainType: 'PLAINS' | 'COASTAL' | 'MOUNTAIN';
  recommendedSpeedKmh: number;
  estimatedDrivingTimeMin: number;
}

export class MapService {
  /**
   * Calculate route distance and driving metrics with road terrain curvature factor
   */
  public calculateRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    isMountainTerrain = false
  ): RouteDetail {
    const straightLine = calculateDistanceKm(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );

    // Road network in India typically has a detour index:
    // Plains: ~1.25x straight-line
    // Mountains / Ghats (e.g. Manali, Shimla, Rishikesh hills): ~1.45x - 1.6x straight-line
    const roadFactor = isMountainTerrain ? 1.48 : 1.25;
    const estimatedRoadDistance = Math.round(straightLine * roadFactor * 10) / 10;

    const terrainType = isMountainTerrain ? 'MOUNTAIN' : 'PLAINS';
    const recommendedSpeedKmh = isMountainTerrain ? 22 : 36;
    const estimatedDrivingTimeMin = Math.max(
      5,
      Math.round((estimatedRoadDistance / recommendedSpeedKmh) * 60)
    );

    return {
      origin,
      destination,
      straightLineDistanceKm: straightLine,
      estimatedRoadDistanceKm: estimatedRoadDistance,
      formattedDistance: formatDistance(estimatedRoadDistance),
      terrainType,
      recommendedSpeedKmh,
      estimatedDrivingTimeMin,
    };
  }

  /**
   * Check if a coordinate is within a safe bounding radius
   */
  public isWithinRadius(
    point: GeoPoint,
    center: GeoPoint,
    radiusKm: number
  ): boolean {
    const distance = calculateDistanceKm(point.lat, point.lng, center.lat, center.lng);
    return distance <= radiusKm;
  }
}

export const mapService = new MapService();

