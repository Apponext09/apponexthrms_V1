import http from 'http';
// reload trigger comment #38 - departments table schema repair (colour, color, email, is_active)
import { Server } from 'socket.io';
import fs from 'fs';
import { createApp } from './app';
import { getEnv } from './config/env';
import { getLogger, logger } from '@/common/lib/logger';
import { initializeKnex, closeKnex, getKnex } from './db/knex';
import { initializeNotificationSocket } from './realtime/notification.socket';
import { initializeLiveTrackingSocket } from './modules/Livetracking/sockets/livetracking.socket';
import { LeaveExpiryJobService } from './modules/leaves/services/LeaveExpiryJobService';
import { startAutoCheckOutCron } from './modules/attendance/services/AutoCheckOutService';


const env = getEnv();

/**
 * Repair corrupted super_admin password hash in the background.
 * Runs AFTER server starts listening so it never blocks incoming requests.
 */
async function repairSuperAdminHashIfNeeded(): Promise<void> {
  try {
    const db = getKnex();
    const hasSA = await db.schema.hasTable('super_admins');
    if (!hasSA) return;

    const sa = await db('super_admins').whereRaw('LOWER(email) = ?', ['superadmin@apponext.com']).first();
    const curHash = sa?.password_hash || sa?.passwordHash;
    if (sa && (curHash?.startsWith('$2a$') || !curHash?.startsWith('$argon2'))) {
      const { hash: argon2Hash } = await import('argon2');
      const validArgon2Hash = await argon2Hash('SuperAdmin@2026!Secure', {
        memoryCost: 12288,
        timeCost: 3,
        parallelism: 1,
        type: 1,
      });
      await db('super_admins').where('id', sa.id).update({
        password_hash: validArgon2Hash,
        updated_at: new Date(),
      });
      logger.info(`[DB REPAIR] ✅ Fixed corrupted super_admins password_hash for superadmin@apponext.com`);
    }
  } catch (e: any) {
    logger.warn(`[DB REPAIR] Could not check super_admins password hash: ${e?.message}`);
  }
}

/**
 * Start the HTTP server
 */
async function start() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    initializeKnex();
    logger.info('Database connection initialized');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Create Socket.io server with flexible CORS
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Company-Id', 'x-company-id'],
        credentials: true
      }
    });

    // Initialize notification socket
    initializeNotificationSocket(io);

    // Initialize live tracking socket
    initializeLiveTrackingSocket(io);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[SERVER ERROR] Port ${env.PORT} is already in use (EADDRINUSE). Please terminate zombie process on port ${env.PORT}.`);
        process.exit(1);
      } else {
        logger.error('[SERVER ERROR]', err);
      }
    });

    // Start listening on 0.0.0.0 (all network interfaces for mobile & LAN access)
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${env.PORT} (host: 0.0.0.0) [READY]`);

      // Repair super_admin hash in background — does NOT block server startup
      repairSuperAdminHashIfNeeded();

      // Start automatic Leave & Comp-off Expiry Scheduler (runs every 12 hours)
      const expiryJobService = new LeaveExpiryJobService();
      // Run once immediately on start after 5 seconds
      setTimeout(() => {
        logger.info('Running startup leave expiry check...');
        expiryJobService.runExpiryJobs().catch((e) => logger.error('Startup leave expiry jobs failed', e));
      }, 5000);

      // Repeat every 12 hours
      setInterval(() => {
        logger.info('Running scheduled 12-hourly leave expiry checks...');
        expiryJobService.runExpiryJobs().catch((e) => logger.error('Scheduled leave expiry jobs failed', e));
      }, 12 * 60 * 60 * 1000);
    });

    /**
     * Graceful shutdown
     */
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        await closeKnex();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    /**
     * Unhandled error handling - Log but DO NOT EXIT
     * Server must remain alive to serve subsequent requests
     */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      // Do NOT exit - continue serving requests
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
      });
      // Do NOT exit - continue serving requests
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start server
start();

