import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getModeratorDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const [
      pendingReports,
      verifiedReports,
      rejectedReports,
      escalatedReports,
      totalCommunityPosts,
      pendingPrices,
      recentActions,
      myActionsCount,
    ] = await Promise.all([
      prisma.incidentReport.count({ where: { status: 'PENDING' } }),
      prisma.incidentReport.count({ where: { status: { in: ['VERIFIED', 'ADMIN_VERIFIED'] } } }),
      prisma.incidentReport.count({ where: { status: 'REJECTED' } }),
      prisma.incidentReport.count({ where: { status: 'ESCALATED' } }),
      prisma.communityPost.count(),
      prisma.priceRecord.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.moderationAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          moderator: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      req.user ? prisma.moderationAction.count({ where: { moderatorId: req.user.id } }) : 0,
    ]);

    return res.json({
      stats: {
        pendingReports,
        verifiedReports,
        rejectedReports,
        escalatedReports,
        totalCommunityPosts,
        pendingPrices,
        myActionsCount,
      },
      recentActions,
    });
  } catch (err: any) {
    console.error('getModeratorDashboard error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch dashboard' });
  }
}

export async function getModeratorReports(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, search, page = '1', limit = '25' } = req.query as Record<string, string>;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const where: any = {};
    if (status && status !== 'ALL') {
      if (status === 'VERIFIED' || status === 'ADMIN_VERIFIED') {
        where.status = { in: ['VERIFIED', 'ADMIN_VERIFIED'] };
      } else {
        where.status = status;
      }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.incidentReport.findMany({
        where,
        orderBy: { reportedAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              reputationScore: true,
            },
          },
          city: {
            select: {
              id: true,
              name: true,
              state: true,
            },
          },
          verifications: true,
          flags: true,
        },
      }),
      prisma.incidentReport.count({ where }),
    ]);

    return res.json({
      reports,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err: any) {
    console.error('getModeratorReports error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function moderateReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });

    const { id } = req.params;
    const { action, reason, notes } = req.body;

    const actionMap: Record<string, string> = {
      VERIFY: 'VERIFIED',
      REJECT: 'REJECTED',
      REQUEST_INFO: 'PENDING',
      ESCALATE: 'ESCALATED',
    };

    const newStatus = actionMap[action];
    if (!newStatus) {
      return res.status(400).json({ error: 'Invalid moderation action. Must be VERIFY, REJECT, REQUEST_INFO, or ESCALATE' });
    }

    const [updatedReport, log] = await Promise.all([
      prisma.incidentReport.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.moderationAction.create({
        data: {
          moderatorId: req.user.id,
          action,
          targetEntity: 'INCIDENT',
          targetId: id,
          reason: reason || null,
          notes: notes || null,
        },
      }),
    ]);

    // If report author exists, send notification
    if (updatedReport.reporterId) {
      await prisma.notification.create({
        data: {
          userId: updatedReport.reporterId,
          title: `Incident Report ${newStatus}`,
          message: `Your safety report "${updatedReport.title}" has been reviewed by a moderator and marked as ${newStatus}.`,
          type: 'ALERT',
        },
      }).catch(() => {});
    }

    return res.json({ success: true, report: updatedReport, log });
  } catch (err: any) {
    console.error('moderateReport error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getModeratorCommunity(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = '1', limit = '25', search } = req.query as Record<string, string>;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { destinationName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
          media: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.communityPost.count({ where }),
    ]);

    return res.json({ posts, total, page: parseInt(page, 10) });
  } catch (err: any) {
    console.error('getModeratorCommunity error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function hidePost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id } = req.params;
    const { reason } = req.body;

    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Record moderation action
    await prisma.moderationAction.create({
      data: {
        moderatorId: req.user.id,
        action: 'HIDE_POST',
        targetEntity: 'POST',
        targetId: id,
        reason: reason || 'Inappropriate content',
      },
    });

    // Delete post to remove from community
    await prisma.communityPost.delete({ where: { id } });

    // Notify author
    await prisma.notification.create({
      data: {
        userId: post.userId,
        title: 'Post Removed by Moderator',
        message: `Your post "${post.title}" was removed due to: ${reason || 'Content policy violation'}.`,
        type: 'INFO',
      },
    }).catch(() => {});

    return res.json({ success: true, message: 'Post removed and moderation action logged' });
  } catch (err: any) {
    console.error('hidePost error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function escalatePost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.moderationAction.create({
      data: {
        moderatorId: req.user.id,
        action: 'ESCALATE',
        targetEntity: 'POST',
        targetId: id,
        reason: reason || 'Escalated for senior admin review',
      },
    });

    return res.json({ success: true, message: 'Content escalated to Admin review queue' });
  } catch (err: any) {
    console.error('escalatePost error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getModeratorPrices(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = '1', limit = '25' } = req.query as Record<string, string>;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const [prices, total] = await Promise.all([
      prisma.priceRecord.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
        include: {
          city: { select: { name: true, state: true } },
          submittedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.priceRecord.count(),
    ]);

    return res.json({ prices, total, page: parseInt(page, 10) });
  } catch (err: any) {
    console.error('getModeratorPrices error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function moderatePrice(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { id } = req.params;
    const { action } = req.body; // 'VERIFY' | 'REJECT'

    const price = await prisma.priceRecord.update({
      where: { id },
      data: { verificationStatus: action === 'VERIFY' ? 'VERIFIED' : 'REJECTED' },
    });

    await prisma.moderationAction.create({
      data: {
        moderatorId: req.user.id,
        action: action === 'VERIFY' ? 'VERIFY_PRICE' : 'REJECT_PRICE',
        targetEntity: 'PRICE_RECORD',
        targetId: id,
        reason: req.body.reason || null,
      },
    });

    return res.json({ success: true, price });
  } catch (err: any) {
    console.error('moderatePrice error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getModeratorComplaints(req: AuthenticatedRequest, res: Response) {
  try {
    const complaints = await prisma.incidentFlag.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        incident: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            city: {
              select: { name: true, state: true },
            },
          },
        },
      },
    });

    return res.json({ complaints });
  } catch (err: any) {
    console.error('getModeratorComplaints error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getModeratorHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { page = '1', limit = '30' } = req.query as Record<string, string>;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const [actions, total] = await Promise.all([
      prisma.moderationAction.findMany({
        where: { moderatorId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit, 10),
      }),
      prisma.moderationAction.count({ where: { moderatorId: req.user.id } }),
    ]);

    return res.json({ actions, total, page: parseInt(page, 10) });
  } catch (err: any) {
    console.error('getModeratorHistory error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getModeratorProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });

    const [user, totalActions, recentActions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          location: true,
          aboutMe: true,
          reputationScore: true,
          createdAt: true,
        },
      }),
      prisma.moderationAction.count({ where: { moderatorId: req.user.id } }),
      prisma.moderationAction.findMany({
        where: { moderatorId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return res.json({
      user,
      stats: { totalActions },
      recentActions,
    });
  } catch (err: any) {
    console.error('getModeratorProfile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
