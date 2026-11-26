import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

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
    // Exclude the requesting user's own plans and any blocked travelers
    if (req.user?.id) {
      const blocks = await prisma.userSafetyBlock
        .findMany({
          where: { OR: [{ blockerId: req.user.id }, { blockedUserId: req.user.id }] },
          select: { blockerId: true, blockedUserId: true },
        })
        .catch(() => []);
      const excludedIds = new Set<string>([req.user.id]);
      for (const b of blocks) {
        excludedIds.add(b.blockerId);
        excludedIds.add(b.blockedUserId);
      }
      where.senderId = { notIn: Array.from(excludedIds) };
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

// ─── PUT /api/buddy/plans/:id/status ────────────────────────────────────────
export async function updateBuddyPlanStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { status } = req.body;
    const allowed = ['OPEN', 'TRAVELLING', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const plan = await prisma.travelBuddyRequest.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Travel plan not found' });
    if (plan.senderId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const updated = await prisma.travelBuddyRequest.update({
      where: { id: req.params.id },
      data: { status },
    });

    return res.json({ message: `Travel plan marked as ${status}`, plan: updated });
  } catch (error) {
    console.error('updateBuddyPlanStatus error:', error);
    return res.status(500).json({ error: 'Failed to update travel plan status' });
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

    const blocked = await prisma.userSafetyBlock.findFirst({
      where: {
        OR: [
          { blockerId: req.user.id, blockedUserId: plan.senderId },
          { blockerId: plan.senderId, blockedUserId: req.user.id },
        ],
      },
    });
    if (blocked) {
      return res.status(403).json({ error: 'Cannot send connection request due to a safety block' });
    }

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

    const otherUserId = conn.senderId === req.user.id ? conn.receiverId : conn.senderId;
    const blocked = await prisma.userSafetyBlock.findFirst({
      where: {
        OR: [
          { blockerId: req.user.id, blockedUserId: otherUserId },
          { blockerId: otherUserId, blockedUserId: req.user.id },
        ],
      },
    });
    if (blocked) {
      return res.status(403).json({ error: 'Messaging unavailable due to a safety block' });
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

    const otherUserId = conn.senderId === req.user.id ? conn.receiverId : conn.senderId;
    const blocked = await prisma.userSafetyBlock.findFirst({
      where: {
        OR: [
          { blockerId: req.user.id, blockedUserId: otherUserId },
          { blockerId: otherUserId, blockedUserId: req.user.id },
        ],
      },
    });
    if (blocked) {
      return res.status(403).json({ error: 'Messaging unavailable due to a safety block' });
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

// ─── MODULE 12: TRAVEL GROUPS & SAFETY BLOCK CONTROLS ─────────────────────────
export async function getTravelGroups(req: AuthenticatedRequest, res: Response) {
  try {
    const { destination, mine } = req.query;
    const where: any = {};
    if (destination && typeof destination === 'string' && destination.trim() && destination !== 'ALL') {
      where.destinationCity = { contains: destination.trim(), mode: 'insensitive' };
    }
    if (mine === 'true' && req.user) {
      where.OR = [
        { creatorId: req.user.id },
        { members: { some: { userId: req.user.id } } },
      ];
    }

    const groups = await prisma.travelGroup.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return res.json({ groups });
  } catch (error) {
    console.error('getTravelGroups error:', error);
    return res.status(500).json({ error: 'Failed to load travel groups' });
  }
}

export async function createTravelGroup(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { title, destinationCity, originCity, startDate, endDate, maxMembers = 6, budgetNote, itineraryNotes } = req.body;
    if (!title?.trim() || !destinationCity?.trim() || !startDate || !endDate) {
      return res.status(400).json({ error: 'Group title, destination, startDate, and endDate are required' });
    }

    const group = await prisma.travelGroup.create({
      data: {
        creatorId: req.user.id,
        title: title.trim(),
        destinationCity: destinationCity.trim(),
        originCity: originCity?.trim() || null,
        startDate,
        endDate,
        maxMembers: Math.max(2, Math.min(20, parseInt(maxMembers, 10) || 6)),
        budgetNote: budgetNote?.trim() || null,
        itineraryNotes: itineraryNotes?.trim() || null,
        members: {
          create: { userId: req.user.id, role: 'CREATOR' },
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    return res.status(201).json({ message: 'Travel group created', group });
  } catch (error) {
    console.error('createTravelGroup error:', error);
    return res.status(500).json({ error: 'Failed to create travel group' });
  }
}

export async function joinTravelGroup(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const group = await prisma.travelGroup.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!group) return res.status(404).json({ error: 'Travel group not found' });
    if (group.members.some((m) => m.userId === req.user!.id)) {
      return res.json({ message: 'Already a member of this group' });
    }
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'Travel group is already at full capacity' });
    }

    await prisma.travelGroupMember.create({
      data: { groupId: id, userId: req.user.id, role: 'MEMBER' },
    });

    return res.status(201).json({ message: 'Joined travel group' });
  } catch (error) {
    console.error('joinTravelGroup error:', error);
    return res.status(500).json({ error: 'Failed to join travel group' });
  }
}

export async function leaveTravelGroup(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const group = await prisma.travelGroup.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Travel group not found' });
    if (group.creatorId === req.user.id) {
      return res.status(400).json({ error: 'Group creator cannot leave without removing group' });
    }

    await prisma.travelGroupMember.deleteMany({
      where: { groupId: id, userId: req.user.id },
    });
    return res.json({ message: 'Left travel group' });
  } catch (error) {
    console.error('leaveTravelGroup error:', error);
    return res.status(500).json({ error: 'Failed to leave travel group' });
  }
}

export async function updateGroupNotes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const member = await prisma.travelGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: 'Only group members can update shared notes' });

    const { itineraryNotes, sharedExpenseNote, budgetNote } = req.body;
    const updated = await prisma.travelGroup.update({
      where: { id },
      data: {
        ...(itineraryNotes !== undefined && { itineraryNotes }),
        ...(sharedExpenseNote !== undefined && { sharedExpenseNote }),
        ...(budgetNote !== undefined && { budgetNote }),
      },
    });

    return res.json({ message: 'Group notes updated', group: updated });
  } catch (error) {
    console.error('updateGroupNotes error:', error);
    return res.status(500).json({ error: 'Failed to update group notes' });
  }
}

