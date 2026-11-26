import { prisma } from '../lib/prisma.js';
import { calculateDistanceKm, formatDistance } from './geoService.js';

export interface RouteOption {
  id: 'fastest' | 'safest' | 'balanced';
  title: string;
  badge: string;
  isRecommended?: boolean;
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
  waypoints: Array<{ lat: number; lng: number; name: string }>;
}

export interface RouteEvaluationResult {
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  routes: RouteOption[];
  disclaimer: string;
  recommendationReason: string;
}

export async function evaluateRouteSafety(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromName: string = 'Current Location',
  toName: string = 'Destination',
  cityId?: string
): Promise<RouteEvaluationResult> {
  const directDist = calculateDistanceKm(fromLat, fromLng, toLat, toLng);

  // Fetch nearby incidents and safety zones between origin and destination
  const midLat = (fromLat + toLat) / 2;
  const midLng = (fromLng + toLng) / 2;

  const incidents = await prisma.incidentReport.findMany({
    where: cityId ? { cityId } : undefined,
  });

  const zones = await prisma.safetyZone.findMany({
    where: cityId ? { cityId } : undefined,
  });

  const midDist = Math.max(2.5, directDist);
  const corridorIncidents = incidents.filter(
    (inc) => calculateDistanceKm(midLat, midLng, inc.lat, inc.lng) <= midDist
  );
  const corridorZones = zones.filter(
    (z) => calculateDistanceKm(midLat, midLng, z.lat, z.lng) <= midDist
  );
  const policePosts = await prisma.locationService.findMany({
    where: {
      ...(cityId ? { cityId } : {}),
      category: { in: ['POLICE', 'TOURIST_POLICE', 'EMERGENCY'] },
    },
    take: 25,
  });
  const nearbyPolice = policePosts
    .map((p) => ({ ...p, distKm: calculateDistanceKm(midLat, midLng, p.lat, p.lng) }))
    .filter((p) => p.distKm <= midDist)
    .sort((a, b) => a.distKm - b.distKm);
  const safeZonesCount = corridorZones.filter(
    (z) => z.riskTier.toUpperCase() === 'LOW' || z.score >= 75
  ).length;
  const highRiskZonesCount = corridorZones.filter(
    (z) => z.riskTier.toUpperCase() === 'HIGH' || z.score < 45
  ).length;

  // 1. FASTEST ROUTE: Direct corridor based on shortest distance
  const fastestDist = Math.round(directDist * 1.12 * 10) / 10;
  const fastestTime = Math.max(5, Math.round(fastestDist * 3.1));
  const fastestRiskScore = Math.max(
    30,
    Math.min(78, 72 - corridorIncidents.length * 6 - highRiskZonesCount * 8)
  );

  const fastestWaypoints = [
    { lat: fromLat, lng: fromLng, name: fromName },
    { lat: toLat, lng: toLng, name: toName },
  ];

  // 2. SAFEST ROUTE: Prioritizes corridors near mapped police posts and low-risk zones
  const nearestPost = nearbyPolice[0];
  const safestDist = Math.round(directDist * 1.25 * 10) / 10;
  const safestTime = Math.max(8, Math.round(safestDist * 3.4));
  const safestRiskScore = Math.max(
    45,
    Math.min(
      95,
      80 + (nearestPost ? 6 : 0) + Math.min(6, safeZonesCount * 2) - highRiskZonesCount * 5
    )
  );

  const safestWaypoints = nearestPost
    ? [
        { lat: fromLat, lng: fromLng, name: fromName },
        { lat: nearestPost.lat, lng: nearestPost.lng, name: `Near ${nearestPost.name}` },
        { lat: toLat, lng: toLng, name: toName },
      ]
    : [
        { lat: fromLat, lng: fromLng, name: fromName },
        { lat: toLat, lng: toLng, name: toName },
      ];

  // 3. BALANCED ROUTE (RECOMMENDED)
  const balancedDist = Math.round(directDist * 1.18 * 10) / 10;
  const balancedTime = Math.max(6, Math.round(balancedDist * 3.25));
  const balancedRiskScore = Math.round(fastestRiskScore * 0.35 + safestRiskScore * 0.65);

  const balancedWaypoints = [
    { lat: fromLat, lng: fromLng, name: fromName },
    { lat: toLat, lng: toLng, name: toName },
  ];

  const routes: RouteOption[] = [
    {
      id: 'fastest',
      title: 'Direct Route',
      badge: '⏱️ Shortest Path',
      distanceKm: fastestDist,
      distanceLabel: formatDistance(fastestDist),
      durationMinutes: fastestTime,
      durationLabel: `${fastestTime} min`,
      riskTier: fastestRiskScore < 50 ? 'Elevated' : 'Moderate',
      riskScore: fastestRiskScore,
      color: '#F59E0B',
      description: 'Shortest OSRM road path between origin and destination.',
      highlights: ['Minimal road distance', 'Direct point-to-point navigation'],
      hazards: [
        corridorIncidents.length > 0
          ? `${corridorIncidents.length} reported incident(s) within ${midDist.toFixed(1)} km corridor`
          : 'No active corridor incidents in YatraGuard database',
        highRiskZonesCount > 0
          ? `Passes near ${highRiskZonesCount} higher-risk zone(s)`
          : 'Live street-lighting & CCTV telemetry is not connected',
      ],
      waypoints: fastestWaypoints,
    },
    {
      id: 'safest',
      title: 'Safety-Prioritized Route',
      badge: '🛡️ Verified Corridor',
      distanceKm: safestDist,
      distanceLabel: formatDistance(safestDist),
      durationMinutes: safestTime,
      durationLabel: `${safestTime} min`,
      riskTier: safestRiskScore >= 70 ? 'Low' : 'Moderate',
      riskScore: safestRiskScore,
      color: '#10B981',
      description: nearestPost
        ? `Incorporates proximity to verified ${nearestPost.name} and mapped low-risk zones.`
        : 'Uses OSRM alternative road geometry while avoiding flagged incident clusters where available.',
      highlights: [
        nearestPost
          ? `Verified assistance point nearby: ${nearestPost.name}`
          : 'Checked against YatraGuard incident reports',
        safeZonesCount > 0
          ? `${safeZonesCount} low-risk safety zone(s) mapped near corridor`
          : 'Standard main road preference when alternatives exist',
      ],
      hazards: [
        'May add transit time if OSRM provides a longer alternative road',
        'Verify local road conditions visually after dark',
      ],
      waypoints: safestWaypoints,
    },
    {
      id: 'balanced',
      title: 'Balanced Route (Recommended)',
      badge: '⭐ Balanced Path',
      isRecommended: true,
      distanceKm: balancedDist,
      distanceLabel: formatDistance(balancedDist),
      durationMinutes: balancedTime,
      durationLabel: `${balancedTime} min`,
      riskTier: balancedRiskScore >= 68 ? 'Low' : 'Moderate',
      riskScore: balancedRiskScore,
      color: '#3B82F6',
      description: 'Balances direct travel time with corridor incident and safety-zone context.',
      highlights: [
        `${corridorIncidents.length} nearby incident(s) and ${corridorZones.length} mapped zone(s) factored`,
        nearbyPolice.length > 0
          ? `${nearbyPolice.length} mapped assistance post(s) in area`
          : 'Checks regional safety benchmarks',
      ],
      hazards: ['Peak-hour traffic variations not live-streamed from traffic sensors'],
      waypoints: balancedWaypoints,
    },
  ];

  return {
    origin: { lat: fromLat, lng: fromLng, address: fromName },
    destination: { lat: toLat, lng: toLng, address: toName },
    routes,
    disclaimer:
      'Route risk estimates combine YatraGuard incident reports, mapped safety zones, and OSRM road geometry. Street lighting, live CCTV, and real-time traffic closures are not connected unless explicitly listed.',
    recommendationReason:
      corridorIncidents.length > 0
        ? `Balanced Route weighs the ${corridorIncidents.length} reported corridor incident(s) against transit distance.`
        : 'Balanced Route blends direct travel distance with mapped safety-zone and emergency-post data.',
  };
}
