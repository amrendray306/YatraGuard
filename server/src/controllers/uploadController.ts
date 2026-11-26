import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isCloudinaryConfigured, deleteStoredImage } from '../services/uploadService.js';

function buildLocalUploadUrl(filename: string): string {
  const publicBase = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '')
    .trim()
    .replace(/\/+$/, '');
  return publicBase ? `${publicBase}/uploads/${filename}` : `/uploads/${filename}`;
}

export async function uploadProfileImage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const file = req.file as any;
    // If Cloudinary is used, path contains secure URL. Otherwise construct environment-safe URL
    let url: string = file.path || file.secure_url || '';
    let publicId: string | undefined = file.filename || file.public_id;

    if (!isCloudinaryConfigured()) {
      url = buildLocalUploadUrl(file.filename);
      publicId = file.filename;
    }

    // Check if user already had a profile image
    const existing = await prisma.profileImage.findUnique({
      where: { userId: req.user.id },
    });

    if (existing?.publicId) {
      await deleteStoredImage(existing.publicId);
    }

    // Upsert ProfileImage model
    const profileImg = await prisma.profileImage.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        url,
        publicId: publicId || null,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
      update: {
        url,
        publicId: publicId || null,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    // Update avatarUrl in User model
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    return res.json({
      success: true,
      url,
      user: updatedUser,
      profileImage: profileImg,
      provider: isCloudinaryConfigured() ? 'cloudinary' : 'local_storage',
    });
  } catch (err: any) {
    console.error('uploadProfileImage error:', err);
    return res.status(500).json({ error: err.message || 'Profile upload failed' });
  }
}

export async function deleteProfileImage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existing = await prisma.profileImage.findUnique({
      where: { userId: req.user.id },
    });

    if (existing?.publicId) {
      await deleteStoredImage(existing.publicId);
    }

    if (existing) {
      await prisma.profileImage.delete({
        where: { userId: req.user.id },
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: null },
    });

    return res.json({ success: true, message: 'Profile image removed' });
  } catch (err: any) {
    console.error('deleteProfileImage error:', err);
    return res.status(500).json({ error: err.message || 'Delete failed' });
  }
}

export async function uploadCommunityImages(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const files = req.files as any[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    const isCloud = isCloudinaryConfigured();

    const mediaItems = files.map((f, index) => {
      let url = f.path || f.secure_url || '';
      let publicId = f.filename || f.public_id;
      if (!isCloud) {
        url = buildLocalUploadUrl(f.filename);
        publicId = f.filename;
      }
      return {
        url,
        publicId,
        mimeType: f.mimetype,
        fileSize: f.size,
        sortOrder: index,
      };
    });

    return res.json({
      success: true,
      images: mediaItems,
      provider: isCloud ? 'cloudinary' : 'local_storage',
    });
  } catch (err: any) {
    console.error('uploadCommunityImages error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}

export async function adminDeleteImage(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { id } = req.params; // media item ID or image id
    // Try to find in PostMedia
    const postMedia = await prisma.postMedia.findUnique({ where: { id } });
    if (postMedia) {
      if (postMedia.publicId) {
        await deleteStoredImage(postMedia.publicId);
      }
      await prisma.postMedia.delete({ where: { id } });

      // Record moderation action
      await prisma.moderationAction.create({
        data: {
          moderatorId: req.user.id,
          action: 'REMOVE_IMAGE',
          targetEntity: 'POST_MEDIA',
          targetId: id,
          reason: req.body.reason || 'Content policy violation',
        },
      });

      return res.json({ success: true, message: 'Image removed from post' });
    }

    // Try to find in ProfileImage
    const profileImg = await prisma.profileImage.findUnique({ where: { id } });
    if (profileImg) {
      if (profileImg.publicId) {
        await deleteStoredImage(profileImg.publicId);
      }
      await prisma.user.update({
        where: { id: profileImg.userId },
        data: { avatarUrl: null },
      });
      await prisma.profileImage.delete({ where: { id } });

      // Record moderation action
      await prisma.moderationAction.create({
        data: {
          moderatorId: req.user.id,
          action: 'REMOVE_AVATAR',
          targetEntity: 'PROFILE_IMAGE',
          targetId: id,
          reason: req.body.reason || 'Inappropriate profile image',
        },
      });

      return res.json({ success: true, message: 'User profile image removed' });
    }

    return res.status(404).json({ error: 'Image resource not found' });
  } catch (err: any) {
    console.error('adminDeleteImage error:', err);
    return res.status(500).json({ error: err.message });
  }
}
