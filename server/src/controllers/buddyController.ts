import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

const SENDER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  role: true,
  travelPreferences: true,
  reputationScore: true,
  location: true,
  aboutMe: true,
};

// ─── GET /api/buddy/plans ─────────────────────────────────────────────────────
export async function getBuddyPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const { destination, style, budget, myId } = req.query;

    const where: any = { status: 'OPEN' };
    if (destination && typeof destination === 'string' && destination !== 'ALL') {
      where.destinationCity = { contains: destination, mode: 'insensitive' };
    }
    if (style && typeof style === 'string' && style !== 'ALL') {
      where.travelStyle = style;
    }
    if (budget && typeof budget === 'string' && budget !== 'ALL') {
      where.budgetTier = budget;
    }
    // Exclude the requesting user's own plans
    if (req.user?.id) {
      where.senderId = { not: req.user.id };
    }

    const plans = await prisma.travelBuddyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { select: SENDER_SELECT },
        connections: req.user?.id
          ? {
              where: { senderId: req.user.id },
              select: { id: true, status: true },
            }
          : false,
      },
    });

    return res.json({ plans });
  } catch (error) {
    console.error('getBuddyPlans error:', error);
    return res.status(500).json({ error: 'Failed to retrieve travel plans' });
  }
}

// ─── POST /api/buddy/plans ────────────────────────────────────────────────────
export async function createBuddyPlan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const {
      destinationCity,
      fromLocation,
      startDate,
      endDate,
      travelStyle,
      budgetTier,
      companionsNeeded,
      preferredLanguage,
      notes,
    } = req.body;

    if (!destinationCity || !startDate || !endDate) {
      return res.status(400).json({ error: 'Destination, start date and end date are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const plan = await prisma.travelBuddyRequest.create({
      data: {
        senderId: req.user.id,
        destinationCity,
        fromLocation: fromLocation || null,
        startDate,
        endDate,
        travelStyle: travelStyle || 'ADVENTURE',
        budgetTier: budgetTier || 'MODERATE',
        companionsNeeded: Number(companionsNeeded) || 1,
        preferredLanguage: preferredLanguage || null,
        notes: notes || null,
        status: 'OPEN',
      },
      include: { sender: { select: SENDER_SELECT } },
    });

    return res.status(201).json({ message: 'Travel plan published', plan });
  } catch (error) {
    console.error('createBuddyPlan error:', error);
    return res.status(500).json({ error: 'Failed to create travel plan' });
  }
}

// ─── PUT /api/buddy/plans/:id/cancel ─────────────────────────────────────────
export async function cancelBuddyPlan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const plan = await prisma.travelBuddyRequest.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Travel plan not found' });
    if (plan.senderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.travelBuddyRequest.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    return res.json({ message: 'Travel plan cancelled', plan: updated });
  } catch (error) {
    console.error('cancelBuddyPlan error:', error);
    return res.status(500).json({ error: 'Failed to cancel travel plan' });
  }
}

// ─── GET /api/buddy/my-plans ──────────────────────────────────────────────────
export async function getMyBuddyPlans(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const plans = await prisma.travelBuddyRequest.findMany({
      where: { senderId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        connections: {
          include: {
            receiverUser: { select: SENDER_SELECT },
            senderUser: { select: SENDER_SELECT },
          },
        },
      },
    });

    return res.json({ plans });
  } catch (error) {
    console.error('getMyBuddyPlans error:', error);
    return res.status(500).json({ error: 'Failed to retrieve your travel plans' });
  }
}

// ─── POST /api/buddy/connect ──────────────────────────────────────────────────
// Send a buddy connection request to a plan's sender
export async function sendBuddyConnection(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { planId, message } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const plan = await prisma.travelBuddyRequest.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Travel plan not found' });
    if (plan.status !== 'OPEN') return res.status(400).json({ error: 'This travel plan is no longer open' });
    if (plan.senderId === req.user.id) return res.status(400).json({ error: 'Cannot connect to your own travel plan' });

    // Prevent duplicate requests
    const existing = await prisma.buddyConnection.findFirst({
      where: { requestId: planId, senderId: req.user.id },
    });
    if (existing) {
      return res.status(409).json({
        error: 'You have already sent a request for this plan',
        status: existing.status,
      });
    }

    const connection = await prisma.buddyConnection.create({
      data: {
        requestId: planId,
        senderId: req.user.id,
        receiverId: plan.senderId,
        message: message || null,
        status: 'PENDING',
      },
      include: {
        senderUser: { select: SENDER_SELECT },
        receiverUser: { select: SENDER_SELECT },
        request: true,
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: plan.senderId,
        title: 'New Travel Buddy Request',
        message: `${req.user.name} wants to travel with you to ${plan.destinationCity}`,
        type: 'BUDDY',
      },
    });

    return res.status(201).json({ message: 'Buddy request sent', connection });
  } catch (error) {
    console.error('sendBuddyConnection error:', error);
    return res.status(500).json({ error: 'Failed to send buddy request' });
  }
}

