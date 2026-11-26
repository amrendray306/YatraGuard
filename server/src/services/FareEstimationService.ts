import { prisma } from '../lib/prisma.js';
import { calculateDistanceKm } from './geoService.js';

export interface FareCalculationInput {
  cityId?: string;
  cityName?: string;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  travelHour?: number; // 0-23
  hasLuggage?: boolean;
  passengerCount?: number;
}

export interface TransitOptionEstimate {
  transportModeId: string;
  displayName: string;
  vehicleType: string;
  isMetered: boolean;
  minFare: number;
  avgFare: number;
  maxFare: number;
  estimatedDurationMin: number;
  perKmRate: number;
  baseFare: number;
  baseDistanceKm: number;
  nightSurchargeApplied: boolean;
  nightSurchargePct: number;
  hillTerrainSurchargeApplied: boolean;
  hillTerrainSurchargePct: number;
  sourceType: string;
  officialCircularRef?: string | null;
  reliabilityScore: number;
  notes?: string | null;
  communityReportCount: number;
  communityAvgPaid?: number | null;
}

export interface MultiModalFareResult {
  city: {
    id: string;
    name: string;
    state: string;
    tier: string;
  };
  tripDetails: {
    origin: string;
    destination: string;
    distanceKm: number;
    travelHour: number;
    isNightTime: boolean;
    isMountainTerrain: boolean;
  };
  options: TransitOptionEstimate[];
  timestamp: string;
}

export interface OverchargeAuditResult {
  verdict: 'FAIR' | 'SLIGHTLY_ELEVATED' | 'POTENTIAL_OVERCHARGE' | 'SEVERE_OVERCHARGE';
  isOvercharge: boolean;
  quotedFare: number;
  expectedFare: {
    min: number;
    avg: number;
    max: number;
  };
  differenceAmount: number;
  differencePercentage: number;
  transportMode: string;
  confidenceScore: number;
  warningMessage: string;
  recommendedAction: string;
  officialReference?: string | null;
  disclaimer: string;
}

// Well-known benchmark corridors across Indian tourist destinations
const POPULAR_CORRIDORS: Record<
  string,
  { distanceKm: number; cityName: string; isMountain?: boolean }
> = {
  // Manali
  'mall road to solang valley': { distanceKm: 13.5, cityName: 'Manali', isMountain: true },
  'solang valley to mall road': { distanceKm: 13.5, cityName: 'Manali', isMountain: true },
  'mall road to rohtang pass': { distanceKm: 51.0, cityName: 'Manali', isMountain: true },
  'mall road to atal tunnel': { distanceKm: 28.0, cityName: 'Manali', isMountain: true },
  'mall road to hadimba temple': { distanceKm: 2.2, cityName: 'Manali', isMountain: true },
  'mall road to old manali': { distanceKm: 2.5, cityName: 'Manali', isMountain: true },
  'manali bus stand to vashisht': { distanceKm: 3.8, cityName: 'Manali', isMountain: true },

  // Haridwar & Rishikesh
  'haridwar railway station to rishikesh': { distanceKm: 28.0, cityName: 'Haridwar' },
  'haridwar junction to rishikesh': { distanceKm: 28.0, cityName: 'Haridwar' },
  'haridwar to rishikesh': { distanceKm: 28.0, cityName: 'Haridwar' },
  'haridwar railway station to har ki pauri': { distanceKm: 2.5, cityName: 'Haridwar' },
  'har ki pauri to mansa devi': { distanceKm: 3.0, cityName: 'Haridwar' },
  'rishikesh to tapovan': { distanceKm: 4.5, cityName: 'Rishikesh' },
  'rishikesh to laxman jhula': { distanceKm: 4.0, cityName: 'Rishikesh' },
  'rishikesh to shivpuri': { distanceKm: 16.0, cityName: 'Rishikesh', isMountain: true },

  // Delhi
  'delhi airport to connaught place': { distanceKm: 18.0, cityName: 'Delhi' },
  'igi airport to connaught place': { distanceKm: 18.0, cityName: 'Delhi' },
  'new delhi railway station to india gate': { distanceKm: 5.5, cityName: 'Delhi' },
  'connaught place to qutub minar': { distanceKm: 15.0, cityName: 'Delhi' },
  'connaught place to red fort': { distanceKm: 6.0, cityName: 'Delhi' },

  // Mumbai
  'mumbai airport to marine drive': { distanceKm: 22.0, cityName: 'Mumbai' },
  'chhatrapati shivaji terminus to gateway of india': { distanceKm: 2.5, cityName: 'Mumbai' },
  'bandra to andheri': { distanceKm: 10.5, cityName: 'Mumbai' },

  // Agra
  'agra cantt to taj mahal': { distanceKm: 6.5, cityName: 'Agra' },
  'taj mahal to agra fort': { distanceKm: 2.8, cityName: 'Agra' },

  // Jaipur
  'jaipur railway station to hawa mahal': { distanceKm: 5.2, cityName: 'Jaipur' },
  'hawa mahal to amer fort': { distanceKm: 11.0, cityName: 'Jaipur' },
};

