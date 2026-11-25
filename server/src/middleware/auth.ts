import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_DEV_JWT = 'travel-guardian-secure-jwt-secret-key-2025';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_JWT)) {
  console.warn('⚠️ SECURITY WARNING: Configure a strong custom JWT_SECRET in production environment variables.');
}
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT;

export function generateToken(payload: { id: string; email: string; role: string; name?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthenticatedRequest['user'] {
  return jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'TRAVELER' | 'MODERATOR' | 'ADMIN';
    name: string;
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(allowedRoles: Array<'TRAVELER' | 'MODERATOR' | 'ADMIN'>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      // Revalidate role and active status directly against PostgreSQL to enforce immediate revocation
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, role: true, isActive: true },
      });

      if (!dbUser || !dbUser.isActive) {
        return res.status(403).json({ error: 'Account is inactive or suspended' });
      }

      // Sync fresh database role to request user
      req.user.role = dbUser.role as any;

      if (!allowedRoles.includes(dbUser.role as any)) {
        return res.status(403).json({
          error: `Permission denied. Required role: ${allowedRoles.join(' or ')}`,
        });
      }

      next();
    } catch (err) {
      console.error('requireRole database check error:', err);
      return res.status(500).json({ error: 'Authorization verification failed' });
    }
  };
}
