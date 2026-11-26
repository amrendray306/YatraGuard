import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Get Nearby Active Safety Alerts within user radius
 */
export async function getNearbySafetyAlerts(req: AuthenticatedRequest, res: Response) {
  try {
    const { lat, lng, cityId, radiusKm = '5.0' } = req.query;

    const userLat = lat ? parseFloat(lat as string) : null;
    const userLng = lng ? parseFloat(lng as string) : null;
    const maxRadius = parseFloat(radiusKm as string);

    const where: any = {
      status: { in: ['VERIFIED', 'ADMIN_VERIFIED', 'UNDER_REVIEW', 'PENDING'] },
    };

    if (cityId) {
      where.cityId = cityId as string;
    }

    const incidents = await prisma.incidentReport.findMany({
      where,
      include: { city: true },
      orderBy: { reportedAt: 'desc' },
      take: 30,
    });

    let nearbyAlerts: any[] = [];

    if (userLat !== null && userLng !== null) {
      nearbyAlerts = incidents
        .map((inc) => {
          const dist = calculateHaversineDistanceKm(userLat, userLng, inc.lat, inc.lng);
          return {
            id: inc.id,
            category: inc.category,
            title: inc.title,
            description: inc.description,
            distanceKm: dist,
            address: inc.address,
            cityName: inc.city?.name,
            status: inc.status,
            reportedAt: inc.reportedAt,
            isHighPriority:
              inc.status === 'VERIFIED' ||
              inc.status === 'ADMIN_VERIFIED' ||
              inc.category.includes('theft') ||
              inc.category.includes('harassment'),
          };
        })
        .filter((inc) => inc.distanceKm <= maxRadius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      // If no GPS permission provided, return latest city alerts
      nearbyAlerts = incidents.slice(0, 5).map((inc) => ({
        id: inc.id,
        category: inc.category,
        title: inc.title,
        description: inc.description,
        distanceKm: null,
        address: inc.address,
        cityName: inc.city?.name,
        status: inc.status,
        reportedAt: inc.reportedAt,
        isHighPriority: inc.status === 'VERIFIED' || inc.status === 'ADMIN_VERIFIED',
      }));
    }

    return res.json({
      count: nearbyAlerts.length,
      alerts: nearbyAlerts,
      safetyNotice:
        nearbyAlerts.length > 0
          ? `Safety Notice: ${nearbyAlerts.length} reported incidents have been recorded near your current sector.`
          : 'No active incident reports in your immediate perimeter.',
    });
  } catch (error) {
    console.error('Nearby alerts error:', error);
    return res.status(500).json({ error: 'Failed to fetch nearby safety alerts' });
  }
}

/**
 * Get / Update User Notification Preferences
 */
export async function getNotificationPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.json({
        nearbyAlerts: true,
        fareAudits: true,
        communityUpdates: true,
        radiusKm: 5.0,
      });
    }

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.id },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId: req.user.id,
          nearbyAlerts: true,
          fareAudits: true,
          communityUpdates: true,
          radiusKm: 5.0,
        },
      });
    }

    return res.json(pref);
  } catch (error) {
    console.error('Fetch notification preferences error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notification preferences' });
  }
}

export async function updateNotificationPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { nearbyAlerts, fareAudits, communityUpdates, radiusKm } = req.body;

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        nearbyAlerts: nearbyAlerts ?? true,
        fareAudits: fareAudits ?? true,
        communityUpdates: communityUpdates ?? true,
        radiusKm: radiusKm ? parseFloat(radiusKm) : 5.0,
      },
      update: {
        ...(nearbyAlerts !== undefined && { nearbyAlerts }),
        ...(fareAudits !== undefined && { fareAudits }),
        ...(communityUpdates !== undefined && { communityUpdates }),
        ...(radiusKm !== undefined && { radiusKm: parseFloat(radiusKm) }),
      },
    });

    return res.json({ message: 'Notification preferences saved', preferences: pref });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return res.status(500).json({ error: 'Failed to update notification preferences' });
  }
}
