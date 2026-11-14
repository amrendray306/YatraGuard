import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

export async function getAdminOverview(req: AuthenticatedRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      travelersCount,
      reportsToday,
      pendingCount,
      verifiedCount,
      rejectedCount,
      pendingFareCount,
      verifiedFareCount,
      highRiskZones,
      recentEmergencyLogs,
      pendingIncidents,
      pendingFareReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TRAVELER' } }),
      prisma.incidentReport.count({ where: { reportedAt: { gte: today } } }),
      prisma.incidentReport.count({ where: { status: 'PENDING' } }),
      prisma.incidentReport.count({ where: { status: 'ADMIN_VERIFIED' } }),
      prisma.incidentReport.count({ where: { status: 'REJECTED' } }),
      prisma.fareReport.count({ where: { verificationStatus: { in: ['PENDING', 'COMMUNITY_VERIFIED'] } } }),
      prisma.fareReport.count({ where: { verificationStatus: 'ADMIN_VERIFIED' } }),
      prisma.safetyZone.findMany({
        where: { riskTier: { in: ['HIGH_RISK', 'MODERATE'] } },
        include: { city: true },
      }),
      prisma.emergencyLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.incidentReport.findMany({
        where: { status: 'PENDING' },
        include: { city: true, reporter: { select: { name: true, email: true } } },
        orderBy: { reportedAt: 'desc' },
      }),
      prisma.fareReport.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { city: true, transportMode: true },
      }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        activeTravelers: travelersCount,
        reportsToday,
        pendingReports: pendingCount,
        verifiedReports: verifiedCount,
        rejectedReports: rejectedCount,
        pendingFareReports: pendingFareCount,
        verifiedFareReports: verifiedFareCount,
      },
      highRiskZones,
      recentEmergencyLogs,
      pendingIncidents,
      pendingFareReports,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin overview' });
  }
}

export async function reviewIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const incident = await prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) {
      return res.status(404).json({ error: 'Incident report not found' });
    }

    const newStatus = action === 'APPROVE' ? 'ADMIN_VERIFIED' : 'REJECTED';
    const newConfidence = action === 'APPROVE' ? Math.max(incident.confidenceScore, 96) : 0;

    const updated = await prisma.incidentReport.update({
      where: { id },
      data: {
        status: newStatus,
        confidenceScore: newConfidence,
      },
    });

    return res.json({
      message: `Incident marked as ${newStatus}`,
      incident: updated,
    });
  } catch (error) {
    console.error('Review incident error:', error);
    return res.status(500).json({ error: 'Failed to update incident status' });
  }
}

export async function reviewFareReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const report = await prisma.fareReport.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Fare report not found' });
    }

    const newStatus = action === 'APPROVE' ? 'ADMIN_VERIFIED' : 'REJECTED';
    const newWeight = action === 'APPROVE' ? 95 : 20;

    const updated = await prisma.fareReport.update({
      where: { id },
      data: {
        verificationStatus: newStatus,
        reliabilityWeight: newWeight,
      },
    });

    return res.json({
      message: `Fare report marked as ${newStatus}`,
      fareReport: updated,
    });
  } catch (error) {
    console.error('Review fare report error:', error);
    return res.status(500).json({ error: 'Failed to update fare report status' });
  }
}
