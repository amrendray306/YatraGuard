import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

export async function getUserProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        location: true,
        aboutMe: true,
        travelPreferences: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        role: true,
        authProvider: true,
        avatarUrl: true,
        reputationScore: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('getUserProfile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}

export async function updateUserProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      name,
      phone,
      location,
      aboutMe,
      travelPreferences,
      avatarUrl,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(aboutMe !== undefined && { aboutMe }),
        ...(travelPreferences !== undefined && { travelPreferences }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(emergencyContactName !== undefined && { emergencyContactName }),
        ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        location: true,
        aboutMe: true,
        travelPreferences: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        role: true,
        authProvider: true,
        avatarUrl: true,
        reputationScore: true,
      },
    });

    return res.json({
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (error) {
    console.error('updateUserProfile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function changeUserPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Cannot change password for social login accounts' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('changeUserPassword error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

export async function getUserDashboardData(req: AuthenticatedRequest, res: Response) {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [
      user,
      trips,
      savedDestinations,
      vaultItems,
      incidents,
      communityPosts,
      buddyRequests,
      notifications,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          location: true,
          aboutMe: true,
          travelPreferences: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          role: true,
          authProvider: true,
          avatarUrl: true,
          reputationScore: true,
          createdAt: true,
        },
      }),
      prisma.trip.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.savedDestination.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vaultItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.incidentReport.findMany({
        where: { reporterId: userId },
        include: { city: true },
        orderBy: { reportedAt: 'desc' },
      }),
      prisma.communityPost.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { comments: true },
      }),
      prisma.travelBuddyRequest.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      user,
      trips,
      savedDestinations,
      vaultItems,
      incidents,
      communityPosts,
      buddyRequests,
      notifications,
    });
  } catch (error) {
    console.error('getUserDashboardData error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
}

export async function getSavedDestinations(req: AuthenticatedRequest, res: Response) {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    const destinations = await prisma.savedDestination.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ destinations });
  } catch (error) {
    console.error('getSavedDestinations error:', error);
    return res.status(500).json({ error: 'Failed to retrieve saved destinations' });
  }
}

export async function createSavedDestination(req: AuthenticatedRequest, res: Response) {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { cityName, state, imageUrl, notes } = req.body;
    if (!cityName) {
      return res.status(400).json({ error: 'City name is required' });
    }

    const saved = await prisma.savedDestination.create({
      data: {
        userId,
        cityName,
        state: state || 'India',
        imageUrl: imageUrl || null,
        notes: notes || null,
      },
    });

    return res.status(201).json({
      message: 'Destination saved',
      destination: saved,
    });
  } catch (error) {
    console.error('createSavedDestination error:', error);
    return res.status(500).json({ error: 'Failed to save destination' });
  }
}

export async function deleteSavedDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.savedDestination.delete({ where: { id } });
    return res.json({ message: 'Saved destination removed' });
  } catch (error) {
    console.error('deleteSavedDestination error:', error);
    return res.status(500).json({ error: 'Failed to remove saved destination' });
  }
}

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ notifications });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await prisma.user.delete({ where: { id: userId } });
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}
