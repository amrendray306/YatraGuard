import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateDistanceKm } from '../services/geoService.js';
import { getCityWeather } from '../services/weatherService.js';

// ─── Smart Trip Itinerary Generator (Grounded in DB Telemetry) ────────────────
export async function generateSmartItinerary(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      originCity = '',
      destinationCity,
      startDate,
      endDate,
      travelersCount = 1,
      totalBudget,
      transportPref = 'MIXED',
      interests = [],
    } = req.body;

    if (!destinationCity || typeof destinationCity !== 'string' || !destinationCity.trim()) {
      return res.status(400).json({ error: 'Destination city is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 2 * 86400000);
    const diffMs = Math.max(86400000, end.getTime() - start.getTime() + 86400000);
    const daysCount = Math.min(10, Math.max(1, Math.round(diffMs / 86400000)));
    const travelers = Math.max(1, Math.min(20, Number(travelersCount) || 1));

    const destClean = destinationCity.trim();
    const destCity = await prisma.city.findFirst({
      where: {
        OR: [
          { name: { equals: destClean, mode: 'insensitive' } },
          { name: { contains: destClean, mode: 'insensitive' } },
        ],
      },
      include: {
        services: true,
        weatherAlerts: { orderBy: { updatedAt: 'desc' }, take: 1 },
        incidents: {
          where: { status: { in: ['VERIFIED', 'ADMIN_VERIFIED', 'UNDER_REVIEW'] } },
          orderBy: { reportedAt: 'desc' },
          take: 5,
        },
        scams: { take: 4 },
        priceRecords: { where: { verificationStatus: { not: 'REJECTED' } }, take: 12 },
        fareRules: { include: { transportMode: true } },
      },
    });

    const originClean = typeof originCity === 'string' ? originCity.trim() : '';
    const originCityRec = originClean
      ? await prisma.city.findFirst({
          where: {
            OR: [
              { name: { equals: originClean, mode: 'insensitive' } },
              { name: { contains: originClean, mode: 'insensitive' } },
            ],
          },
        })
      : null;

    let journeyDistanceKm: number | null = null;
    let estimatedJourneyDuration: string | null = null;
    if (originCityRec && destCity && originCityRec.id !== destCity.id) {
      journeyDistanceKm = Math.round(
        calculateDistanceKm(originCityRec.lat, originCityRec.lng, destCity.lat, destCity.lng) * 1.25
      );
      const avgSpeedKmh = transportPref === 'PUBLIC_TRANSIT' ? 42 : 52;
      const hrs = Math.max(0.5, journeyDistanceKm / avgSpeedKmh);
      estimatedJourneyDuration =
        hrs >= 1
          ? `~${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m estimated road/rail travel (${journeyDistanceKm} km est.)`
          : `~${Math.round(hrs * 60)} mins (${journeyDistanceKm} km est.)`;
    }

    // Extract DB attractions / restaurants / transport / hospitals / pharmacies
    const hospitals = (destCity?.services || [])
      .filter((s) => s.category === 'HOSPITAL')
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, address: s.address, phone: s.phone, openStatus: s.openStatus }));

    const pharmacies = (destCity?.services || [])
      .filter((s) => s.category === 'PHARMACY')
      .slice(0, 3)
      .map((s) => ({ id: s.id, name: s.name, address: s.address, phone: s.phone, openStatus: s.openStatus }));

    const police = (destCity?.services || [])
      .filter((s) => s.category === 'POLICE')
      .slice(0, 2)
      .map((s) => ({ id: s.id, name: s.name, address: s.address, phone: s.phone }));

    const attractions = (destCity?.services || []).filter(
      (s) => s.category === 'TOURIST_INFO' || s.category === 'RESTAURANT' || s.category === 'HOTEL'
    );

    // Build budget estimates truthfully marked as approximate
    const numericBudget = totalBudget ? Math.max(500, Number(totalBudget)) : daysCount * travelers * 2500;
    const perDayBudget = Math.round(numericBudget / daysCount);
    const estimatedExpenses = {
      isEstimated: true,
      totalBudget: numericBudget,
      perDayBudget,
      breakdown: {
        transportation: Math.round(numericBudget * 0.3),
        food: Math.round(numericBudget * 0.28),
        accommodation: Math.round(numericBudget * 0.27),
        activitiesAndBuffer: Math.max(
          0,
          numericBudget -
            Math.round(numericBudget * 0.3) -
            Math.round(numericBudget * 0.28) -
            Math.round(numericBudget * 0.27)
        ),
      },
      note: 'All budget figures are approximate planning estimates based on local benchmarks—verify live booking and transport fares before paying.',
    };

    const interestList = Array.isArray(interests)
      ? interests
      : typeof interests === 'string'
      ? interests.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const transportTips = (destCity?.fareRules || []).slice(0, 3).map((r) => ({
      mode: r.transportMode.displayName,
      rateSummary: `Base ₹${r.baseFare} (${r.baseDistanceKm} km), then ₹${r.perKmRate}/km`,
      sourceType: r.sourceType,
    }));

    const dayThemes = [
      'Arrival, Orientation & Safe Local Exploration',
      'Heritage, Landmarks & Local Markets',
      'Nature, Scenic Routes & Cultural Highlights',
      'Relaxed Exploration & Return Preparation',
    ];

    const scamNote =
      destCity?.scams?.[0]?.warningSigns ||
      'Verify fares at official prepaid booths or metered apps before boarding.';

    const days = Array.from({ length: daysCount }).map((_, idx) => {
      const dateObj = new Date(start.getTime() + idx * 86400000);
      const dateStr = dateObj.toISOString().split('T')[0];
      const spotA = attractions[idx * 2 % Math.max(1, attractions.length)];
      const spotB = attractions[(idx * 2 + 1) % Math.max(1, attractions.length)];

      const stops = [
        {
          id: `day-${idx + 1}-1`,
          time: '09:30 AM',
          activity: spotA
            ? `${spotA.name} (${spotA.category.replace('_', ' ')})`
            : idx === 0 && originClean
            ? `Transit from ${originClean} to ${destClean} & Check-in`
            : `${destClean} Morning Sightseeing`,
          location: spotA?.address || `${destClean} Central Sector`,
          transportMode: transportPref === 'PUBLIC_TRANSIT' ? 'Public Bus / Metro / Shared Auto' : 'Prepaid Auto / Verified Cab',
          estimatedCost: Math.round(perDayBudget * 0.35),
          safetyTip: idx === 0 ? scamNote : 'Stick to populated main avenues and keep digital copies in Emergency Vault.',
        },
        {
          id: `day-${idx + 1}-2`,
          time: '02:30 PM',
          activity: spotB
            ? `${spotB.name}`
            : interestList.length > 0
            ? `${interestList[idx % interestList.length]} Exploration in ${destClean}`
            : `Local Market & Cultural Walk in ${destClean}`,
          location: spotB?.address || `${destClean} Market Quarter`,
          transportMode: 'Walk / Short Metered Auto',
          estimatedCost: Math.round(perDayBudget * 0.35),
          safetyTip: 'Confirm item and dining prices upfront; decline unsolicited street guides.',
        },
        {
          id: `day-${idx + 1}-3`,
          time: '06:30 PM',
          activity: `Evening Dining & Safe Return to Stay`,
          location: `${destClean} Lit Commercial Hub`,
          transportMode: 'Tracked App Cab / Verified Prepaid',
          estimatedCost: Math.round(perDayBudget * 0.3),
          safetyTip: 'Share live trip link with a trusted contact if returning after dark.',
        },
      ];

      return {
        dayNumber: idx + 1,
        date: dateStr,
        title: `Day ${idx + 1}: ${dayThemes[idx % dayThemes.length]}`,
        stops,
      };
    });

    const liveWeather = await getCityWeather(destCity?.id, destCity?.name || destClean).catch(() => null);
    const weather = liveWeather
      ? {
          temp: liveWeather.temp,
          condition: liveWeather.condition,
          rainChance: liveWeather.rainChance,
          windKmh: liveWeather.windKmh,
          alertMessage: liveWeather.alertMessage,
          severity: liveWeather.severity,
          updatedAt: liveWeather.updatedAt,
          source: liveWeather.sourceName,
        }
      : null;

    const nowDate = new Date();
    const activeRiskAlerts = await prisma.travelRiskAlert
      .findMany({
        where: {
          verificationStatus: { not: 'REJECTED' },
          OR: [{ expiresAt: null }, { expiresAt: { gt: nowDate } }],
          ...(destCity?.id
            ? { cityId: destCity.id }
            : { destinationName: { contains: destClean, mode: 'insensitive' } }),
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
      .catch(() => []);

    const safetyAlerts = [
      ...activeRiskAlerts.map((r) => ({
        id: r.id,
        title: `${r.severity}: ${r.title}`,
        category: r.category,
        status: r.sourceType,
        reportedAt: r.createdAt,
      })),
      ...(destCity?.incidents || []).map((inc) => ({
        id: inc.id,
        title: inc.title,
        category: inc.category,
        status: inc.status,
        reportedAt: inc.reportedAt,
      })),
    ];

    return res.json({
      plan: {
        title: originClean
          ? `${originClean} → ${destCity?.name || destClean} (${daysCount} Days)`
          : `${destCity?.name || destClean} ${daysCount}-Day Safe Trip`,
        originCity: originClean || null,
        destinationCity: destCity?.name || destClean,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        daysCount,
        travelersCount: travelers,
        transportPref,
        interests: interestList,
        safetyScore: destCity?.defaultSafetyScore ?? null,
        estimatedJourneyDuration,
        estimatedExpenses,
        transportRecommendations: transportTips,
        nearbyMedical: { hospitals, pharmacies, police },
        weather,
        safetyAlerts,
        days,
      },
    });
  } catch (error) {
    console.error('Generate smart itinerary error:', error);
    return res.status(500).json({ error: 'Failed to generate trip plan' });
  }
}

// ─── Trip Management & Live Sharing ───────────────────────────────────────────
export async function createTrip(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      title,
      originCity,
      destinationCity,
      currentLocation,
      startDate,
      endDate,
      travelersCount,
      totalBudget,
      transportPref,
      interests,
      itineraryData,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    if (!title || !destinationCity) {
      return res.status(400).json({ error: 'Title and destination city are required' });
    }

    // Fallback to user's saved profile emergency contact if omitted during quick trip planning
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emergencyContactName: true, emergencyContactPhone: true },
    });

    const iceName = emergencyContactName?.trim() || dbUser?.emergencyContactName || 'Not Configured';
    const icePhone = emergencyContactPhone?.trim() || dbUser?.emergencyContactPhone || '112';

    const trip = await prisma.trip.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        originCity: originCity?.trim() || null,
        destinationCity: destinationCity.trim(),
        currentLocation: currentLocation?.trim() || `${destinationCity.trim()} Center`,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        travelersCount: Math.max(1, Number(travelersCount) || 1),
        totalBudget: totalBudget !== undefined && totalBudget !== null && totalBudget !== '' ? Number(totalBudget) : null,
        transportPref: transportPref || null,
        interests: Array.isArray(interests) ? interests.join(', ') : interests || null,
        itineraryData: itineraryData ?? undefined,
        emergencyContactName: iceName,
        emergencyContactPhone: icePhone,
        status: 'ACTIVE',
        lastKnownEta: 'Planned itinerary',
      },
    });

    return res.status(201).json({
      message: 'Trip saved successfully',
      trip,
      shareUrl: `/trips/share/${trip.shareToken}`,
    });
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ error: 'Failed to create trip' });
  }
}

