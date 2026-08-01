import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { getEnv } from './config/env';
import { getLogger, logger } from '@/common/lib/logger';
import { initializeKnex, closeKnex, getKnex } from './db/knex';
import { setupProfileSchemaAndSeed } from './scripts/setup_profile_schema_and_seed';
import { initializeNotificationSocket } from './realtime/notification.socket';
import { initializeLiveTrackingSocket } from './modules/Livetracking/sockets/livetracking.socket';
import { startAutoCheckOutCron } from './modules/attendance/services/AutoCheckOutService';

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

    // Start background auto check-out service
    startAutoCheckOutCron();

    // Start listening on 0.0.0.0 (all network interfaces for mobile & LAN access)
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${env.PORT} (host: 0.0.0.0)`, {
        environment: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      });
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

