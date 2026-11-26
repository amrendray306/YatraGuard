import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getCommunityPosts(req: Request, res: Response) {
  try {
    const { city, category, limit = '30' } = req.query;

    const where: any = {};
    if (city && typeof city === 'string' && city !== 'ALL') {
      where.destinationName = { contains: city, mode: 'insensitive' };
    }
    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    const posts = await prisma.communityPost.findMany({
      where,
      take: Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30)),
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            reputationScore: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return res.json({ posts });
  } catch (error) {
    console.error('getCommunityPosts error:', error);
    return res.status(500).json({ error: 'Failed to retrieve community posts' });
  }
}

export async function createCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to create a post' });
    }

    const { title, content, destinationName, category, imageUrl, media: incomingMedia } = req.body;
    if (!title?.trim() || !content?.trim() || !destinationName?.trim()) {
      return res.status(400).json({ error: 'Title, content and destination are required' });
    }

    const firstImageUrl = imageUrl || (Array.isArray(incomingMedia) && incomingMedia[0]?.url) || null;

    const post = await prisma.communityPost.create({
      data: {
        userId,
        title: String(title).trim().slice(0, 180),
        content: String(content).trim().slice(0, 5000),
        destinationName: String(destinationName).trim().slice(0, 120),
        category: category || 'STORY',
        imageUrl: firstImageUrl,
        ...(Array.isArray(incomingMedia) && incomingMedia.length > 0
          ? {
              media: {
                create: incomingMedia.slice(0, 8).map((m: any, idx: number) => ({
                  userId,
                  url: m.url,
                  publicId: m.publicId || null,
                  mimeType: m.mimeType || 'image/jpeg',
                  fileSize: m.fileSize || 0,
                  sortOrder: idx,
                })),
              },
            }
          : {}),
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
        comments: true,
      },
    });

    return res.status(201).json({
      message: 'Post created successfully',
      post,
    });
  } catch (error) {
    console.error('createCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to create community post' });
  }
}

export async function updateCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.communityPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you can only edit your own posts' });
    }

    const { title, content, destinationName, category } = req.body;
    const updated = await prisma.communityPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim().slice(0, 180) }),
        ...(content !== undefined && { content: String(content).trim().slice(0, 5000) }),
        ...(destinationName !== undefined && { destinationName: String(destinationName).trim().slice(0, 120) }),
        ...(category !== undefined && { category }),
      },
    });

    return res.json({ message: 'Post updated', post: updated });
  } catch (error) {
    console.error('updateCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to update community post' });
  }
}

export async function deleteCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const existing = await prisma.communityPost.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const isStaff = ['ADMIN', 'MODERATOR'].includes(req.user.role);
    if (existing.userId !== req.user.id && !isStaff) {
      return res.status(403).json({ error: 'Forbidden: you cannot delete another user’s post' });
    }

    await prisma.communityPost.delete({ where: { id } });
    return res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('deleteCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

export async function reportCommunityPost(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to report content' });
    }

    const { id } = req.params;
    const { reason = 'INAPPROPRIATE', details } = req.body;
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.moderationAction.create({
      data: {
        moderatorId: req.user.id,
        action: 'FLAG_CONTENT',
        targetEntity: 'POST',
        targetId: id,
        reason: String(reason).slice(0, 120),
        notes: details ? String(details).trim().slice(0, 500) : `Reported by traveler (${req.user.name})`,
      },
    });

    return res.status(201).json({ message: 'Content flagged for moderator review' });
  } catch (error) {
    console.error('reportCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to flag community post' });
  }
}

export async function likeCommunityPost(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const post = await prisma.communityPost.update({
      where: { id },
      data: {
        likesCount: { increment: 1 },
      },
    });

    return res.json({
      message: 'Post liked',
      likesCount: post.likesCount,
    });
  } catch (error) {
    console.error('likeCommunityPost error:', error);
    return res.status(500).json({ error: 'Failed to like post' });
  }
}

export async function addPostComment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to comment' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        userId,
        content: content.trim().slice(0, 1500),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Comment added successfully',
      comment,
    });
  } catch (error) {
    console.error('addPostComment error:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}

export async function getTravelBuddies(req: Request, res: Response) {
  try {
    const { city, style } = req.query;

    const where: any = { status: 'OPEN' };
    if (city && typeof city === 'string' && city !== 'ALL') {
      where.destinationCity = { contains: city, mode: 'insensitive' };
    }
    if (style && typeof style === 'string' && style !== 'ALL') {
      where.travelStyle = style;
    }

    const buddies = await prisma.travelBuddyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
            travelPreferences: true,
            reputationScore: true,
          },
        },
      },
    });

    return res.json({ buddies });
  } catch (error) {
    console.error('getTravelBuddies error:', error);
    return res.status(500).json({ error: 'Failed to retrieve travel buddies' });
  }
}

export async function createTravelBuddy(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { destinationCity, startDate, endDate, travelStyle, notes } = req.body;
    if (!destinationCity || !startDate || !endDate) {
      return res.status(400).json({ error: 'Destination, start date and end date are required' });
    }

    const request = await prisma.travelBuddyRequest.create({
      data: {
        senderId: userId,
        destinationCity,
        startDate,
        endDate,
        travelStyle: travelStyle || 'BALANCED',
        notes: notes || null,
        status: 'OPEN',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Travel buddy request created successfully',
      request,
    });
  } catch (error) {
    console.error('createTravelBuddy error:', error);
    return res.status(500).json({ error: 'Failed to create travel buddy request' });
  }
}