// ─── PUT /api/buddy/connections/:id/accept ───────────────────────────────────
export async function acceptBuddyConnection(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const conn = await prisma.buddyConnection.findUnique({
      where: { id: req.params.id },
      include: { senderUser: { select: SENDER_SELECT }, request: true },
    });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.receiverId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (conn.status !== 'PENDING') return res.status(400).json({ error: 'Request is no longer pending' });

    const updated = await prisma.buddyConnection.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' },
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: conn.senderId,
        title: 'Buddy Request Accepted!',
        message: `${req.user.name} accepted your travel request to ${conn.request.destinationCity}`,
        type: 'BUDDY',
      },
    });

    return res.json({ message: 'Buddy request accepted', connection: updated });
  } catch (error) {
    console.error('acceptBuddyConnection error:', error);
    return res.status(500).json({ error: 'Failed to accept buddy request' });
  }
}

// ─── PUT /api/buddy/connections/:id/reject ───────────────────────────────────
export async function rejectBuddyConnection(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const conn = await prisma.buddyConnection.findUnique({
      where: { id: req.params.id },
    });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.receiverId !== req.user.id && conn.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.buddyConnection.update({
      where: { id: req.params.id },
      data: { status: conn.receiverId === req.user.id ? 'REJECTED' : 'CANCELLED' },
    });

    return res.json({ message: 'Connection updated', connection: updated });
  } catch (error) {
    console.error('rejectBuddyConnection error:', error);
    return res.status(500).json({ error: 'Failed to update connection' });
  }
}

// ─── GET /api/buddy/connections ──────────────────────────────────────────────
export async function getMyConnections(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const [sent, received] = await Promise.all([
      prisma.buddyConnection.findMany({
        where: { senderId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          receiverUser: { select: SENDER_SELECT },
          request: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.buddyConnection.findMany({
        where: { receiverId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          senderUser: { select: SENDER_SELECT },
          request: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return res.json({ sent, received });
  } catch (error) {
    console.error('getMyConnections error:', error);
    return res.status(500).json({ error: 'Failed to retrieve connections' });
  }
}

// ─── GET /api/buddy/connections/:id/messages ─────────────────────────────────
export async function getConnectionMessages(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const conn = await prisma.buddyConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.senderId !== req.user.id && conn.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (conn.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Messaging is only available for accepted connections' });
    }

    // Mark messages from other side as read
    await prisma.buddyMessage.updateMany({
      where: { connectionId: req.params.id, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });

    const messages = await prisma.buddyMessage.findMany({
      where: { connectionId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { senderUser: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return res.json({ messages });
  } catch (error) {
    console.error('getConnectionMessages error:', error);
    return res.status(500).json({ error: 'Failed to retrieve messages' });
  }
}

// ─── POST /api/buddy/connections/:id/messages ────────────────────────────────
export async function sendConnectionMessage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

    const conn = await prisma.buddyConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.senderId !== req.user.id && conn.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (conn.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Messaging is only available for accepted connections' });
    }

    const message = await prisma.buddyMessage.create({
      data: {
        connectionId: req.params.id,
        senderId: req.user.id,
        content: content.trim(),
      },
      include: { senderUser: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Notify other party
    const otherId = conn.senderId === req.user.id ? conn.receiverId : conn.senderId;
    await prisma.notification.create({
      data: {
        userId: otherId,
        title: 'New message from Travel Buddy',
        message: `${req.user.name}: ${content.trim().slice(0, 80)}`,
        type: 'BUDDY',
      },
    });

    return res.status(201).json({ message });
  } catch (error) {
    console.error('sendConnectionMessage error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
