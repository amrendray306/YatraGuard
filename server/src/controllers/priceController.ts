import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Get City-Wise Local Prices across all travel categories
 */
export async function getPriceRecords(req: Request, res: Response) {
  try {
    const { cityId, category, search, verificationStatus } = req.query;

    const where: any = {};

    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId as string;
    }

    if (category && category !== 'ALL') {
      where.category = category as string;
    }

    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus as string;
    } else {
      // By default show verified and community submitted
      where.verificationStatus = { not: 'REJECTED' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { itemName: { contains: search.trim(), mode: 'insensitive' } },
        { notes: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const prices = await prisma.priceRecord.findMany({
      where,
      include: {
        city: { select: { id: true, name: true, state: true } },
      },
      orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
    });

    return res.json(prices);
  } catch (error) {
    console.error('Fetch prices error:', error);
    return res.status(500).json({ error: 'Failed to fetch city price records' });
  }
}

/**
 * Submit Community Price Record
 */
export async function submitPriceRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const { cityId, category, itemName, minPrice, maxPrice, notes, sourceReference } = req.body;

    if (!cityId || !category || !itemName || minPrice === undefined || maxPrice === undefined) {
      return res.status(400).json({
        error: 'cityId, category, itemName, minPrice, and maxPrice are required',
      });
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);

    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      return res.status(400).json({ error: 'Valid positive price range is required (min <= max)' });
    }

    const priceRecord = await prisma.priceRecord.create({
      data: {
        cityId,
        category,
        itemName: itemName.trim(),
        minPrice: min,
        maxPrice: max,
        currency: 'INR (₹)',
        sourceType: 'COMMUNITY_SUBMISSION',
        sourceReference: sourceReference ? sourceReference.trim() : 'Traveler Verified Spend',
        verificationStatus: 'PENDING',
        submittedById: req.user?.id || null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        city: true,
      },
    });

    return res.status(201).json({
      message: 'Local price submitted successfully. Awaiting moderator benchmark verification.',
      priceRecord,
    });
  } catch (error) {
    console.error('Submit price error:', error);
    return res.status(500).json({ error: 'Failed to submit price record' });
  }
}

/**
 * Admin Moderation: Update/Verify/Delete Price Record
 */
export async function adminUpdatePrice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { minPrice, maxPrice, verificationStatus, notes, sourceType } = req.body;

    const priceRecord = await prisma.priceRecord.findUnique({ where: { id } });
    if (!priceRecord) {
      return res.status(404).json({ error: 'Price record not found' });
    }

    const updated = await prisma.priceRecord.update({
      where: { id },
      data: {
        ...(minPrice !== undefined && { minPrice: parseFloat(minPrice) }),
        ...(maxPrice !== undefined && { maxPrice: parseFloat(maxPrice) }),
        ...(verificationStatus && { verificationStatus }),
        ...(notes !== undefined && { notes }),
        ...(sourceType && { sourceType }),
        lastUpdated: new Date(),
      },
    });

    return res.json({ message: 'Price record updated', priceRecord: updated });
  } catch (error) {
    console.error('Update price error:', error);
    return res.status(500).json({ error: 'Failed to update price record' });
  }
}

export async function adminDeletePrice(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.priceRecord.delete({ where: { id } });
    return res.json({ message: 'Price record deleted successfully' });
  } catch (error) {
    console.error('Delete price error:', error);
    return res.status(500).json({ error: 'Failed to delete price record' });
  }
}