export async function updateTrip(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this trip' });
    }

    const {
      title,
      originCity,
      destinationCity,
      currentLocation,
      startDate,
      endDate,
      travelersCount,
      totalBudget,
      transportPref,
      interests,
      itineraryData,
      emergencyContactName,
      emergencyContactPhone,
      status,
    } = req.body;

    const updated = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(originCity !== undefined && { originCity: originCity ? String(originCity).trim() : null }),
        ...(destinationCity !== undefined && { destinationCity: String(destinationCity).trim() }),
        ...(currentLocation !== undefined && { currentLocation: currentLocation ? String(currentLocation).trim() : null }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(travelersCount !== undefined && { travelersCount: Math.max(1, Number(travelersCount) || 1) }),
        ...(totalBudget !== undefined && {
          totalBudget: totalBudget === null || totalBudget === '' ? null : Number(totalBudget),
        }),
        ...(transportPref !== undefined && { transportPref }),
        ...(interests !== undefined && {
          interests: Array.isArray(interests) ? interests.join(', ') : interests,
        }),
        ...(itineraryData !== undefined && { itineraryData }),
        ...(emergencyContactName !== undefined && { emergencyContactName }),
        ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
        ...(status !== undefined && ['ACTIVE', 'COMPLETED'].includes(status) && { status }),
      },
    });

    return res.json({ message: 'Trip updated', trip: updated });
  } catch (error) {
    console.error('Update trip error:', error);
    return res.status(500).json({ error: 'Failed to update trip' });
  }
}

