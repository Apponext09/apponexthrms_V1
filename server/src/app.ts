import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cors from 'cors';
import { getEnv } from './config/env';
import { apiLimiter } from './common/middleware/rateLimiter';
import { requestLogger } from './common/middleware/requestLogger';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';
import { asyncHandler } from './common/utils/asyncHandler';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id', 'x-company-id', 'company-id', 'X-Tenant-Id', 'X-Organization-Id', 'X-Request-Id'],
      exposedHeaders: ['Content-Length', 'X-Company-Id', 'x-company-id'],
      maxAge: 86400, // 24 hours
    })
  );

  // Security middleware (after CORS)
  // Helmet provides comprehensive security headers with Swagger UI support
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:5000', 'https:'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    frameguard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Body parsing (50mb limit for logo base64 uploads)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging
  app.use(requestLogger);

  // Serve static uploads directory
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Swagger Documentation Endpoints
  const swaggerCustomOptions = {
    customSiteTitle: 'ApponextHRMS API Docs',
    customCss: '.swagger-ui .topbar { display: block; background-color: #0f172a; } .swagger-ui .topbar .link { color: #fff; font-weight: bold; }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
    },
  };

  app.get(['/swagger.json', '/api-docs.json', '/api/docs.json'], (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  app.use(['/swagger', '/swagger-ui', '/api-docs', '/api/docs', '/api/v1/docs'], swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerCustomOptions));

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
