import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.js';
import { securityHeaders, globalApiLimiter } from './middleware/security.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 1. Production Security Headers (OWASP Hardened CSP, X-Frame-Options, nosniff)
app.use(securityHeaders);

// 2. Strict / Configurable CORS
const normalizeOrigin = (url: string) => url.trim().replace(/\/+$/, '');
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(normalizeOrigin).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

if (process.env.RENDER_EXTERNAL_URL) {
  envOrigins.push(normalizeOrigin(process.env.RENDER_EXTERNAL_URL));
}
if (process.env.FRONTEND_URL) {
  envOrigins.push(normalizeOrigin(process.env.FRONTEND_URL));
}

const allowedOrigins = Array.from(new Set(envOrigins));
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

app.use(
  cors({
    origin: (origin, callback) => {
      const cleanOrigin = origin ? normalizeOrigin(origin) : '';
      const isVercelPreview =
        allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin);
      // Allow requests with no origin (mobile apps, curl, server-to-server) or matching allowed list
      if (!cleanOrigin || allowedOrigins.includes(cleanOrigin) || isVercelPreview || NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        console.warn(`⚠️ Blocked CORS origin: ${origin}`);
        callback(new Error('Blocked by CORS policy: Origin not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

// 3. Body Parser with bounded payload limits (prevent memory exhaust DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Global API Rate Limiter
app.use('/api', globalApiLimiter);

// 5. Health Check & Readiness Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'YatraGuard API - Travel Safety & Local Transportation Intelligence Platform',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY,
    geminiLive: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

// 6. Mount Primary API Router
app.use('/api', apiRouter);

// 6b. Serve uploaded static media if using local disk fallback
const localUploadsDir = path.resolve(process.cwd(), 'public/uploads');
fs.mkdirSync(localUploadsDir, { recursive: true });
app.use('/uploads', express.static(localUploadsDir));

// 7. Unified Production Serving: Serve client SPA static files if built
const possibleDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
];
const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  // Cache static assets (CSS, JS, fonts) with immutable headers
  app.use(
    express.static(clientDistPath, {
      maxAge: NODE_ENV === 'production' ? '7d' : 0,
      etag: true,
    })
  );

  // Client-side SPA routing fallback (index.html)
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Standalone API 404 Handler when frontend is running on separate dev server
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });
}

// 8. Global Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: NODE_ENV === 'production' && status === 500
      ? 'An unexpected error occurred. Our engineering team has been notified.'
      : err?.message || 'Unknown error',
  });
});

// 9. Server Initialization & Fail-Safe Verification
const server = app.listen(PORT, () => {
  console.log(`🛡️  YatraGuard Server running on http://localhost:${PORT} [${NODE_ENV}]`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  if (clientDistPath) {
    console.log(`🌐 Unified SPA Serving: Enabled (${clientDistPath})`);
  } else {
    console.log(`ℹ️  Running in API-only mode (Client dist not detected; run 'npm run build:client' to bundle)`);
  }
});

// 10. Graceful Shutdown Handlers (Kubernetes / Docker SIGTERM, local SIGINT)
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 ${signal} received. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed. Clean process termination.');
    process.exit(0);
  });

  // Force shutdown if connections do not close within 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

