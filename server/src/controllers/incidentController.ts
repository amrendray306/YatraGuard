import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Fetch Incidents & Scam Reports with Advanced Filtering & Geolocation Distance
 */
export async function getIncidents(req: Request, res: Response) {
  try {
    const {
      cityId,
      category,
      status,
      lat,
      lng,
      radiusKm,
      filterType, // 'nearby' | 'latest' | 'most_reported' | 'verified' | 'pending'
      search,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const userLat = lat ? parseFloat(lat as string) : null;
    const userLng = lng ? parseFloat(lng as string) : null;
    const maxRadius = radiusKm ? parseFloat(radiusKm as string) : null;

    const where: any = {};

    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId as string;
    }

    if (category && category !== 'ALL') {
      where.category = category as string;
    }

    // Status filter
    if (status && status !== 'ALL') {
      if (status === 'VERIFIED' || status === 'ADMIN_VERIFIED') {
        where.status = { in: ['VERIFIED', 'ADMIN_VERIFIED'] };
      } else {
        where.status = status as string;
      }
    } else if (filterType === 'verified') {
      where.status = { in: ['VERIFIED', 'ADMIN_VERIFIED'] };
    } else if (filterType === 'pending') {
      where.status = { in: ['PENDING', 'UNDER_REVIEW'] };
    } else {
      // By default exclude rejected
      where.status = { not: 'REJECTED' };
    }

    // Search query on title, description, or address
    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      where.incidentDate = {};
      if (startDate) where.incidentDate.gte = new Date(startDate as string);
      if (endDate) where.incidentDate.lte = new Date(endDate as string);
    }

    // Determine sorting order
    let orderBy: any = { reportedAt: 'desc' };
    if (filterType === 'most_reported') {
      orderBy = { confirmationsCount: 'desc' };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [totalCount, rawIncidents] = await Promise.all([
      prisma.incidentReport.count({ where }),
      prisma.incidentReport.findMany({
        where,
        include: {
          city: true,
          verifications: {
            select: { id: true, type: true, createdAt: true },
          },
          flags: {
            select: { id: true, reason: true },
          },
          reporter: {
            select: { id: true, name: true, role: true }, // Never expose email, phone or personal identity
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    // Attach computed distance & sanitize reporter information
    let incidents = rawIncidents.map((item) => {
      let distanceKm: number | null = null;
      if (userLat !== null && userLng !== null) {
        distanceKm = calculateHaversineDistanceKm(userLat, userLng, item.lat, item.lng);
      }

      return {
        id: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        lat: item.lat,
        lng: item.lng,
        address: item.address,
        cityId: item.cityId,
        cityName: item.city?.name || 'Local Sector',
        cityState: item.city?.state || 'India',
        status: item.status, // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, RESOLVED, EXPIRED
        confidenceScore: item.confidenceScore,
        confirmationsCount: item.confirmationsCount || item.confirmations || 0,
        outdatedCount: item.outdatedCount || 0,
        flagsCount: item.flagsCount || 0,
        amountDemanded: item.amountDemanded,
        amountPaid: item.amountPaid,
        evidenceUrl: item.evidenceUrl,
        incidentDate: item.incidentDate,
        reportedAt: item.reportedAt,
        distanceKm,
        reporterBadge: item.reporter?.role === 'ADMIN' ? 'Platform Moderator' : 'Verified Traveler',
      };
    });

    // Apply radius filtering if user requested nearby
    if (userLat !== null && userLng !== null && maxRadius !== null) {
      incidents = incidents.filter((inc) => inc.distanceKm !== null && inc.distanceKm <= maxRadius);
    }

    if (filterType === 'nearby' && userLat !== null && userLng !== null) {
      incidents.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }

    return res.json({
      incidents,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Fetch incidents error:', error);
    return res.status(500).json({ error: 'Failed to fetch incident reports' });
  }
}

/**
 * Report a Scam or Safety Incident with Automatic Geolocation & Duplicate Detection
 */
export async function createIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      category,
      title,
      description,
      lat,
      lng,
      address,
      cityId,
      cityName,
      amountDemanded,
      amountPaid,
      evidenceUrl,
      incidentDate,
    } = req.body;

    if (!category || !title || !description || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Incident category, title, description, and valid location coordinates are required',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid geographic latitude or longitude' });
    }

    // Resolve or match City ID
    let targetCityId = cityId;
    if (!targetCityId && cityName) {
      const matchedCity = await prisma.city.findFirst({
        where: { name: { contains: cityName.trim(), mode: 'insensitive' } },
      });
      if (matchedCity) targetCityId = matchedCity.id;
    }

    if (!targetCityId) {
      // Find nearest city within 100km
      const allCities = await prisma.city.findMany();
      let nearestCity = allCities[0];
      let minDistance = 99999;
      for (const c of allCities) {
        const d = calculateHaversineDistanceKm(latitude, longitude, c.lat, c.lng);
        if (d < minDistance) {
          minDistance = d;
          nearestCity = c;
        }
      }
      targetCityId = nearestCity?.id || '1';
    }

    // DUPLICATE DETECTION:
    // Check if another report of the same category was submitted within 150m in the last 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentSimilar = await prisma.incidentReport.findMany({
      where: {
        category,
        reportedAt: { gte: twoDaysAgo },
        status: { not: 'REJECTED' },
      },
    });

    const duplicate = recentSimilar.find((item) => {
      const dist = calculateHaversineDistanceKm(latitude, longitude, item.lat, item.lng);
      return dist <= 0.15; // Within 150 meters
    });

    if (duplicate) {
      // Increment community confirmations on the existing duplicate report instead of spamming
      const updated = await prisma.incidentReport.update({
        where: { id: duplicate.id },
        data: {
          confirmationsCount: duplicate.confirmationsCount + 1,
          confirmations: duplicate.confirmations + 1,
          confidenceScore: Math.min(95, duplicate.confidenceScore + 10),
          status: duplicate.confirmationsCount >= 2 && duplicate.status === 'PENDING' ? 'UNDER_REVIEW' : duplicate.status,
        },
      });

      return res.status(200).json({
        message: 'Similar report already active nearby. Registered as a community confirmation.',
        isDuplicate: true,
        incident: updated,
      });
    }

    // Safe initial confidence score (Admin-submitted gets higher baseline)
    const initialConfidence = req.user?.role === 'ADMIN' ? 85 : 50;

    const incident = await prisma.incidentReport.create({
      data: {
        category,
        title: title.trim(),
        description: description.trim(),
        lat: latitude,
        lng: longitude,
        address: address ? address.trim() : 'Location Pinpoint',
        cityId: targetCityId,
        status: 'PENDING', // NEVER automatically marked as verified
        confidenceScore: initialConfidence,
        confirmations: 1,
        confirmationsCount: 1,
        outdatedCount: 0,
        flagsCount: 0,
        amountDemanded: amountDemanded ? parseFloat(amountDemanded) : null,
        amountPaid: amountPaid ? parseFloat(amountPaid) : null,
        evidenceUrl: evidenceUrl || null,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        reporterId: req.user?.id || null,
      },
      include: {
        city: true,
      },
    });

    return res.status(201).json({
      message: 'Scam/Incident report successfully recorded. Awaiting community and moderator verification.',
      incident,
    });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ error: 'Failed to submit scam report' });
  }
}

