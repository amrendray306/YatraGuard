/**
 * Road Network Routing Service
 * Provides authentic road-network geometries (via OSRM) with safety intelligence scoring
 */
import { evaluateRouteRisk } from './api';

export interface RouteGeometry {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
}

export interface SafetyAwareRouteOption {
  id: 'fastest' | 'safest' | 'balanced';
  title: string;
  badge: string;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  riskTier: 'Low' | 'Moderate' | 'Elevated';
  riskScore: number; // 0 (extreme risk) to 100 (maximum safety)
  color: string;
  description: string;
  highlights: string[];
  hazards: string[];
  coordinates: [number, number][];
}

export class RoadRoutingService {
  /**
   * Fetches real road-network geometries (with OSRM alternatives when available)
   */
  public async fetchRoadGeometries(
    start: [number, number],
    dest: [number, number],
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<RouteGeometry[]> {
    try {
      const profile = mode === 'walking' ? 'foot' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=true`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) return [];

      return data.routes.slice(0, 3).map((route: any) => ({
        coordinates: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      }));
    } catch {
      // Offline, network block or fallback
      return [];
    }
  }

  public async fetchRoadGeometry(
    start: [number, number],
    dest: [number, number],
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<RouteGeometry | null> {
    const routes = await this.fetchRoadGeometries(start, dest, mode);
    return routes[0] || null;
  }

  /**
   * Generates up to 3 Safety-Aware Route Alternatives using genuine OSRM geometries & YatraGuard Risk Engine
   */
  public async planSaferRoutes(params: {
    startCoords: [number, number];
    destCoords: [number, number];
    startName?: string;
    destName?: string;
    cityId?: string;
    mode?: 'driving' | 'walking';
  }): Promise<{
    routes: SafetyAwareRouteOption[];
    recommendationReason: string;
    disclaimer: string;
  }> {
    const { startCoords, destCoords, startName, destName, cityId, mode = 'driving' } = params;

    const [backendResult, roadGeometries] = await Promise.all([
      evaluateRouteRisk({
        fromLat: startCoords[0],
        fromLng: startCoords[1],
        toLat: destCoords[0],
        toLng: destCoords[1],
        fromName: startName || 'Current Location',
        toName: destName || 'Destination',
        cityId,
      }),
      this.fetchRoadGeometries(startCoords, destCoords, mode),
    ]);

    const routes: SafetyAwareRouteOption[] = backendResult.routes.map((backendOption: any) => {
      let geometry: RouteGeometry | undefined;
      if (backendOption.id === 'fastest') {
        geometry = roadGeometries[0];
      } else if (backendOption.id === 'balanced') {
        geometry = roadGeometries[1] || roadGeometries[0];
      } else {
        geometry = roadGeometries[2] || roadGeometries[1] || roadGeometries[0];
      }

      const coords: [number, number][] = geometry
        ? geometry.coordinates
        : backendOption.waypoints.map((w: any) => [w.lat, w.lng] as [number, number]);

      const distanceKm = geometry ? geometry.distanceKm : backendOption.distanceKm;
      const durationMinutes = geometry ? geometry.durationMinutes : backendOption.durationMinutes;

      return {
        id: backendOption.id,
        title: backendOption.title,
        badge: backendOption.badge,
        distanceKm,
        distanceLabel: `${distanceKm} km`,
        durationMinutes,
        durationLabel: `${durationMinutes} min`,
        riskTier: backendOption.riskTier,
        riskScore: backendOption.riskScore,
        color:
          backendOption.id === 'safest'
            ? '#10B981'
            : backendOption.id === 'fastest'
            ? '#3B82F6'
            : '#F59E0B',
        description: backendOption.description,
        highlights: backendOption.highlights,
        hazards: backendOption.hazards,
        coordinates: coords,
      };
    });

    return {
      routes,
      recommendationReason:
        backendResult.recommendationReason ||
        'Route ranked using YatraGuard incident reports, mapped safety zones, and OSRM road paths.',
      disclaimer:
        backendResult.disclaimer ||
        'Safety ratings combine reported incident density, mapped safety zones, and OSRM routing. Real-world conditions may change.',
    };
  }
}

export const roadRoutingService = new RoadRoutingService();
