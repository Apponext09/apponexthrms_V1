import http from 'http';
// reload trigger comment #27
import { Server } from 'socket.io';
import fs from 'fs';
import { createApp } from './app';
import { getEnv } from './config/env';
import { getLogger, logger } from '@/common/lib/logger';
import { initializeKnex, closeKnex, getKnex } from './db/knex';
import { setupProfileSchemaAndSeed } from './scripts/setup_profile_schema_and_seed';
import { initializeNotificationSocket } from './realtime/notification.socket';
import { initializeLiveTrackingSocket } from './modules/Livetracking/sockets/livetracking.socket';
import { LeaveExpiryJobService } from './modules/leaves/services/LeaveExpiryJobService';
import { startAutoCheckOutCron } from './modules/attendance/services/AutoCheckOutService';


// Force restart trigger
const env = getEnv();

/**
 * Start the HTTP server
 */
async function start() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    initializeKnex();
    logger.info('Database connection initialized');








    // Automatically run schema checks and profile seeding
    await setupProfileSchemaAndSeed(getKnex());

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Create Socket.io server
    const io = new Server(server, {
      cors: {
        origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Initialize notification socket
    initializeNotificationSocket(io);

    // Initialize live tracking socket
    initializeLiveTrackingSocket(io);

    // Auto check-out service disabled as requested
    // startAutoCheckOutCron();

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${env.PORT} is already in use. Exiting process so supervisor can restart cleanly...`);
        setTimeout(() => process.exit(1), 1000);
      } else {
        logger.error('Server error:', err);
      }
    });

    // Start listening on 0.0.0.0 (all network interfaces for mobile & LAN access)
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${env.PORT} (host: 0.0.0.0)`, {
        environment: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      });

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