export class FareEstimationService {
  /**
   * Resolve distance in kilometers from origin/destination strings or coordinates
   */
  public resolveTripDistance(
    origin?: string,
    destination?: string,
    explicitDistanceKm?: number,
    cityName?: string
  ): { distanceKm: number; isMountain: boolean } {
    if (explicitDistanceKm && explicitDistanceKm > 0) {
      const isMountain = cityName?.toLowerCase() === 'manali' || cityName?.toLowerCase() === 'shimla';
      return { distanceKm: explicitDistanceKm, isMountain };
    }

    if (origin && destination) {
      const key = `${origin.trim().toLowerCase()} to ${destination.trim().toLowerCase()}`;
      if (POPULAR_CORRIDORS[key]) {
        return {
          distanceKm: POPULAR_CORRIDORS[key].distanceKm,
          isMountain: Boolean(POPULAR_CORRIDORS[key].isMountain),
        };
      }
    }

    // Default reasonable urban segment if unknown
    const isMountain = cityName?.toLowerCase() === 'manali';
    return { distanceKm: isMountain ? 10.0 : 7.5, isMountain };
  }

  /**
   * Main multi-modal transportation fare estimation calculation
   */
  public async estimateFares(input: FareCalculationInput): Promise<MultiModalFareResult> {
    // 1. Resolve Target City
    let city = null;
    if (input.cityId) {
      city = await prisma.city.findUnique({
        where: { id: input.cityId },
      });
    }

    if (!city && input.cityName) {
      city = await prisma.city.findFirst({
        where: {
          name: {
            contains: input.cityName.trim(),
          },
        },
      });
    }

    if (!city) {
      // Fallback to Delhi as primary benchmark if none found
      city = await prisma.city.findFirst({
        where: { name: 'Delhi' },
      });
    }

    if (!city) {
      throw new Error('No valid city found for transportation fare estimation.');
    }

    // 2. Resolve Distance and Terrain Profile
    const { distanceKm, isMountain } = this.resolveTripDistance(
      input.origin,
      input.destination,
      input.distanceKm,
      city.name
    );

    const now = new Date();
    const currentHour = input.travelHour !== undefined ? input.travelHour : now.getHours();
    // In India, night transit tariffs typically apply between 23:00 (11 PM) and 05:00 (5 AM)
    const isNightTime = currentHour >= 23 || currentHour < 5;

    // 3. Fetch City-Specific Fare Rules
    const fareRules = await prisma.cityFareRule.findMany({
      where: { cityId: city.id },
      include: { transportMode: true },
    });

    // If city has no rules yet, grab Delhi rules as standard calibrated baseline
    let activeRules = fareRules;
    if (activeRules.length === 0) {
      const fallbackCity = await prisma.city.findFirst({
        where: { name: 'Delhi' },
        include: { fareRules: { include: { transportMode: true } } },
      });
      activeRules = fallbackCity?.fareRules || [];
    }

    // 4. Fetch Verified Community Reports for this City
    const communityReports = await prisma.fareReport.findMany({
      where: {
        cityId: city.id,
        verificationStatus: 'COMMUNITY_VERIFIED',
      },
    });

    // 5. Compute Fare Estimates per Mode
    const options: TransitOptionEstimate[] = activeRules.map((rule) => {
      const mode = rule.transportMode;
      const baseDistance = rule.baseDistanceKm || 1.5;
      const baseFare = rule.baseFare;
      const perKm = rule.perKmRate;

      // Distance calculation beyond flag drop
      const extraKm = Math.max(0, distanceKm - baseDistance);
      let calculatedBase = baseFare + extraKm * perKm;

      // Hill terrain multiplier (e.g. 20-25% in Manali)
      const hillSurchargePct = rule.hillTerrainSurchargePct || (isMountain ? 20.0 : 0.0);
      const hillAdjustment = hillSurchargePct > 0 ? (calculatedBase * hillSurchargePct) / 100 : 0;
      calculatedBase += hillAdjustment;

      // Night surcharge (23:00 - 05:00)
      let nightAdjustment = 0;
      if (isNightTime && rule.nightSurchargePct > 0) {
        nightAdjustment = (calculatedBase * rule.nightSurchargePct) / 100;
        calculatedBase += nightAdjustment;
      }

      // Heavy luggage addition if requested
      if (input.hasLuggage && rule.luggageCharge) {
        calculatedBase += rule.luggageCharge;
      }

      // Blend with community reported data if matching mode
      const matchingReports = communityReports.filter(
        (r) => r.transportModeId === rule.transportModeId
      );
      let communityAvg: number | null = null;
      if (matchingReports.length > 0) {
        const sumRates = matchingReports.reduce((acc, r) => acc + r.actualFarePaid / r.distanceKm, 0);
        const avgPerKmCommunity = sumRates / matchingReports.length;
        communityAvg = Math.round(avgPerKmCommunity * distanceKm);
      }

      let finalAvg = Math.round(calculatedBase);
      if (communityAvg && matchingReports.length >= 2) {
        // Weighted blend: 70% official model, 30% community reported actuals
        finalAvg = Math.round(finalAvg * 0.7 + communityAvg * 0.3);
      }

      // Compute Fair Range (Min/Max bound)
      let minFare = Math.round(finalAvg * 0.9);
      let maxFare = Math.round(finalAvg * 1.15);

      // Metres must not drop below base drop
      minFare = Math.max(minFare, Math.round(baseFare));
      maxFare = Math.max(maxFare, minFare + 10);

      // Compute Estimated Duration (adjusted for vehicle class and terrain)
      let avgSpeedKmh = 26; // City average
      if (mode.id === 'METRO') avgSpeedKmh = 42;
      else if (mode.id === 'GOVT_BUS' || mode.id === 'LOCAL_BUS') avgSpeedKmh = 19;
      else if (mode.id === 'AUTO' || mode.id === 'E_RICKSHAW') avgSpeedKmh = 22;
      else if (mode.id === 'PRIVATE_CAB') avgSpeedKmh = 32;

      if (isMountain) {
        avgSpeedKmh = Math.max(16, avgSpeedKmh * 0.65); // Mountain hairpins slow traffic
      }

      const estimatedDurationMin = Math.max(5, Math.round((distanceKm / avgSpeedKmh) * 60));

      return {
        transportModeId: rule.transportModeId,
        displayName: mode.displayName,
        vehicleType: mode.vehicleType,
        isMetered: mode.isMetered,
        minFare,
        avgFare: finalAvg,
        maxFare,
        estimatedDurationMin,
        perKmRate: perKm,
        baseFare,
        baseDistanceKm: baseDistance,
        nightSurchargeApplied: isNightTime && rule.nightSurchargePct > 0,
        nightSurchargePct: rule.nightSurchargePct,
        hillTerrainSurchargeApplied: hillSurchargePct > 0,
        hillTerrainSurchargePct: hillSurchargePct,
        sourceType: rule.sourceType,
        officialCircularRef: rule.officialCircularRef,
        reliabilityScore: rule.reliabilityScore,
        notes: rule.notes,
        communityReportCount: matchingReports.length,
        communityAvgPaid: communityAvg,
      };
    });

    // Sort by affordability: Bus/Metro first, then Auto, Shared Taxi, Local Taxi, Private Cab
    options.sort((a, b) => a.avgFare - b.avgFare);

    return {
      city: {
        id: city.id,
        name: city.name,
        state: city.state,
        tier: city.tier,
      },
      tripDetails: {
        origin: input.origin?.trim() || `${city.name} Central`,
        destination: input.destination?.trim() || `${city.name} Tourist Hub`,
        distanceKm,
        travelHour: currentHour,
        isNightTime,
        isMountainTerrain: isMountain,
      },
      options,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Audit driver quoted fare for potential overcharging
   */
  public async auditOvercharge(params: {
    cityId?: string;
    cityName?: string;
    transportModeId: string;
    quotedFare: number;
    distanceKm?: number;
    origin?: string;
    destination?: string;
    travelHour?: number;
  }): Promise<OverchargeAuditResult> {
    return this.detectOvercharging(params);
  }

  public async detectOvercharging(params: {
    cityId?: string;
    cityName?: string;
    transportModeId: string;
    quotedFare: number;
    distanceKm?: number;
    origin?: string;
    destination?: string;
    travelHour?: number;
  }): Promise<OverchargeAuditResult> {
    const estimates = await this.estimateFares({
      cityId: params.cityId,
      cityName: params.cityName,
      origin: params.origin,
      destination: params.destination,
      distanceKm: params.distanceKm,
      travelHour: params.travelHour,
    });

    const targetOption =
      estimates.options.find((o) => o.transportModeId === params.transportModeId) ||
      estimates.options[0];

    const { minFare, avgFare, maxFare } = targetOption;
    const quoted = params.quotedFare;

    let verdict: OverchargeAuditResult['verdict'] = 'FAIR';
    let isOvercharge = false;
    let differenceAmount = quoted - avgFare;
    let differencePercentage = Math.round(((quoted - avgFare) / avgFare) * 100);

    let warningMessage = '';
    let recommendedAction = '';

    if (quoted <= maxFare) {
      verdict = 'FAIR';
      isOvercharge = false;
      warningMessage = `The quoted fare of ₹${quoted} is well within the official/estimated tariff range (₹${minFare} – ₹${maxFare}).`;
      recommendedAction = 'Safe to accept. You can proceed with this ride.';
    } else if (quoted <= maxFare * 1.25) {
      verdict = 'SLIGHTLY_ELEVATED';
      isOvercharge = false;
      warningMessage = `Quoted fare is slightly higher (~${differencePercentage}%) than standard fair range (₹${minFare} – ₹${maxFare}). May be due to peak hour or rain.`;
      recommendedAction = `Try negotiating down towards ₹${avgFare}–₹${maxFare}, or ask for the official meter.`;
    } else if (quoted <= maxFare * 1.7) {
      verdict = 'POTENTIAL_OVERCHARGE';
      isOvercharge = true;
      warningMessage = `⚠️ Caution: Quoted fare (₹${quoted}) is significantly higher (~${differencePercentage}%) than the estimated standard range of ₹${minFare} – ₹${maxFare}.`;
      recommendedAction = `Insist on the meter or check the nearest authorized prepaid taxi/auto booth. You can also compare with app-based cabs.`;
    } else {
      verdict = 'SEVERE_OVERCHARGE';
      isOvercharge = true;
      warningMessage = `🚨 High Overcharge Alert! The driver's quote of ₹${quoted} is more than ${differencePercentage}% above the verified local estimate (₹${minFare} – ₹${maxFare}).`;
      recommendedAction = `Do NOT accept this fare. Walk to the authorized prepaid counter, book via official transit, or report this quote to tourist police.`;
    }

    return {
      verdict,
      isOvercharge,
      quotedFare: quoted,
      expectedFare: {
        min: minFare,
        avg: avgFare,
        max: maxFare,
      },
      differenceAmount: Math.max(0, differenceAmount),
      differencePercentage,
      transportMode: targetOption.displayName,
      confidenceScore: targetOption.reliabilityScore,
      warningMessage,
      recommendedAction,
      officialReference: targetOption.officialCircularRef,
      disclaimer:
        'This assessment is based on official government fare rules, regional union tariffs, and community benchmarks. Actual fares may fluctuate due to extreme weather, night surges, or route detours.',
    };
  }

  /**
   * Submit community reported fare with robust relational resolution
   */
  public async submitCommunityFareReport(data: {
    cityId: string;
    transportModeId: string;
    userId?: string;
    originName: string;
    destinationName: string;
    distanceKm: number;
    actualFarePaid: number;
    quotedFare?: number;
    wasOvercharged?: boolean;
    comments?: string;
  }) {
    // 1. Resolve City (by ID or by name to prevent stale ID FK violations)
    let targetCity = await prisma.city.findUnique({ where: { id: data.cityId } });
    if (!targetCity) {
      targetCity = await prisma.city.findFirst({
        where: { name: { equals: data.cityId, mode: 'insensitive' } },
      });
    }
    if (!targetCity) {
      targetCity = await prisma.city.findFirst();
    }
    if (!targetCity) {
      throw new Error(`Invalid city identifier: ${data.cityId}`);
    }

    // 2. Resolve Transport Mode
    let validModeId = data.transportModeId;
    const modeExists = await prisma.transportationMode.findUnique({ where: { id: data.transportModeId } });
    if (!modeExists) {
      const fallbackMode = await prisma.transportationMode.findFirst();
      if (fallbackMode) {
        validModeId = fallbackMode.id;
      }
    }

    // 3. Resolve User ID safely (prevent FK constraint violation from stale/expired JWT tokens)
    let validUserId: string | null = null;
    if (data.userId) {
      const userExists = await prisma.user.findUnique({ where: { id: data.userId } });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    return prisma.fareReport.create({
      data: {
        cityId: targetCity.id,
        transportModeId: validModeId,
        userId: validUserId,
        originName: data.originName,
        destinationName: data.destinationName,
        distanceKm: data.distanceKm,
        actualFarePaid: data.actualFarePaid,
        quotedFare: data.quotedFare || null,
        wasOvercharged: Boolean(data.wasOvercharged),
        verificationStatus: 'COMMUNITY_VERIFIED',
        reliabilityWeight: 80,
        comments: data.comments || null,
      },
      include: {
        city: true,
        transportMode: true,
      },
    });
  }

  /**
   * Fetch official city fare sheet
   */
  public async getCityFareRules(cityId: string) {
    return prisma.cityFareRule.findMany({
      where: { cityId },
      include: {
        transportMode: true,
      },
      orderBy: {
        baseFare: 'asc',
      },
    });
  }
}

export const fareEstimationService = new FareEstimationService();
