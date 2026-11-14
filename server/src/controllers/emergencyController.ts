import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateDistanceKm, formatDistance } from '../services/geoService.js';

const prisma = new PrismaClient();

export const OFFICIAL_INDIAN_EMERGENCY_NUMBERS = [
  {
    name: 'Pan-India Unified Emergency Helpline',
    number: '112',
    category: 'ALL_IN_ONE',
    badge: 'National Priority',
    description: 'Direct response for Police, Fire, Ambulance, and Disaster Management across all States & UTs.',
    icon: 'ShieldAlert',
  },
  {
    name: 'Police Control Room',
    number: '100',
    category: 'POLICE',
    badge: 'Immediate Crime/Danger',
    description: 'Direct dispatch to the nearest police patrolling van (PCR) and local station.',
    icon: 'Shield',
  },
  {
    name: 'National Ambulance Service',
    number: '108',
    category: 'MEDICAL',
    badge: 'Free 24x7 Ambulance',
    description: 'Emergency medical response and hospital trauma transfer across Indian highways and cities.',
    icon: 'Ambulance',
  },
  {
    name: 'Maternity & Medical Helpline',
    number: '102',
    category: 'MEDICAL',
    badge: 'Medical Transport',
    description: 'Government medical transport and hospital emergency hotline.',
    icon: 'HeartPulse',
  },
  {
    name: 'Women in Distress Helpline',
    number: '1091',
    category: 'WOMEN_SAFETY',
    badge: '24x7 Dedicated',
    description: 'National Commission for Women & State Police women safety rapid intervention unit.',
    icon: 'UserCheck',
  },
  {
    name: 'UP Women Powerline',
    number: '1090',
    category: 'WOMEN_SAFETY',
    badge: 'North India Rapid',
    description: 'Dedicated anti-harassment and safety intervention for women travelers in Uttar Pradesh.',
    icon: 'Lock',
  },
  {
    name: 'Tourist Infoline (Ministry of Tourism)',
    number: '1363',
    category: 'TOURIST_SUPPORT',
    badge: 'Multi-lingual 24x7',
    description: 'Toll-free tourist guidance and emergency assistance available in 12 languages.',
    icon: 'Compass',
  },
  {
    name: 'Railway Security & Assistance',
    number: '139',
    category: 'RAILWAY',
    badge: 'RailMadad & RPF',
    description: 'Immediate railway protection force security on moving trains and platforms.',
    icon: 'Train',
  },
];

export async function getEmergencyInfo(req: Request, res: Response) {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 27.1767;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 78.0081;
    const cityId = req.query.cityId as string | undefined;

    // Find closest hospital and police station
    const services = await prisma.locationService.findMany({
      where: cityId ? { cityId } : undefined,
    });

    let nearestHospital: any = null;
    let nearestPolice: any = null;
    let minHospDist = Infinity;
    let minPolDist = Infinity;

    for (const s of services) {
      const d = calculateDistanceKm(lat, lng, s.lat, s.lng);
      if (s.category === 'HOSPITAL' && d < minHospDist) {
        minHospDist = d;
        nearestHospital = { ...s, distanceKm: d, distanceLabel: formatDistance(d) };
      }
      if (s.category === 'POLICE' && d < minPolDist) {
        minPolDist = d;
        nearestPolice = { ...s, distanceKm: d, distanceLabel: formatDistance(d) };
      }
    }

    return res.json({
      officialHelplines: OFFICIAL_INDIAN_EMERGENCY_NUMBERS,
      nearestHospital,
      nearestPolice,
      currentCoordinates: { lat, lng },
    });
  } catch (error) {
    console.error('Emergency info error:', error);
    return res.status(500).json({ error: 'Failed to retrieve emergency information' });
  }
}

export async function triggerSosLog(req: AuthenticatedRequest, res: Response) {
  try {
    const { emergencyType, lat, lng, address, cityId } = req.body;

    const log = await prisma.emergencyLog.create({
      data: {
        userId: req.user?.id || null,
        cityId: cityId || null,
        emergencyType: emergencyType || 'SOS_112',
        lat: lat ? parseFloat(lat) : 0,
        lng: lng ? parseFloat(lng) : 0,
        address: address || 'Current User Coordinates',
        status: 'DISPATCHED_DEMO',
      },
    });

    return res.status(201).json({
      message: 'SOS Alert triggered and logged.',
      log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SOS trigger error:', error);
    return res.status(500).json({ error: 'Failed to record emergency event' });
  }
}
