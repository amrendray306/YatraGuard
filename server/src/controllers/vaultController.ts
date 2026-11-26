import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { privateVaultDir } from '../services/uploadService.js';

export const VAULT_DOC_TYPES = [
  'TICKET',
  'HOTEL',
  'ID_REF',
  'PERMIT',
  'INSURANCE',
  'RESERVATION',
] as const;

export async function getVaultDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const docs = await prisma.documentRecord.findMany({
      where: { userId: req.user.id },
      include: {
        trip: { select: { id: true, title: true, destinationCity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = docs.map((d) => ({
      id: d.id,
      tripId: d.tripId,
      trip: d.trip,
      title: d.title,
      docType: d.docType,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      notes: d.notes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return res.json({ documents: sanitized });
  } catch (error) {
    console.error('Get vault documents error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vault documents' });
  }
}

export async function uploadVaultDocument(req: AuthenticatedRequest, res: Response) {
  const file = req.file;
  const removeUploadedFile = () => {
    if (file?.filename) {
      const p = path.join(privateVaultDir, path.basename(file.filename));
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  };

  try {
    if (!req.user) {
      removeUploadedFile();
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Document file is required (PDF, JPEG, PNG, or WebP up to 5MB)' });
    }

    const { title, docType = 'TICKET', tripId, notes } = req.body;
    if (!title?.trim()) {
      removeUploadedFile();
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!VAULT_DOC_TYPES.includes(docType as any)) {
      removeUploadedFile();
      return res.status(400).json({ error: 'Invalid document type' });
    }

    let verifiedTripId: string | null = null;
    if (tripId && String(tripId).trim()) {
      const trip = await prisma.trip.findUnique({ where: { id: String(tripId).trim() } });
      if (!trip || trip.userId !== req.user.id) {
        removeUploadedFile();
        return res.status(403).json({ error: 'Invalid or unauthorized trip association' });
      }
      verifiedTripId = trip.id;
    }

    const record = await prisma.documentRecord.create({
      data: {
        userId: req.user.id,
        tripId: verifiedTripId,
        title: title.trim(),
        docType,
        originalFilename: path.basename(file.originalname).slice(0, 180),
        storageKey: path.basename(file.filename),
        mimeType: file.mimetype,
        fileSize: file.size,
        notes: notes?.trim() || null,
      },
      include: {
        trip: { select: { id: true, title: true, destinationCity: true } },
      },
    });

    return res.status(201).json({
      message: 'Document stored in private encrypted vault',
      document: {
        id: record.id,
        tripId: record.tripId,
        trip: record.trip,
        title: record.title,
        docType: record.docType,
        originalFilename: record.originalFilename,
        mimeType: record.mimeType,
        fileSize: record.fileSize,
        notes: record.notes,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    removeUploadedFile();
    console.error('Upload vault document error:', error);
    return res.status(500).json({ error: 'Failed to store travel document' });
  }
}

export async function downloadVaultDocument(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const record = await prisma.documentRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Strict ownership enforcement (IDOR protection)
    if (record.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this private document' });
    }

    const safeFileName = path.basename(record.storageKey);
    const fullPath = path.join(privateVaultDir, safeFileName);
    if (!fullPath.startsWith(privateVaultDir) || !fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Stored file not found on server' });
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${record.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    return res.sendFile(fullPath);
  } catch (error) {
    console.error('Download vault document error:', error);
    return res.status(500).json({ error: 'Failed to stream private document' });
  }
}

export async function deleteVaultDocument(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const record = await prisma.documentRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (record.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you do not own this private document' });
    }

    const safeFileName = path.basename(record.storageKey);
    const fullPath = path.join(privateVaultDir, safeFileName);
    if (fullPath.startsWith(privateVaultDir) && fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }

    await prisma.documentRecord.delete({ where: { id } });
    return res.json({ message: 'Private document permanently deleted' });
  } catch (error) {
    console.error('Delete vault document error:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
}
