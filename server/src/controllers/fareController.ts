import { Request, Response } from 'express';
import { fareEstimationService } from '../services/FareEstimationService.js';
import { prisma } from '../lib/prisma.js';

export const calculateFareEstimate = async (req: Request, res: Response) => {
  try {
    const { cityId, cityName, origin, destination, distanceKm, travelHour, hasLuggage, passengerCount } = req.body;

    const result = await fareEstimationService.estimateFares({
      cityId,
      cityName,
      origin,
      destination,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      travelHour: travelHour !== undefined ? parseInt(travelHour, 10) : undefined,
      hasLuggage: Boolean(hasLuggage),
      passengerCount: passengerCount ? parseInt(passengerCount, 10) : 1,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error calculating fare estimate:', error);
    res.status(500).json({ error: error?.message || 'Failed to calculate transportation fare estimate' });
  }
};

export const checkOvercharge = async (req: Request, res: Response) => {
  try {
    const { cityId, cityName, transportModeId, quotedFare, distanceKm, origin, destination, travelHour } = req.body;

    if (!transportModeId || quotedFare === undefined) {
      return res.status(400).json({ error: 'transportModeId and quotedFare are required.' });
    }

    const result = await fareEstimationService.detectOvercharging({
      cityId,
      cityName,
      transportModeId,
      quotedFare: parseFloat(quotedFare),
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      origin,
      destination,
      travelHour: travelHour !== undefined ? parseInt(travelHour, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error auditing overcharge:', error);
    res.status(500).json({ error: error?.message || 'Failed to audit driver quoted fare' });
  }
};

export const reportCommunityFare = async (req: any, res: Response) => {
  try {
    const { cityId, transportModeId, originName, destinationName, distanceKm, actualFarePaid, quotedFare, wasOvercharged, comments } = req.body;

    if (!cityId || !transportModeId || !originName || !destinationName || !distanceKm || !actualFarePaid) {
      return res.status(400).json({ error: 'All core trip details (cityId, transportModeId, originName, destinationName, distanceKm, actualFarePaid) are required.' });
    }

    const newReport = await fareEstimationService.submitCommunityFareReport({
      cityId,
      transportModeId,
      userId: req.user?.id || null,
      originName,
      destinationName,
      distanceKm: parseFloat(distanceKm),
      actualFarePaid: parseFloat(actualFarePaid),
      quotedFare: quotedFare ? parseFloat(quotedFare) : undefined,
      wasOvercharged: Boolean(wasOvercharged),
      comments,
    });

    res.status(201).json({
      message: 'Community fare report submitted successfully. Thank you for contributing to fair travel transparency!',
      report: newReport,
    });
  } catch (error: any) {
    console.error('Error reporting community fare:', error);
    res.status(500).json({ error: error?.message || 'Failed to submit community fare report' });
  }
};

export const getCityRules = async (req: Request, res: Response) => {
  try {
    const { cityId } = req.params;
    const rules = await fareEstimationService.getCityFareRules(cityId);
    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching city fare rules:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch city fare rules' });
  }
};

export const getTransportModes = async (req: Request, res: Response) => {
  try {
    const modes = await prisma.transportationMode.findMany({
      orderBy: { displayName: 'asc' },
    });
    res.json(modes);
  } catch (error: any) {
    console.error('Error fetching transport modes:', error);
    res.status(500).json({ error: 'Failed to fetch transport modes' });
  }
};

export const getRecentCommunityReports = async (req: Request, res: Response) => {
  try {
    const { cityId } = req.query;
    const where: any = { verificationStatus: 'COMMUNITY_VERIFIED' };
    if (cityId) where.cityId = String(cityId);

    const reports = await prisma.fareReport.findMany({
      where,
      include: {
        city: true,
        transportMode: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(reports);
  } catch (error: any) {
    console.error('Error fetching community reports:', error);
    res.status(500).json({ error: 'Failed to fetch community fare reports' });
  }
};

