import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateDistanceKm } from '../services/geoService.js';

export const ROAD_CROWD_CATEGORIES = [
  'ROAD_CONDITION',
  'TRAFFIC',
  'CROWD',
  'ROAD_CLOSURE',
  'CONSTRUCTION',
  'ACCIDENT',
] as const;

export const ROAD_DIFFICULTIES = ['EASY', 'MODERATE', 'DIFFICULT', 'BLOCKED'] as const;

export async function getRoadCrowdReports(req: Request, res: Response) {
  try {
    const { cityId, category, difficulty, includeExpired, lat, lng } = req.query;
    const now = new Date();

    const where: any = {
      status: { not: 'REJECTED' },
    };

    if (includeExpired !== 'true') {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    }
    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId as string;
    }
    if (category && category !== 'ALL') {
      where.category = category as string;
    }
    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty as string;
    }

    const [reportsRaw, crowdLevelsRaw, cityServices, roadRisksRaw] = await Promise.all([
      prisma.roadCrowdReport.findMany({
        where,
        include: {
          city: { select: { id: true, name: true, state: true, lat: true, lng: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
      prisma.crowdLevel.findMany({
        where: cityId && cityId !== 'ALL' ? { cityId: cityId as string } : undefined,
        include: { city: { select: { id: true, name: true, state: true, lat: true, lng: true } } },
        take: 30,
      }),
      prisma.locationService.findMany({
        where: {
          ...(cityId && cityId !== 'ALL' ? { cityId: cityId as string } : {}),
          category: { in: ['TOURIST_INFO', 'TRANSPORT', 'SHOPPING'] },
        },
        select: { id: true, cityId: true, name: true, lat: true, lng: true },
        take: 80,
      }),
      prisma.travelRiskAlert.findMany({
        where: {
          verificationStatus: { not: 'REJECTED' },
          category: {
            in: ['ROAD_CLOSURE', 'ACCIDENT', 'OVERCROWDING', 'LANDSLIDE', 'FLOOD', 'HEAVY_RAINFALL', 'SNOWFALL'],
          },
          ...(cityId && cityId !== 'ALL' ? { cityId: cityId as string } : {}),
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: {
          city: { select: { id: true, name: true, state: true, lat: true, lng: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const userLat = lat ? parseFloat(lat as string) : null;
    const userLng = lng ? parseFloat(lng as string) : null;
    const hasUserCoords =
      userLat !== null && userLng !== null && !Number.isNaN(userLat) && !Number.isNaN(userLng);

    const reports = reportsRaw.map((r) => ({
      ...r,
      distanceKm: hasUserCoords
        ? parseFloat(calculateDistanceKm(userLat!, userLng!, r.lat, r.lng).toFixed(2))
        : null,
    }));

    const crowdLevels = crowdLevelsRaw.map((cl, idx) => {
      const normalized = cl.attractionName.toLowerCase();
      const matchedPoi = cityServices.find(
        (s) =>
          s.cityId === cl.cityId &&
          (normalized.includes(s.name.toLowerCase().slice(0, 8)) ||
            s.name.toLowerCase().includes(normalized.split('(')[0].trim().slice(0, 8)))
      );
      // Small deterministic visual jitter only when falling back to shared city center coordinates
      const angle = ((idx * 137.5) % 360) * (Math.PI / 180);
      const offsetDeg = 0.008 + (idx % 3) * 0.003;
      const resolvedLat =
        matchedPoi?.lat ??
        (cl.city?.lat !== undefined ? cl.city.lat + Math.sin(angle) * offsetDeg : undefined);
      const resolvedLng =
        matchedPoi?.lng ??
        (cl.city?.lng !== undefined ? cl.city.lng + Math.cos(angle) * offsetDeg : undefined);

      return {
        ...cl,
        lat: resolvedLat,
        lng: resolvedLng,
        distanceKm:
          hasUserCoords && resolvedLat !== undefined && resolvedLng !== undefined
            ? parseFloat(calculateDistanceKm(userLat!, userLng!, resolvedLat, resolvedLng).toFixed(2))
            : null,
      };
    });

    const riskAdvisories = roadRisksRaw
      .map((a) => {
        const resolvedLat = a.lat ?? a.city?.lat ?? null;
        const resolvedLng = a.lng ?? a.city?.lng ?? null;
        return {
          ...a,
          lat: resolvedLat,
          lng: resolvedLng,
          distanceKm:
            hasUserCoords && resolvedLat !== null && resolvedLng !== null
              ? parseFloat(calculateDistanceKm(userLat!, userLng!, resolvedLat, resolvedLng).toFixed(2))
              : null,
        };
      })
      .filter((a) => a.lat !== null && a.lng !== null);

    return res.json({ reports, crowdLevels, riskAdvisories });
  } catch (error) {
    console.error('Get road/crowd error:', error);
    return res.status(500).json({ error: 'Failed to load crowd and road intelligence' });
  }
}

export async function createRoadCrowdReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to submit road or crowd update' });
    }

    const {
      cityId,
      locationName,
      lat,
      lng,
      category = 'TRAFFIC',
      difficulty = 'MODERATE',
      description,
      expiresInHours = 24,
    } = req.body;

    if (!locationName?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Location name and description are required' });
    }
    if (!ROAD_CROWD_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid road/crowd category' });
    }
    if (!ROAD_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    let resolvedCityId: string | null = cityId || null;
    let resolvedLat = lat !== undefined ? parseFloat(lat) : 28.6139;
    let resolvedLng = lng !== undefined ? parseFloat(lng) : 77.209;

    if (resolvedCityId) {
      const city = await prisma.city.findUnique({ where: { id: resolvedCityId } });
      if (city && lat === undefined) {
        resolvedLat = city.lat;
        resolvedLng = city.lng;
      }
    }

    const hours = Math.max(1, Math.min(168, parseInt(expiresInHours, 10) || 24));
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);

    const report = await prisma.roadCrowdReport.create({
      data: {
        userId: req.user.id,
        cityId: resolvedCityId,
        locationName: locationName.trim(),
        lat: Number.isNaN(resolvedLat) ? 28.6139 : resolvedLat,
        lng: Number.isNaN(resolvedLng) ? 77.209 : resolvedLng,
        category,
        difficulty,
        description: description.trim().slice(0, 600),
        status: isPrivileged ? 'VERIFIED' : 'PENDING',
        expiresAt,
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      message: isPrivileged
        ? 'Verified road & crowd update published.'
        : 'Road & crowd update submitted for moderator verification.',
      report,
    });
  } catch (error) {
    console.error('Create road/crowd error:', error);
    return res.status(500).json({ error: 'Failed to submit road/crowd report' });
  }
}

export async function verifyRoadCrowdReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Moderator or Admin role required' });
    }

    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const existing = await prisma.roadCrowdReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Road/crowd report not found' });
    }

    const updated = await prisma.roadCrowdReport.update({
      where: { id },
      data: { status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED' },
    });

    return res.json({ message: `Report marked ${updated.status}`, report: updated });
  } catch (error) {
    console.error('Verify road/crowd error:', error);
    return res.status(500).json({ error: 'Failed to verify road/crowd report' });
  }
}

export async function deleteRoadCrowdReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.roadCrowdReport.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (existing.userId !== req.user.id && !isPrivileged) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.roadCrowdReport.delete({ where: { id } });
    return res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Delete road/crowd error:', error);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
}
