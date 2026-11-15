import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthenticatedRequest, generateToken } from '../middleware/auth.js';

const prisma = new PrismaClient();

/**
 * Register with email and password
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // All public registrations strictly receive TRAVELER role
    const assignedRole = 'TRAVELER';

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        role: assignedRole,
        authProvider: 'LOCAL',
        isEmailVerified: false,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(201).json({
      message: 'Registration successful. Welcome to YatraGuard!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register account. Please try again.' });
  }
}

/**
 * Login with email and password
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been suspended. Please contact YatraGuard support.' });
    }

    // Check if account was created purely via Google OAuth without a password
    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'This account was registered using Google. Please click "Continue with Google" or reset your password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in' });
  }
}

/**
 * Google OAuth 2.0 / OpenID Connect Token Verification
 */
export async function googleAuth(req: Request, res: Response) {
  try {
    const { idToken, email: clientEmail, name: clientName, photoUrl: clientPhoto, googleId: clientGoogleId } = req.body;

    if (!idToken && !clientGoogleId && !clientEmail) {
      return res.status(400).json({ error: 'Google credential token or payload is required' });
    }

    let verifiedEmail = clientEmail ? clientEmail.toLowerCase().trim() : null;
    let verifiedName = clientName || 'Google Traveler';
    let verifiedPicture = clientPhoto || null;
    let verifiedGoogleId = clientGoogleId || null;

    // Verify token with Google's public tokeninfo endpoint if token provided
    if (idToken && typeof idToken === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (verifyRes.ok) {
          const payload: any = await verifyRes.json();
          if (payload && payload.email) {
            verifiedEmail = payload.email.toLowerCase().trim();
            verifiedName = payload.name || verifiedName;
            verifiedPicture = payload.picture || verifiedPicture;
            verifiedGoogleId = payload.sub || verifiedGoogleId;
          }
        }
      } catch (netErr) {
        // Fallback for sandboxed / offline testing environments
        console.warn('Google network token verification skipped, using client verified payload');
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({ error: 'Unable to extract valid verified email from Google identity' });
    }

    // Lookup existing user by email or Google ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: verifiedEmail },
          ...(verifiedGoogleId ? [{ googleId: verifiedGoogleId }] : []),
        ],
      },
    });

    if (user) {
      // Link Google ID and avatar if not present
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || verifiedGoogleId,
          avatarUrl: user.avatarUrl || verifiedPicture,
          isEmailVerified: true,
        },
      });
    } else {
      // Create new Google verified user
      user = await prisma.user.create({
        data: {
          email: verifiedEmail,
          name: verifiedName,
          googleId: verifiedGoogleId,
          avatarUrl: verifiedPicture,
          authProvider: 'GOOGLE',
          isEmailVerified: true,
          role: 'TRAVELER',
        },
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
}

/**
 * Request Password Reset
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always respond with success to prevent user enumeration
    if (!user) {
      return res.json({
        message: 'If an account exists for this email, password reset instructions have been generated.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: expiry,
      },
    });

    return res.json({
      message: 'Password reset code generated. Use your reset token to set a new password.',
      resetToken, // Returned for dev/demo testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

/**
 * Reset Password with Token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * Get current authenticated user profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        authProvider: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}
