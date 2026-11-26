import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateDistanceKm } from '../services/geoService.js';

export const RISK_ALERT_CATEGORIES = [
  'HEAVY_RAINFALL',
  'FLOOD',
  'LANDSLIDE',
  'SNOWFALL',
  'ROAD_CLOSURE',
  'ACCIDENT',
  'OVERCROWDING',
  'UNSAFE_AREA',
  'SCAM_WARNING',
] as const;

export const RISK_ALERT_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;

/**
 * List active Travel Risk Alerts (separates OFFICIAL / MODERATOR_VERIFIED vs COMMUNITY)
 * Auto-filters expired alerts unless includeExpired=true.
 */
export async function getRiskAlerts(req: Request, res: Response) {
  try {
    const {
      cityId,
      category,
      severity,
      sourceType,
      tab, // 'ALL' | 'OFFICIAL' | 'COMMUNITY'
      search,
      lat,
      lng,
      radiusKm,
      includeExpired,
    } = req.query;

    const now = new Date();
    const where: any = {
      verificationStatus: { not: 'REJECTED' },
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

    if (severity && severity !== 'ALL') {
      where.severity = severity as string;
    }

    if (tab === 'OFFICIAL') {
      where.sourceType = { in: ['OFFICIAL', 'MODERATOR_VERIFIED'] };
    } else if (tab === 'COMMUNITY') {
      where.sourceType = 'COMMUNITY';
    } else if (sourceType && sourceType !== 'ALL') {
      where.sourceType = sourceType as string;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { destinationName: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const alertsRaw = await prisma.travelRiskAlert.findMany({
      where,
      include: {
        city: { select: { id: true, name: true, state: true, lat: true, lng: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 60,
    });

    const userLat = lat ? parseFloat(lat as string) : null;
    const userLng = lng ? parseFloat(lng as string) : null;
    const maxDist = radiusKm ? parseFloat(radiusKm as string) : null;

    let alerts = alertsRaw.map((a) => {
      const targetLat = a.lat ?? a.city?.lat ?? null;
      const targetLng = a.lng ?? a.city?.lng ?? null;
      const distanceKm =
        userLat !== null && userLng !== null && targetLat !== null && targetLng !== null
          ? parseFloat(calculateDistanceKm(userLat, userLng, targetLat, targetLng).toFixed(2))
          : null;
      return {
        ...a,
        distanceKm,
        isOfficial: a.sourceType === 'OFFICIAL' || a.sourceType === 'MODERATOR_VERIFIED',
      };
    });

    if (maxDist !== null && !Number.isNaN(maxDist) && userLat !== null && userLng !== null) {
      alerts = alerts.filter((a) => a.distanceKm === null || a.distanceKm <= maxDist);
    }

    const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
    alerts.sort((a, b) => {
      const diff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const officialCount = alerts.filter((a) => a.isOfficial).length;
    const communityCount = alerts.filter((a) => !a.isOfficial).length;

    return res.json({
      alerts,
      total: alerts.length,
      officialCount,
      communityCount,
    });
  } catch (error) {
    console.error('Get risk alerts error:', error);
    return res.status(500).json({ error: 'Failed to load travel risk alerts' });
  }
}

/**
 * Create a Travel Risk Alert.
 * Travelers create COMMUNITY (PENDING) alerts; Moderators/Admins can publish OFFICIAL or MODERATOR_VERIFIED alerts.
 */
export async function createRiskAlert(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to submit risk alert' });
    }

    const {
      cityId,
      destinationName,
      lat,
      lng,
      category,
      title,
      description,
      severity = 'MODERATE',
      sourceType,
      sourceName,
      expiresInHours,
      expiresAt,
    } = req.body;

    if (!title?.trim() || !description?.trim() || !destinationName?.trim()) {
      return res.status(400).json({ error: 'Destination, title, and description are required' });
    }

    if (!category || !RISK_ALERT_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid risk alert category' });
    }

    if (!RISK_ALERT_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity level' });
    }

    const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
    const resolvedSourceType =
      isPrivileged && (sourceType === 'OFFICIAL' || sourceType === 'MODERATOR_VERIFIED')
        ? sourceType
        : 'COMMUNITY';
    const verificationStatus = isPrivileged ? 'VERIFIED' : 'PENDING';
    const resolvedSourceName =
      isPrivileged && sourceName?.trim()
        ? sourceName.trim()
        : isPrivileged
        ? 'YatraGuard Safety Desk'
        : `Traveler Report (${req.user.name || 'Community'})`;

    let resolvedCityId: string | null = cityId || null;
    if (!resolvedCityId && destinationName) {
      const matchedCity = await prisma.city.findFirst({
        where: { name: { equals: destinationName.trim(), mode: 'insensitive' } },
      });
      if (matchedCity) resolvedCityId = matchedCity.id;
    }

    let expiryDate: Date | null = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (!Number.isNaN(d.getTime())) expiryDate = d;
    } else {
      const hours = expiresInHours ? Math.max(1, Math.min(720, parseInt(expiresInHours, 10))) : 48;
      expiryDate = new Date(Date.now() + hours * 3600 * 1000);
    }

    const alert = await prisma.travelRiskAlert.create({
      data: {
        cityId: resolvedCityId,
        destinationName: destinationName.trim(),
        lat: lat !== undefined && lat !== null ? parseFloat(lat) : null,
        lng: lng !== undefined && lng !== null ? parseFloat(lng) : null,
        category,
        title: title.trim(),
        description: description.trim(),
        severity,
        sourceType: resolvedSourceType,
        sourceName: resolvedSourceName,
        verificationStatus,
        expiresAt: expiryDate,
        createdById: req.user.id,
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
      },
    });

    return res.status(201).json({
      message: isPrivileged
        ? 'Official safety risk alert published.'
        : 'Risk alert submitted for moderator verification.',
      alert,
    });
  } catch (error) {
    console.error('Create risk alert error:', error);
    return res.status(500).json({ error: 'Failed to create risk alert' });
  }
}

/**
 * Moderator/Admin verification action for Travel Risk Alerts
 */
export async function verifyRiskAlert(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Moderator or Admin role required' });
    }

    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const existing = await prisma.travelRiskAlert.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Risk alert not found' });
    }

    const updated = await prisma.travelRiskAlert.update({
      where: { id },
      data: {
        verificationStatus: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
        ...(action === 'APPROVE' &&
          existing.sourceType === 'COMMUNITY' && { sourceType: 'MODERATOR_VERIFIED' }),
      },
    });

    return res.json({
      message: action === 'APPROVE' ? 'Risk alert verified and elevated.' : 'Risk alert rejected.',
      alert: updated,
    });
  } catch (error) {
    console.error('Verify risk alert error:', error);
    return res.status(500).json({ error: 'Failed to verify risk alert' });
  }
}

/**
 * Delete a Travel Risk Alert (owner or Moderator/Admin)
 */
export async function deleteRiskAlert(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.travelRiskAlert.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Risk alert not found' });
    }

    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (!isPrivileged && existing.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to remove this risk alert' });
    }

    await prisma.travelRiskAlert.delete({ where: { id } });
    return res.json({ message: 'Risk alert removed' });
  } catch (error) {
    console.error('Delete risk alert error:', error);
    return res.status(500).json({ error: 'Failed to delete risk alert' });
  }
}
