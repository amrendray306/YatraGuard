import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

// Trip Management & Live Sharing
export async function createTrip(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      title,
      destinationCity,
      currentLocation,
      startDate,
      endDate,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    if (!title || !destinationCity || !emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ error: 'Title, destination, and emergency contact details are required' });
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.user.id,
        title,
        destinationCity,
        currentLocation: currentLocation || `${destinationCity} Center`,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        emergencyContactName,
        emergencyContactPhone,
        status: 'ACTIVE',
        lastKnownEta: 'En route / Active itinerary',
      },
    });

    return res.status(201).json({
      message: 'Trip created successfully',
      trip,
      shareUrl: `/trips/share/${trip.shareToken}`,
    });
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ error: 'Failed to create trip' });
  }
}

export async function getUserTrips(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const trips = await prisma.trip.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trips' });
  }
}

export async function getSharedTrip(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { shareToken: token },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Shared trip not found or link has expired' });
    }

    return res.json({
      travelerName: trip.user.name,
      title: trip.title,
      destinationCity: trip.destinationCity,
      currentLocation: trip.currentLocation,
      status: trip.status,
      lastKnownEta: trip.lastKnownEta,
      emergencyContactName: trip.emergencyContactName,
      lastUpdated: trip.updatedAt,
    });
  } catch (error) {
    console.error('Get shared trip error:', error);
    return res.status(500).json({ error: 'Failed to fetch shared trip details' });
  }
}

// Private Emergency Vault (Encrypted / Reference-only sensitive data storage)
export async function getVaultItems(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const items = await prisma.vaultItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(items);
  } catch (error) {
    console.error('Get vault items error:', error);
    return res.status(500).json({ error: 'Failed to retrieve emergency vault items' });
  }
}

export async function createVaultItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, category, referenceData, notes } = req.body;

    if (!title || !category || !referenceData) {
      return res.status(400).json({ error: 'Title, category, and reference data are required' });
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: req.user.id,
        title,
        category,
        referenceData,
        notes: notes || null,
      },
    });

    return res.status(201).json({
      message: 'Vault reference securely saved',
      item,
    });
  } catch (error) {
    console.error('Create vault item error:', error);
    return res.status(500).json({ error: 'Failed to store emergency vault item' });
  }
}

export async function deleteVaultItem(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const existing = await prisma.vaultItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    await prisma.vaultItem.delete({ where: { id } });
    return res.json({ message: 'Item deleted from emergency vault' });
  } catch (error) {
    console.error('Delete vault item error:', error);
    return res.status(500).json({ error: 'Failed to delete vault item' });
  }
}
