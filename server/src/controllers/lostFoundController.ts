import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const LOST_FOUND_TYPES = ['LOST', 'FOUND'] as const;
export const LOST_FOUND_CATEGORIES = [
  'PHONE',
  'WALLET_ID',
  'LUGGAGE',
  'DOCUMENTS',
  'JEWELRY',
  'KEYS',
  'OTHER',
] as const;

export async function getLostFoundItems(req: AuthenticatedRequest, res: Response) {
  try {
    const { type, category, cityId, status, search, mine } = req.query;

    const isPrivileged = req.user && ['ADMIN', 'MODERATOR'].includes(req.user.role);
    const where: any = {};

    if (!isPrivileged && mine !== 'true') {
      where.moderationStatus = { not: 'HIDDEN' };
    }
    if (mine === 'true' && req.user) {
      where.userId = req.user.id;
    }
    if (type && type !== 'ALL' && LOST_FOUND_TYPES.includes(type as any)) {
      where.type = type;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId as string;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { locationName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.lostFoundItem.findMany({
      where,
      include: {
        city: { select: { id: true, name: true, state: true } },
        user: { select: { id: true, name: true, avatarUrl: true } }, // Privacy: never leak email/phone
        _count: { select: { inquiries: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return res.json({ items });
  } catch (error) {
    console.error('Get lost/found error:', error);
    return res.status(500).json({ error: 'Failed to load lost & found listings' });
  }
}

export async function createLostFoundItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to report a lost or found item' });
    }

    const { type, title, category, description, locationName, cityId, lat, lng, eventDate } = req.body;

    if (!type || !LOST_FOUND_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Type must be LOST or FOUND' });
    }
    if (!title?.trim() || !description?.trim() || !locationName?.trim()) {
      return res.status(400).json({ error: 'Title, description, and location are required' });
    }
    if (!category || !LOST_FOUND_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid item category' });
    }

    let resolvedCityId: string | null = cityId || null;
    if (!resolvedCityId && locationName) {
      const city = await prisma.city.findFirst({
        where: { name: { equals: String(locationName).trim(), mode: 'insensitive' } },
      });
      if (city) resolvedCityId = city.id;
    }

    let imageUrl: string | null = null;
    if (req.file) {
      const rawPath = (req.file as any).path || '';
      imageUrl = rawPath.startsWith('http') ? rawPath : `/uploads/${req.file.filename}`;
    }

    const item = await prisma.lostFoundItem.create({
      data: {
        userId: req.user.id,
        cityId: resolvedCityId,
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        locationName: locationName.trim(),
        lat: lat !== undefined && lat !== '' ? parseFloat(lat) : null,
        lng: lng !== undefined && lng !== '' ? parseFloat(lng) : null,
        eventDate: eventDate || new Date().toISOString().split('T')[0],
        imageUrl,
      },
      include: {
        city: { select: { id: true, name: true, state: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return res.status(201).json({
      message: `${type === 'LOST' ? 'Lost' : 'Found'} item listing published`,
      item,
    });
  } catch (error) {
    console.error('Create lost/found error:', error);
    return res.status(500).json({ error: 'Failed to create lost & found listing' });
  }
}

export async function updateLostFoundStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { status } = req.body;
    if (!['OPEN', 'MATCHED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (existing.userId !== req.user.id && !isPrivileged) {
      return res.status(403).json({ error: 'Not authorized to update this listing' });
    }

    const updated = await prisma.lostFoundItem.update({
      where: { id },
      data: { status },
    });

    return res.json({ message: `Status updated to ${status}`, item: updated });
  } catch (error) {
    console.error('Update lost/found status error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}

export async function moderateLostFoundItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Moderator or Admin role required' });
    }

    const { id } = req.params;
    const { moderationStatus } = req.body;
    if (!['APPROVED', 'PENDING', 'HIDDEN'].includes(moderationStatus)) {
      return res.status(400).json({ error: 'Invalid moderation status' });
    }

    const updated = await prisma.lostFoundItem.update({
      where: { id },
      data: { moderationStatus },
    });

    return res.json({ message: `Listing marked ${moderationStatus}`, item: updated });
  } catch (error) {
    console.error('Moderate lost/found error:', error);
    return res.status(500).json({ error: 'Failed to moderate listing' });
  }
}

/**
 * Privacy-Preserving Relay Inquiry: notifies item owner in-app without exposing personal email/phone publicly
 */
export async function inquireLostFoundItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to send an inquiry' });
    }

    const { id } = req.params;
    const { message, contactHint } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Inquiry message is required' });
    }

    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item || item.moderationStatus === 'HIDDEN') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (item.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot submit inquiry on your own listing' });
    }

    const inquiry = await prisma.lostFoundInquiry.create({
      data: {
        itemId: item.id,
        senderId: req.user.id,
        message: message.trim().slice(0, 600),
        contactHint: contactHint?.trim() ? contactHint.trim().slice(0, 120) : null,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: item.userId,
        title: `Lost & Found Inquiry: ${item.title}`,
        message: `${req.user.name || 'A traveler'} sent a message regarding your ${item.type.toLowerCase()} item.`,
        type: 'ALERT',
        linkUrl: '/lost-found',
      },
    });

    return res.status(201).json({
      message: 'Private inquiry relayed via in-app notification',
      inquiry,
    });
  } catch (error) {
    console.error('Lost/found inquiry error:', error);
    return res.status(500).json({ error: 'Failed to relay inquiry' });
  }
}

export async function getLostFoundInquiries(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (item.userId !== req.user.id && !isPrivileged) {
      return res.status(403).json({ error: 'Forbidden: only the listing owner can view inquiries' });
    }

    const inquiries = await prisma.lostFoundInquiry.findMany({
      where: { itemId: id },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ inquiries });
  } catch (error) {
    console.error('Get lost/found inquiries error:', error);
    return res.status(500).json({ error: 'Failed to load inquiries' });
  }
}

export async function deleteLostFoundItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const isPrivileged = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (item.userId !== req.user.id && !isPrivileged) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    await prisma.lostFoundItem.delete({ where: { id } });
    return res.json({ message: 'Listing deleted' });
  } catch (error) {
    console.error('Delete lost/found error:', error);
    return res.status(500).json({ error: 'Failed to delete listing' });
  }
}
