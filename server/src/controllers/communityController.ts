import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

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
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
      include: {
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
    const { title, content, destinationName, category, imageUrl } = req.body;

    if (!title || !content || !destinationName) {
      return res.status(400).json({ error: 'Title, content and destination are required' });
    }

    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const post = await prisma.communityPost.create({
      data: {
        userId,
        title,
        content,
        destinationName,
        category: category || 'STORY',
        imageUrl: imageUrl || null,
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

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: id,
        userId,
        content: content.trim(),
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
            email: true,
            phone: true,
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
    const { destinationCity, startDate, endDate, travelStyle, notes } = req.body;

    if (!destinationCity || !startDate || !endDate) {
      return res.status(400).json({ error: 'Destination, start date and end date are required' });
    }

    let userId = req.user?.id;
    if (!userId) {
      const demoTraveler = await prisma.user.findFirst({ where: { role: 'TRAVELER' } });
      userId = demoTraveler?.id;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
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
