import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthenticatedRequest, generateToken } from '../middleware/auth.js';

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

    // Password strength validation (minimum 8 characters for production accounts)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        error: 'A verified Google ID token is required. Use the official Google Sign-In button.',
      });
    }

    let verifyRes: globalThis.Response;
    try {
      verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
    } catch (netErr) {
      console.error('Google tokeninfo network error:', netErr);
      return res.status(503).json({
        error: 'Unable to reach Google authentication servers. Please try again.',
      });
    }

    if (!verifyRes.ok) {
      return res.status(401).json({
        error: 'Invalid or expired Google credential token.',
      });
    }

    const payload: any = await verifyRes.json();
    const validIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(payload?.iss);
    const emailVerified = payload?.email_verified === true || payload?.email_verified === 'true';
    const configuredClientId = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!payload?.email || !emailVerified || !validIssuer) {
      return res.status(401).json({
        error: 'Google account email verification failed.',
      });
    }

    if (configuredClientId && payload.aud !== configuredClientId) {
      return res.status(401).json({
        error: 'Google OAuth client audience mismatch.',
      });
    }

    const verifiedEmail = payload.email.toLowerCase().trim();
    const verifiedName = payload.name || verifiedEmail.split('@')[0] || 'Google Traveler';
    const verifiedPicture = payload.picture || null;
    const verifiedGoogleId = payload.sub || null;

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
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Your account has been deactivated. Please contact support.',
        });
      }
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

    const rawResetToken = crypto.randomBytes(24).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpiry: expiry,
      },
    });

    let emailDelivery: 'SENT' | 'DEV_CONSOLE' | 'UNCONFIGURED' =
      process.env.NODE_ENV !== 'production' ? 'DEV_CONSOLE' : 'UNCONFIGURED';

    if (process.env.RESEND_API_KEY) {
      try {
        const fallbackOrigin = process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() || 'http://localhost:3000';
        const frontendUrl = (process.env.FRONTEND_URL || fallbackOrigin).replace(/\/+$/, '');
        const resetUrl = `${frontendUrl}/forgot-password?token=${rawResetToken}`;
        const emailFrom = process.env.EMAIL_FROM || 'YatraGuard Security <onboarding@resend.dev>';
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [cleanEmail],
            subject: 'YatraGuard Password Reset Request',
            text: `Reset your YatraGuard password (expires in 15 minutes): ${resetUrl}\n\nReset Code: ${rawResetToken}`,
          }),
        });
        if (mailRes.ok) {
          emailDelivery = 'SENT';
        } else {
          console.warn('Password reset email dispatch returned HTTP', mailRes.status);
        }
      } catch (mailErr) {
        console.warn('Password reset email dispatch error:', mailErr);
      }
    }

    if (process.env.NODE_ENV !== 'production' && emailDelivery !== 'SENT') {
      console.info(`[DEV Password Reset] Token generated for ${cleanEmail} (expires 15m): ${rawResetToken}`);
    }

    // Security: NEVER return raw password reset tokens in HTTP responses
    return res.json({
      message: 'If an account exists for this email, password reset instructions have been issued.',
      emailDelivery,
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

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const hashedIncoming = crypto.createHash('sha256').update(String(resetToken).trim()).digest('hex');
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedIncoming,
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
