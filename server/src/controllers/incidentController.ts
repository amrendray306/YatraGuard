import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

export async function getIncidents(req: Request, res: Response) {
  try {
    const { cityId, category, status } = req.query;

    const where: any = {};
    if (cityId) where.cityId = cityId as string;
    if (category) where.category = category as string;
    if (status) {
      where.status = status as any;
    } else {
      // By default show all non-rejected reports
      where.status = { not: 'REJECTED' };
    }

    const incidents = await prisma.incidentReport.findMany({
      where,
      include: {
        city: true,
        reporter: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { reportedAt: 'desc' },
    });

    return res.json(incidents);
  } catch (error) {
    console.error('Fetch incidents error:', error);
    return res.status(500).json({ error: 'Failed to fetch incidents' });
  }
}

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
      evidenceUrl,
    } = req.body;

    if (!category || !title || !description || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'category, title, description, lat, and lng are required',
      });
    }

    // Resolve cityId if not directly provided
    let targetCityId = cityId;
    if (!targetCityId) {
      const firstCity = await prisma.city.findFirst();
      targetCityId = firstCity?.id || '1';
    }

    // Confidence starts conservative for newly reported incidents (Pending Verification)
    const initialConfidence = req.user?.role === 'ADMIN' ? 85 : 45;

    const incident = await prisma.incidentReport.create({
      data: {
        category,
        title,
        description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: address || 'Reported Location',
        cityId: targetCityId,
        status: 'PENDING', // NEVER immediately mark as verified
        confidenceScore: initialConfidence,
        confirmations: 1,
        evidenceUrl: evidenceUrl || null,
        reporterId: req.user?.id || null,
      },
      include: {
        city: true,
      },
    });

    return res.status(201).json({
      message: 'Incident submitted successfully. Status is Pending Verification.',
      incident,
    });
  } catch (error) {
    console.error('Create incident error:', error);
    return res.status(500).json({ error: 'Failed to submit incident report' });
  }
}

export async function confirmIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const newConfirmations = incident.confirmations + 1;
    let newStatus = incident.status;
    let newConfidence = Math.min(95, incident.confidenceScore + 12);

    // If 3 or more community members confirm, elevate status
    if (newConfirmations >= 3 && incident.status === 'PENDING') {
      newStatus = 'COMMUNITY_CONFIRMED';
    }

    const updated = await prisma.incidentReport.update({
      where: { id },
      data: {
        confirmations: newConfirmations,
        confidenceScore: newConfidence,
        status: newStatus,
      },
    });

    return res.json({
      message: 'Community confirmation registered',
      incident: updated,
    });
  } catch (error) {
    console.error('Confirm incident error:', error);
    return res.status(500).json({ error: 'Failed to confirm incident' });
  }
}

// Scam Intelligence Handlers
export async function getScams(req: Request, res: Response) {
  try {
    const { cityId, category } = req.query;

    const where: any = {};
    if (cityId) where.cityId = cityId as string;
    if (category) where.category = category as string;

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
