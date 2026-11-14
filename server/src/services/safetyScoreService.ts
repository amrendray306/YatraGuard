import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm, formatDistance } from './geoService.js';

const prisma = new PrismaClient();

export interface SafetyScoreResult {
  score: number;
  tier: 'High Risk' | 'Moderate Risk' | 'Acceptable' | 'Good' | 'Very Good';
  tierColor: string;
  label: string;
  factors: Array<{
    type: 'positive' | 'warning' | 'negative';
    text: string;
  }>;
  nearestServices: {
    hospital?: { name: string; distance: string; distanceKm: number };
    police?: { name: string; distance: string; distanceKm: number };
    pharmacy?: { name: string; distance: string; distanceKm: number };
    transport?: { name: string; distance: string; distanceKm: number };
  };
  incidentCountNearby: number;
  scamCountNearby: number;
  disclaimer: string;
}

export async function calculateSafetyScore(
  lat: number,
  lng: number,
  cityId?: string
): Promise<SafetyScoreResult> {
  // 1. Fetch relevant city or find closest city
  let city = cityId ? await prisma.city.findUnique({ where: { id: cityId } }) : null;

  if (!city) {
    const allCities = await prisma.city.findMany();
    if (allCities.length > 0) {
      let minDist = Infinity;
      for (const c of allCities) {
        const d = calculateDistanceKm(lat, lng, c.lat, c.lng);
        if (d < minDist) {
          minDist = d;
          city = c;
        }
      }
    }
  }

  const baseScore = city ? city.defaultSafetyScore : 75;
  let score = baseScore;
  const factors: Array<{ type: 'positive' | 'warning' | 'negative'; text: string }> = [];

  // 2. Fetch all services for the city (or all if no city)
  const services = await prisma.locationService.findMany({
    where: city ? { cityId: city.id } : undefined,
  });

  let nearestHospital: { name: string; distance: string; distanceKm: number } | undefined;
  let nearestPolice: { name: string; distance: string; distanceKm: number } | undefined;
  let nearestPharmacy: { name: string; distance: string; distanceKm: number } | undefined;
  let nearestTransport: { name: string; distance: string; distanceKm: number } | undefined;

  let minHospitalDist = Infinity;
  let minPoliceDist = Infinity;
  let minPharmacyDist = Infinity;
  let minTransportDist = Infinity;

  for (const s of services) {
    const dist = calculateDistanceKm(lat, lng, s.lat, s.lng);
    if (s.category === 'HOSPITAL' && dist < minHospitalDist) {
      minHospitalDist = dist;
      nearestHospital = { name: s.name, distance: formatDistance(dist), distanceKm: dist };
    } else if (s.category === 'POLICE' && dist < minPoliceDist) {
      minPoliceDist = dist;
      nearestPolice = { name: s.name, distance: formatDistance(dist), distanceKm: dist };
    } else if (s.category === 'PHARMACY' && dist < minPharmacyDist) {
      minPharmacyDist = dist;
      nearestPharmacy = { name: s.name, distance: formatDistance(dist), distanceKm: dist };
    } else if (s.category === 'TRANSPORT' && dist < minTransportDist) {
      minTransportDist = dist;
      nearestTransport = { name: s.name, distance: formatDistance(dist), distanceKm: dist };
    }
  }

  // Police proximity factor
  if (minPoliceDist <= 1.5) {
    score += 8;
    factors.push({
      type: 'positive',
      text: `✓ Police station / outpost nearby (${formatDistance(minPoliceDist)})`,
    });
  } else if (minPoliceDist <= 3.0) {
    score += 4;
    factors.push({
      type: 'positive',
      text: `✓ Police coverage accessible (${formatDistance(minPoliceDist)})`,
    });
  } else if (minPoliceDist > 6.0 && minPoliceDist < Infinity) {
    score -= 6;
    factors.push({
      type: 'warning',
      text: `⚠️ Police outpost is relatively far (${formatDistance(minPoliceDist)})`,
    });
  }

  // Hospital proximity factor
  if (minHospitalDist <= 2.0) {
    score += 6;
    factors.push({
      type: 'positive',
      text: `✓ 24/7 Emergency hospital within reach (${formatDistance(minHospitalDist)})`,
    });
  } else if (minHospitalDist <= 4.0) {
    score += 2;
    factors.push({
      type: 'positive',
      text: `✓ Hospital reachable within 15 minutes (${formatDistance(minHospitalDist)})`,
    });
  }

  // 3. Incidents within 3.0 km
  const incidents = await prisma.incidentReport.findMany({
    where: city ? { cityId: city.id } : undefined,
  });

  const nearbyIncidents = incidents.filter((inc) => {
    const d = calculateDistanceKm(lat, lng, inc.lat, inc.lng);
    return d <= 3.0 && inc.status !== 'REJECTED';
  });

  if (nearbyIncidents.length === 0) {
    score += 5;
    factors.push({
      type: 'positive',
      text: '✓ Low recent incident density in this sector',
    });
  } else if (nearbyIncidents.length <= 2) {
    score -= 4;
    factors.push({
      type: 'warning',
      text: `⚠️ ${nearbyIncidents.length} recent incident(s) reported in this area`,
    });
  } else {
    score -= Math.min(20, nearbyIncidents.length * 4);
    factors.push({
      type: 'negative',
      text: `⚠️ Elevated incident cluster: ${nearbyIncidents.length} recent reports nearby`,
    });
  }

  // 4. Active Scams within 2.0 km
  const scams = await prisma.scamReport.findMany({
    where: city ? { cityId: city.id } : undefined,
  });

  const nearbyScams = scams.filter((sc) => {
    const d = calculateDistanceKm(lat, lng, sc.lat, sc.lng);
    return d <= 2.5;
  });

  if (nearbyScams.length > 0) {
    score -= Math.min(15, nearbyScams.length * 4);
    factors.push({
      type: 'warning',
      text: `⚠️ ${nearbyScams.length} active tourist scam pattern(s) reported nearby`,
    });
  }

  // 5. Safety Zones Check
  const zones = await prisma.safetyZone.findMany({
    where: city ? { cityId: city.id } : undefined,
  });

  for (const z of zones) {
    const d = calculateDistanceKm(lat, lng, z.lat, z.lng);
    if (d <= z.radiusKm) {
      if (z.riskTier === 'VERY_GOOD' || z.riskTier === 'GOOD') {
        score += 6;
        factors.push({
          type: 'positive',
          text: `✓ Within protected corridor: ${z.name}`,
        });
      } else if (z.riskTier === 'HIGH_RISK' || z.riskTier === 'MODERATE') {
        score -= 10;
        factors.push({
          type: 'warning',
          text: `⚠️ Caution Zone: ${z.name} - ${z.reason}`,
        });
      }
      if (z.timeHazard) {
        factors.push({
          type: 'warning',
          text: `⚠️ Advisory: ${z.timeHazard}`,
        });
      }
      break;
    }
  }

  // 6. Time of day factor (Indian Standard Time or local hour)
  const currentHour = new Date().getHours();
  if (currentHour >= 22 || currentHour < 5) {
    score -= 8;
    factors.push({
      type: 'warning',
      text: '⚠️ Night hours (after 10 PM): Stick to well-lit arterial thoroughfares',
    });
  } else if (currentHour >= 8 && currentHour <= 20) {
    score += 4;
    factors.push({
      type: 'positive',
      text: '✓ Daylight hours: High pedestrian & business activity',
    });
  }

  // Clamp score between 20 and 95 (Safety scores should never be 0 or 100)
  score = Math.max(22, Math.min(94, Math.round(score)));

  let tier: 'High Risk' | 'Moderate Risk' | 'Acceptable' | 'Good' | 'Very Good';
  let tierColor = '#10B981'; // Green

  if (score <= 30) {
    tier = 'High Risk';
    tierColor = '#EF4444'; // Red
  } else if (score <= 50) {
    tier = 'Moderate Risk';
    tierColor = '#F59E0B'; // Amber
  } else if (score <= 70) {
    tier = 'Acceptable';
    tierColor = '#3B82F6'; // Blue
  } else if (score <= 85) {
    tier = 'Good';
    tierColor = '#10B981'; // Emerald
  } else {
    tier = 'Very Good';
    tierColor = '#059669'; // Deep Green
  }

  return {
    score,
    tier,
    tierColor,
    label: 'Estimated Safety Score',
    factors,
    nearestServices: {
      hospital: nearestHospital,
      police: nearestPolice,
      pharmacy: nearestPharmacy,
      transport: nearestTransport,
    },
    incidentCountNearby: nearbyIncidents.length,
    scamCountNearby: nearbyScams.length,
    disclaimer:
      'Estimated Safety Score based on nearby emergency services, reported incidents, and time factors. Not an absolute guarantee.',
  };
}