/**
 * Community Verification: Confirm relevant, Mark outdated, Add evidence, or Flag
 */
export async function verifyIncidentCommunity(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action, notes, evidenceUrl } = req.body; // 'CONFIRM_RELEVANT' | 'MARK_OUTDATED' | 'ADD_EVIDENCE' | 'FLAG_INACCURATE'

    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    const userId = req.user?.id;

    if (action === 'CONFIRM_RELEVANT') {
      const newCount = incident.confirmationsCount + 1;
      // Do NOT automatically verify! Elevate to UNDER_REVIEW if confirmations reach threshold
      let nextStatus = incident.status;
      if (newCount >= 3 && incident.status === 'PENDING') {
        nextStatus = 'UNDER_REVIEW';
      }

      const updated = await prisma.incidentReport.update({
        where: { id },
        data: {
          confirmationsCount: newCount,
          confirmations: incident.confirmations + 1,
          status: nextStatus,
        },
      });

      if (userId) {
        try {
          await prisma.incidentVerification.create({
            data: {
              incidentId: id,
              userId,
              type: 'CONFIRM_RELEVANT',
              notes: notes || null,
            },
          });
        } catch {
          // Ignore duplicate verification record
        }
      }

      return res.json({
        message: 'Community relevance confirmed. Thank you for protecting fellow travelers.',
        incident: updated,
      });
    }

    if (action === 'MARK_OUTDATED') {
      const newOutdated = incident.outdatedCount + 1;
      let nextStatus = incident.status;
      if (newOutdated >= 4) {
        nextStatus = 'EXPIRED';
      }

      const updated = await prisma.incidentReport.update({
        where: { id },
        data: {
          outdatedCount: newOutdated,
          status: nextStatus,
        },
      });

      return res.json({
        message: 'Incident marked as potentially outdated.',
        incident: updated,
      });
    }

    if (action === 'FLAG_INACCURATE') {
      const newFlags = incident.flagsCount + 1;
      let nextStatus = incident.status;
      if (newFlags >= 3) {
        nextStatus = 'UNDER_REVIEW';
      }

      const updated = await prisma.incidentReport.update({
        where: { id },
        data: {
          flagsCount: newFlags,
          status: nextStatus,
        },
      });

      if (userId) {
        await prisma.incidentFlag.create({
          data: {
            incidentId: id,
            userId,
            reason: 'INACCURATE',
            details: notes || 'Flagged by community as inaccurate',
          },
        });
      }

      return res.json({
        message: 'Incident flagged for moderator review.',
        incident: updated,
      });
    }

    if (action === 'ADD_EVIDENCE') {
      if (userId) {
        await prisma.incidentVerification.create({
          data: {
            incidentId: id,
            userId,
            type: 'ADD_EVIDENCE',
            notes: notes || null,
          },
        });
      }

      return res.json({ message: 'Additional evidence recorded for moderator verification.' });
    }

    return res.status(400).json({ error: 'Invalid community verification action' });
  } catch (error) {
    console.error('Community verification error:', error);
    return res.status(500).json({ error: 'Failed to record community verification' });
  }
}

