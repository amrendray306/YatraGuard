import { Request, Response, NextFunction } from 'express';

/**
 * Production Security Headers Middleware
 * Implements OWASP recommended security headers:
 * - Content-Security-Policy (CSP)
 * - Anti-clickjacking (X-Frame-Options)
 * - Anti-MIME sniffing (X-Content-Type-Options)
 * - Referrer Policy
 * - Permissions Policy
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking by denying iframe embedding
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter in browsers that support it
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Protect referrer info across origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser permissions/features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // Strict Content Security Policy allowing Google OAuth & Map assets
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com https://images.unsplash.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://res.cloudinary.com",
    "connect-src 'self' https://* http://localhost:* http://127.0.0.1:* ws://* wss://*",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Remove Express identifier header
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * High-performance, zero-dependency sliding window rate limiter
 * Protects APIs from brute-force attacks, DDoS, and API quota exhaustion.
 */
interface RateLimitRecord {
  timestamps: number[];
}

export function createRateLimiter(options: {
  windowMs: number; // Duration of window in milliseconds
  maxRequests: number; // Max requests allowed per IP in window
  message?: string; // Error message
  skipSuccessfulGets?: boolean;
}) {
  const ipStore = new Map<string, RateLimitRecord>();

  // Cleanup stale IPs every 5 minutes to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < options.windowMs);
      if (record.timestamps.length === 0) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // In local dev or tests, allow bypass if explicitly flagged
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    let record = ipStore.get(clientIp);

    if (!record) {
      record = { timestamps: [] };
      ipStore.set(clientIp, record);
    }

    // Filter to requests within current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < options.windowMs);

    const remaining = Math.max(0, options.maxRequests - record.timestamps.length);
    const resetTimeSec = Math.ceil(options.windowMs / 1000);

    res.setHeader('X-RateLimit-Limit', options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTimeSec.toString());

    if (record.timestamps.length >= options.maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'You have exceeded the maximum request limit. Please wait before retrying.',
        retryAfterSeconds: Math.ceil((record.timestamps[0] + options.windowMs - now) / 1000),
      });
    }

    record.timestamps.push(now);
    next();
  };
}

// Pre-configured rate limiters
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 requests per minute
  message: 'Global API rate limit exceeded. Please slow down your requests.',
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 attempts per 15 min per IP
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

export const aiAssistantLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 25, // 25 queries per 5 min per IP
  message: 'AI Travel Guardian request limit reached. Please wait a few moments before asking another question.',
});

export const emergencyLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  message: 'Emergency SOS rate limit warning. Please wait before triggering another dispatch log.',
});

