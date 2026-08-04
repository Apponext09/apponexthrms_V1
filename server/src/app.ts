import express from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import { getEnv } from './config/env';
import { apiLimiter } from './common/middleware/rateLimiter';
import { requestLogger } from './common/middleware/requestLogger';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';
import { asyncHandler } from './common/utils/asyncHandler';
import v1Routes from './routes/v1';

const env = getEnv();

/**
 * Create Express app
 */
export function createApp() {
  const app = express();

  // Parse CORS origins
  const corsOrigins = env.CORS_ORIGIN
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);

  console.log('CORS Origins configured:', corsOrigins);

  // CORS must be applied BEFORE helmet
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile or curl)
        if (!origin) return callback(null, true);

        if (corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS request from unauthorized origin: ${origin}`);
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length'],
      maxAge: 86400, // 24 hours
    })
  );

  // Security middleware (after CORS)
  // Helmet provides comprehensive security headers
  app.use(helmet({
    // Content Security Policy - prevent XSS and other injection attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Enable XSS filter
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // HSTS - enforce HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Body parsing
  app.use(express.json({ limit: env.MAX_REQUEST_SIZE }));
  app.use(express.urlencoded({ limit: env.MAX_REQUEST_SIZE, extended: true }));

  // Request logging
  app.use(requestLogger);

  // Serve static uploads directory
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Rate limiting
  app.use(apiLimiter);

  /**
   * API v1 routes
   */
  app.use('/api/v1', v1Routes);

  /**
   * 404 handler (must come after all routes)
   */
  app.use(notFoundHandler);

  /**
   * Global error handler (must come last)
   */
  app.use(errorHandler);

  return app;
}