/**
 * Admin Moderation: Update Incident Status & Record Audit Trail
 */
export async function updateIncidentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status: rawStatus, notes } = req.body; // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, RESOLVED, EXPIRED

    const status = rawStatus === 'ADMIN_VERIFIED' ? 'VERIFIED' : rawStatus;
    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    const updated = await prisma.incidentReport.update({
      where: { id },
      data: {
        status,
        confidenceScore: status === 'VERIFIED' ? 95 : status === 'REJECTED' ? 10 : incident.confidenceScore,
      },
    });

    if (req.user?.id) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: req.user.id,
          action: 'VERIFY_INCIDENT',
          targetEntity: 'INCIDENT',
          targetId: id,
          details: `Changed incident status from ${incident.status} to ${status}. Notes: ${notes || 'None'}`,
        },
      });
    }

    return res.json({
      message: `Incident status updated to ${status}`,
      incident: updated,
    });
  } catch (error) {
    console.error('Admin update incident error:', error);
    return res.status(500).json({ error: 'Failed to update incident moderation status' });
  }
}

/**
 * Scam Intelligence Handlers (Legacy & Structured Warnings)
 */
export async function getScams(req: Request, res: Response) {
  try {
    const { cityId, category } = req.query;

    const where: any = {};
    if (cityId && cityId !== 'ALL') where.cityId = cityId as string;
    if (category && category !== 'ALL') where.category = category as string;

    const scams = await prisma.scamReport.findMany({
      where,
      include: { city: true },
      orderBy: { reportCount: 'desc' },
    });

    return res.json(scams);
  } catch (error) {
    console.error('Fetch scams error:', error);
    return res.status(500).json({ error: 'Failed to retrieve scam intelligence' });
  }
}

export async function createScam(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      category,
      title,
      locationName,
      lat,
      lng,
      address,
      cityId,
      description,
      warningSigns,
      typicalPattern,
    } = req.body;

    if (!category || !title || !description || !warningSigns) {
      return res.status(400).json({ error: 'category, title, description, and warningSigns are required' });
    }

    let targetCityId = cityId;
    if (!targetCityId) {
      const firstCity = await prisma.city.findFirst();
      targetCityId = firstCity?.id || '1';
    }

    const scam = await prisma.scamReport.create({
      data: {
        category,
        title,
        locationName: locationName || 'Tourist Hotspot',
        lat: lat ? parseFloat(lat) : 27.1767,
        lng: lng ? parseFloat(lng) : 78.0081,
        address: address || 'City Sector',
        cityId: targetCityId,
        description,
        warningSigns,
        typicalPattern: typicalPattern || 'Solicitation -> Diversion -> Overcharging',
        reportCount: 1,
        confidence: 70,
      },
    });

    return res.status(201).json({
      message: 'Scam intelligence alert recorded',
      scam,
    });
  } catch (error) {
    console.error('Create scam error:', error);
    return res.status(500).json({ error: 'Failed to submit scam alert' });
  }
}

export async function voteScam(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const scam = await prisma.scamReport.findUnique({ where: { id } });
    if (!scam) {
      return res.status(404).json({ error: 'Scam report not found' });
    }

    const updated = await prisma.scamReport.update({
      where: { id },
      data: {
        reportCount: scam.reportCount + 1,
        confidence: Math.min(98, scam.confidence + 2),
        lastReportedAt: new Date(),
      },
    });

    return res.json({ message: 'Scam report confirmed by traveler', scam: updated });
  } catch (error) {
    console.error('Vote scam error:', error);
    return res.status(500).json({ error: 'Failed to register scam confirmation' });
  }
}
