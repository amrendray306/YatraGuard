import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm, formatDistance } from './geoService.js';

const prisma = new PrismaClient();

export interface SafetyScoreCalculationParams {
  lat: number;
  lng: number;
  cityId?: string;
  simulatedHour?: number; // Optional time of day override (0-23)
  weatherSeverity?: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface DetailedSafetyScore {
  score: number;
  tier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Insufficient Data';
  tierColor: string;
  label: string;
  timeContext: {
    hour: number;
    isNightTime: boolean;
    timeLabel: string;
  };
  factors: Array<{
    type: 'positive' | 'warning' | 'negative' | 'info';
    category: 'POLICE' | 'MEDICAL' | 'INCIDENTS' | 'SCAMS' | 'ZONES' | 'TIME' | 'WEATHER';
    text: string;
    impact: number;
  }>;
  nearestServices: {
    hospital?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    police?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    pharmacy?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    transport?: { name: string; distance: string; distanceKm: number; phone?: string | null };
  };
  incidentCountNearby: number;
  scamCountNearby: number;
  activeZoneName?: string;
  disclaimer: string;
}

export class SafetyIntelligenceService {
  /**
   * Location-based Bayesian Safety / Risk Score (0-100 scale)
   */
  public async calculateSafetyScore(
    params: SafetyScoreCalculationParams
  ): Promise<DetailedSafetyScore> {
    const { lat, lng, cityId, simulatedHour, weatherSeverity } = params;

    // 1. Identify Target City
    let city = cityId ? await prisma.city.findUnique({ where: { id: cityId } }) : null;

    if (!city) {
      const allCities = await prisma.city.findMany();
      let minDist = Infinity;
      for (const c of allCities) {
        const d = calculateDistanceKm(lat, lng, c.lat, c.lng);
        if (d < minDist) {
          minDist = d;
          city = c;
        }
      }
    }

    // Check if location is wildly outside supported boundaries (> 150 km from closest city)
    const distanceToClosestCity = city ? calculateDistanceKm(lat, lng, city.lat, city.lng) : Infinity;
    if (distanceToClosestCity > 150) {
      return {
        score: 50,
        tier: 'Insufficient Data',
        tierColor: '#94A3B8',
        label: 'Insufficient Local Data',
        timeContext: {
          hour: simulatedHour !== undefined ? simulatedHour : new Date().getHours(),
          isNightTime: false,
          timeLabel: 'Standard Daylight',
        },
        factors: [
          {
            type: 'info',
            category: 'ZONES',
            text: 'This location is beyond dense urban safety telemetry. Maintain standard travel vigilance.',
            impact: 0,
          },
        ],
        nearestServices: {},
        incidentCountNearby: 0,
        scamCountNearby: 0,
        disclaimer:
          'IMPORTANT: This is an estimated risk indicator, not a guarantee of safety. An area with insufficient data should not be assumed safe.',
      };
    }

    const baseScore = city ? city.defaultSafetyScore : 75;
    let score = baseScore;
    const factors: DetailedSafetyScore['factors'] = [];

    // 2. Proximity to Vital Emergency Infrastructure
    const services = await prisma.locationService.findMany({
      where: city ? { cityId: city.id } : undefined,
    });

    let nearestHospital: any;
    let nearestPolice: any;
    let nearestPharmacy: any;
    let nearestTransport: any;

    let minHospitalDist = Infinity;
    let minPoliceDist = Infinity;
    let minPharmacyDist = Infinity;
    let minTransportDist = Infinity;

    for (const s of services) {
      const dist = calculateDistanceKm(lat, lng, s.lat, s.lng);
      if (s.category === 'HOSPITAL' && dist < minHospitalDist) {
        minHospitalDist = dist;
        nearestHospital = { name: s.name, distance: formatDistance(dist), distanceKm: dist, phone: s.phone };
      } else if (s.category === 'POLICE' && dist < minPoliceDist) {
        minPoliceDist = dist;
        nearestPolice = { name: s.name, distance: formatDistance(dist), distanceKm: dist, phone: s.phone };
      } else if (s.category === 'PHARMACY' && dist < minPharmacyDist) {
        minPharmacyDist = dist;
        nearestPharmacy = { name: s.name, distance: formatDistance(dist), distanceKm: dist, phone: s.phone };
      } else if (s.category === 'TRANSPORT' && dist < minTransportDist) {
        minTransportDist = dist;
        nearestTransport = { name: s.name, distance: formatDistance(dist), distanceKm: dist, phone: s.phone };
      }
    }

    // Police proximity weighting
    if (minPoliceDist <= 1.2) {
      score += 8;
      factors.push({
        type: 'positive',
        category: 'POLICE',
        text: `✓ Immediate Police station / patrol post within ${formatDistance(minPoliceDist)} (Helpline: 112)`,
        impact: +8,
      });
    } else if (minPoliceDist <= 3.0) {
      score += 4;
      factors.push({
        type: 'positive',
        category: 'POLICE',
        text: `✓ Police coverage accessible within ${formatDistance(minPoliceDist)}`,
        impact: +4,
      });
    } else if (minPoliceDist > 5.5 && minPoliceDist < Infinity) {
      score -= 6;
      factors.push({
        type: 'warning',
        category: 'POLICE',
        text: `⚠️ Police outpost is relatively far (${formatDistance(minPoliceDist)} away)`,
        impact: -6,
      });
    }

    // Hospital / Trauma Centre proximity weighting
    if (minHospitalDist <= 2.0) {
      score += 7;
      factors.push({
        type: 'positive',
        category: 'MEDICAL',
        text: `✓ 24x7 Emergency hospital trauma care within ${formatDistance(minHospitalDist)} (Helpline: 108)`,
        impact: +7,
      });
    } else if (minHospitalDist <= 4.0) {
      score += 3;
      factors.push({
        type: 'positive',
        category: 'MEDICAL',
        text: `✓ Emergency medical facility reachable in under 15 minutes (${formatDistance(minHospitalDist)})`,
        impact: +3,
      });
    } else if (minHospitalDist > 7.0 && minHospitalDist < Infinity) {
      score -= 5;
      factors.push({
        type: 'warning',
        category: 'MEDICAL',
        text: `⚠️ Hospital trauma care requires extended travel (${formatDistance(minHospitalDist)})`,
        impact: -5,
      });
    }

    // 3. Incidents within 3.0 km (Severity weighted)
    const incidents = await prisma.incidentReport.findMany({
      where: city ? { cityId: city.id, status: { not: 'REJECTED' } } : undefined,
    });

    const nearbyIncidents = incidents.filter((inc) => {
      const d = calculateDistanceKm(lat, lng, inc.lat, inc.lng);
      return d <= 3.0;
    });

    if (nearbyIncidents.length === 0) {
      score += 4;
      factors.push({
        type: 'positive',
        category: 'INCIDENTS',
        text: '✓ Zero recent safety incidents or theft reports in immediate sector',
        impact: +4,
      });
    } else {
      let incidentPenalty = 0;
      nearbyIncidents.forEach((inc) => {
        if (inc.category === 'harassment' || inc.category === 'theft') incidentPenalty += 5;
        else if (inc.category === 'transport_issue' || inc.category === 'scam') incidentPenalty += 3;
        else incidentPenalty += 2;
      });
      incidentPenalty = Math.min(22, incidentPenalty);
      score -= incidentPenalty;

      factors.push({
        type: incidentPenalty > 10 ? 'negative' : 'warning',
        category: 'INCIDENTS',
        text: `⚠️ ${nearbyIncidents.length} active incident report(s) logged within 3.0 km`,
        impact: -incidentPenalty,
      });
    }

    // 4. Active Tourist Scams within 2.5 km
    const scams = await prisma.scamReport.findMany({
      where: city ? { cityId: city.id } : undefined,
    });

    const nearbyScams = scams.filter((sc) => {
      const d = calculateDistanceKm(lat, lng, sc.lat, sc.lng);
      return d <= 2.5;
    });

    if (nearbyScams.length > 0) {
      const scamPenalty = Math.min(14, nearbyScams.length * 4);
      score -= scamPenalty;
      factors.push({
        type: 'warning',
        category: 'SCAMS',
        text: `⚠️ ${nearbyScams.length} active tourist tout / overcharging pattern(s) flagged nearby`,
        impact: -scamPenalty,
      });
    }

    // 5. Safety Zones and Corridors Check
    const zones = await prisma.safetyZone.findMany({
      where: city ? { cityId: city.id } : undefined,
    });

    let activeZoneName: string | undefined;
    for (const z of zones) {
      const d = calculateDistanceKm(lat, lng, z.lat, z.lng);
      if (d <= z.radiusKm) {
        activeZoneName = z.name;
        if (z.riskTier === 'VERY_GOOD' || z.riskTier === 'GOOD') {
          score += 6;
          factors.push({
            type: 'positive',
            category: 'ZONES',
            text: `✓ Within verified secure heritage/VIP corridor: ${z.name}`,
            impact: +6,
          });
        } else if (z.riskTier === 'HIGH_RISK' || z.riskTier === 'MODERATE') {
          score -= 10;
          factors.push({
            type: 'negative',
            category: 'ZONES',
            text: `⚠️ Caution Zone: ${z.name} - ${z.reason}`,
            impact: -10,
          });
        }
        if (z.timeHazard) {
          factors.push({
            type: 'warning',
            category: 'ZONES',
            text: `⚠️ Time Advisory: ${z.timeHazard}`,
            impact: 0,
          });
        }
        break;
      }
    }

    // 6. Time of Day Hazard (Indian Standard Time or simulated hour)
    const currentHour = simulatedHour !== undefined ? simulatedHour : new Date().getHours();
    const isNightTime = currentHour >= 22 || currentHour < 5;

    if (isNightTime) {
      score -= 10;
      factors.push({
        type: 'warning',
        category: 'TIME',
        text: '⚠️ Late Night Risk (10:00 PM – 05:00 AM): Diminished street footfall. Avoid unlit lanes.',
        impact: -10,
      });
    } else if (currentHour >= 8 && currentHour <= 19) {
      score += 4;
      factors.push({
        type: 'positive',
        category: 'TIME',
        text: '✓ Active Daylight Hours: High public visibility and active retail commerce',
        impact: +4,
      });
    }

    // 7. Weather-Related Environmental Hazards
    if (weatherSeverity === 'HIGH') {
      score -= 7;
      factors.push({
        type: 'warning',
        category: 'WEATHER',
        text: '⚠️ Severe Weather Advisory: Torrential rain or heavy mountain fog reduces road safety',
        impact: -7,
      });
    } else if (weatherSeverity === 'MODERATE') {
      score -= 3;
      factors.push({
        type: 'info',
        category: 'WEATHER',
        text: 'ℹ️ Moderate Weather Advisory: Check surface conditions before mountain transit',
        impact: -3,
      });
    }

    // Clamp score between 20 and 96 (Safety scores should never be 0 or 100)
    score = Math.max(22, Math.min(94, Math.round(score)));

    // Categorize into production tiers: Low Risk (80-100), Moderate Risk (55-79), High Risk (<55)
    let tier: DetailedSafetyScore['tier'] = 'Low Risk';
    let tierColor = '#10B981'; // Green

    if (score < 55) {
      tier = 'High Risk';
      tierColor = '#EF4444'; // Red
    } else if (score < 80) {
      tier = 'Moderate Risk';
      tierColor = '#F59E0B'; // Amber
    } else {
      tier = 'Low Risk';
      tierColor = '#10B981'; // Emerald
    }

    const timeLabel = isNightTime ? 'Night Hazard Period' : 'Daylight Hours';

    return {
      score,
      tier,
      tierColor,
      label: 'Estimated Safety Score',
      timeContext: {
        hour: currentHour,
        isNightTime,
        timeLabel,
      },
      factors,
      nearestServices: {
        hospital: nearestHospital,
        police: nearestPolice,
        pharmacy: nearestPharmacy,
        transport: nearestTransport,
      },
      incidentCountNearby: nearbyIncidents.length,
      scamCountNearby: nearbyScams.length,
      activeZoneName,
      disclaimer:
        'IMPORTANT: This is an estimated risk indicator, not a guarantee of safety. Do not label an area safe simply because it has no reports. Always exercise personal situational awareness.',
    };
  }

  /**
   * Cross-city safety baseline comparison table
   */
  public async getCrossCitySafetyBaselines() {
    return prisma.city.findMany({
      select: {
        id: true,
        name: true,
        state: true,
        tier: true,
        defaultSafetyScore: true,
        description: true,
      },
      orderBy: { defaultSafetyScore: 'desc' },
    });
  }
}

export const safetyIntelligenceService = new SafetyIntelligenceService();