export async function getGroupMessages(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const member = await prisma.travelGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: 'Join the group to view group messages' });

    const messages = await prisma.travelGroupMessage.findMany({
      where: { groupId: id },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return res.json({ messages });
  } catch (error) {
    console.error('getGroupMessages error:', error);
    return res.status(500).json({ error: 'Failed to load group messages' });
  }
}

export async function sendGroupMessage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

    const member = await prisma.travelGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: 'Join the group to post messages' });

    const msg = await prisma.travelGroupMessage.create({
      data: {
        groupId: id,
        senderId: req.user.id,
        content: content.trim().slice(0, 800),
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return res.status(201).json({ message: msg });
  } catch (error) {
    console.error('sendGroupMessage error:', error);
    return res.status(500).json({ error: 'Failed to post group message' });
  }
}

export async function blockSafetyUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const { blockedUserId, reason } = req.body;
    if (!blockedUserId || blockedUserId === req.user.id) {
      return res.status(400).json({ error: 'Valid target user ID required' });
    }

    const block = await prisma.userSafetyBlock.upsert({
      where: { blockerId_blockedUserId: { blockerId: req.user.id, blockedUserId } },
      create: { blockerId: req.user.id, blockedUserId, reason: reason?.trim() || null },
      update: { reason: reason?.trim() || null },
    });

    return res.status(201).json({ message: 'User blocked from matching & messaging you', block });
  } catch (error) {
    console.error('blockSafetyUser error:', error);
    return res.status(500).json({ error: 'Failed to block user' });
  }
}

export async function getBlockedSafetyUsers(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const blocks = await prisma.userSafetyBlock.findMany({
      where: { blockerId: req.user.id },
      include: { blockedUser: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ blocks });
  } catch (error) {
    console.error('getBlockedSafetyUsers error:', error);
    return res.status(500).json({ error: 'Failed to load blocked users' });
  }
}

export async function unblockSafetyUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    await prisma.userSafetyBlock.deleteMany({
      where: { blockerId: req.user.id, blockedUserId: req.params.blockedUserId },
    });
    return res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error('unblockSafetyUser error:', error);
    return res.status(500).json({ error: 'Failed to unblock user' });
  }
}

export async function reportSafetyUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const { reportedUserId, reason, notes } = req.body;
    if (!reportedUserId || reportedUserId === req.user.id) {
      return res.status(400).json({ error: 'Valid target user ID required' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    const action = await prisma.moderationAction.create({
      data: {
        moderatorId: req.user.id,
        action: 'REPORT_USER',
        targetEntity: 'USER',
        targetId: reportedUserId,
        reason: String(reason).trim().slice(0, 300),
        notes: notes ? String(notes).trim().slice(0, 800) : null,
      },
    });

    return res.status(201).json({ message: 'Safety report submitted for moderator review', action });
  } catch (error) {
    console.error('reportSafetyUser error:', error);
    return res.status(500).json({ error: 'Failed to submit safety report' });
  }
}

export async function submitBuddyFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const conn = await prisma.buddyConnection.findUnique({
      where: { id: req.params.id },
      include: { request: true },
    });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    if (conn.senderId !== req.user.id && conn.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (conn.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'Feedback is only available for accepted buddies' });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.feedback || '').trim().slice(0, 500);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const otherId = conn.senderId === req.user.id ? conn.receiverId : conn.senderId;
    const reputationDelta = rating >= 4 ? 2 : rating <= 2 ? -1 : 0;

    await Promise.all([
      reputationDelta !== 0
        ? prisma.user.update({
            where: { id: otherId },
            data: { reputationScore: { increment: reputationDelta } },
          })
        : Promise.resolve(null),
      prisma.notification.create({
        data: {
          userId: otherId,
          title: `Trip Feedback Received (${rating}/5 ★)`,
          message: comment
            ? `${req.user.name} left feedback for ${conn.request.destinationCity}: "${comment}"`
            : `${req.user.name} rated your ${conn.request.destinationCity} travel experience ${rating}/5.`,
          type: 'BUDDY',
        },
      }),
    ]);

    return res.status(201).json({ message: 'Companion feedback submitted' });
  } catch (error) {
    console.error('submitBuddyFeedback error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
}
