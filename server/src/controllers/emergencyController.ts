import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateDistanceKm, formatDistance } from '../services/geoService.js';

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
    const { emergencyType, lat, lng, address, cityId, messageText, sharedWithCount, status } = req.body;

    const log = await prisma.emergencyLog.create({
      data: {
        userId: req.user?.id || null,
        cityId: cityId || null,
        emergencyType: emergencyType || 'SOS_112',
        lat: lat ? parseFloat(lat) : 0,
        lng: lng ? parseFloat(lng) : 0,
        address: address || 'Current User Coordinates',
        messageText: messageText ? String(messageText).slice(0, 1000) : null,
        sharedWithCount: sharedWithCount ? Math.max(0, parseInt(sharedWithCount, 10) || 0) : 0,
        status: status || 'LOGGED_CLIENT_ACTION',
      },
    });

    return res.status(201).json({
      message: 'SOS event logged.',
      log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SOS trigger error:', error);
    return res.status(500).json({ error: 'Failed to record emergency event' });
  }
}

export async function getEmergencyHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const logs = await prisma.emergencyLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return res.json({ logs });
  } catch (error) {
    console.error('Emergency history error:', error);
    return res.status(500).json({ error: 'Failed to load SOS history' });
  }
}

export async function getEmergencyContacts(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return res.json({ contacts });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    return res.status(500).json({ error: 'Failed to load emergency contacts' });
  }
}

export async function createEmergencyContact(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, phone, relation = 'Family', isPrimary = false, canShareLocation = true } = req.body;
    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Contact name and phone number are required' });
    }

    const cleanedPhone = String(phone).trim();
    if (cleanedPhone.replace(/[^0-9+]/g, '').length < 6) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    const existingCount = await prisma.emergencyContact.count({
      where: { userId: req.user.id },
    });
    if (existingCount >= 8) {
      return res.status(400).json({ error: 'Maximum 8 trusted emergency contacts allowed' });
    }

    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { userId: req.user.id },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        phone: cleanedPhone,
        relation: String(relation).trim() || 'Family',
        isPrimary: Boolean(isPrimary) || existingCount === 0,
        canShareLocation: Boolean(canShareLocation),
      },
    });

    return res.status(201).json({ message: 'Emergency contact saved', contact });
  } catch (error) {
    console.error('Create emergency contact error:', error);
    return res.status(500).json({ error: 'Failed to save emergency contact' });
  }
}

export async function updateEmergencyContact(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this contact' });
    }

    const { name, phone, relation, isPrimary, canShareLocation } = req.body;
    if (phone !== undefined && String(phone).replace(/[^0-9+]/g, '').length < 6) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    if (isPrimary === true) {
      await prisma.emergencyContact.updateMany({
        where: { userId: req.user.id },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(relation !== undefined && { relation: String(relation).trim() }),
        ...(isPrimary !== undefined && { isPrimary: Boolean(isPrimary) }),
        ...(canShareLocation !== undefined && { canShareLocation: Boolean(canShareLocation) }),
      },
    });

    return res.json({ message: 'Emergency contact updated', contact: updated });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    return res.status(500).json({ error: 'Failed to update emergency contact' });
  }
}

export async function deleteEmergencyContact(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this contact' });
    }

    await prisma.emergencyContact.delete({ where: { id } });
    return res.json({ message: 'Emergency contact deleted' });
  } catch (error) {
    console.error('Delete emergency contact error:', error);
    return res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
}