export async function deleteTrip(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this trip' });
    }

    await prisma.trip.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ error: 'Failed to delete trip' });
  }
}

export async function getUserTrips(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const trips = await prisma.trip.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trips' });
  }
}

export async function getSharedTrip(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { shareToken: token },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Shared trip not found or link has expired' });
    }

    return res.json({
      travelerName: trip.user.name,
      title: trip.title,
      originCity: trip.originCity,
      destinationCity: trip.destinationCity,
      currentLocation: trip.currentLocation,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
      lastKnownEta: trip.lastKnownEta,
      itineraryData: trip.itineraryData,
      emergencyContactName: trip.emergencyContactName,
      lastUpdated: trip.updatedAt,
    });
  } catch (error) {
    console.error('Get shared trip error:', error);
    return res.status(500).json({ error: 'Failed to fetch shared trip details' });
  }
}

// Private Emergency Vault (Encrypted / Reference-only sensitive data storage)
export async function getVaultItems(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const items = await prisma.vaultItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(items);
  } catch (error) {
    console.error('Get vault items error:', error);
    return res.status(500).json({ error: 'Failed to retrieve emergency vault items' });
  }
}

export async function createVaultItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, category, referenceData, notes } = req.body;

    if (!title || !category || !referenceData) {
      return res.status(400).json({ error: 'Title, category, and reference data are required' });
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: req.user.id,
        title,
        category,
        referenceData,
        notes: notes || null,
      },
    });

    return res.status(201).json({
      message: 'Vault reference securely saved',
      item,
    });
  } catch (error) {
    console.error('Create vault item error:', error);
    return res.status(500).json({ error: 'Failed to store emergency vault item' });
  }
}

export async function deleteVaultItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const existing = await prisma.vaultItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    await prisma.vaultItem.delete({ where: { id } });
    return res.json({ message: 'Item deleted from emergency vault' });
  } catch (error) {
    console.error('Delete vault item error:', error);
    return res.status(500).json({ error: 'Failed to delete vault item' });
  }
}
