import pino from 'pino';
import { getEnv } from '../../config/env';

let loggerInstance: pino.Logger | null = null;

/**
 * Initialize Pino logger
 */
function initializeLogger(): pino.Logger {
  const env = getEnv();

  const baseConfig = {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          }
        : undefined,
  };

  return pino(baseConfig);
}

/**
 * Get logger instance
 */
export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = initializeLogger();
  }
  return loggerInstance;
}

/**
 * Create child logger with context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return getLogger().child(context);
}

/**
 * Convenience functions
 */
export const logger = {
  debug: (msg: string, data?: unknown) => getLogger().debug(data || {}, msg),
  info: (msg: string, data?: unknown) => getLogger().info(data || {}, msg),
  warn: (msg: string, data?: unknown) => getLogger().warn(data || {}, msg),
  error: (msg: string, data?: unknown) => getLogger().error(data || {}, msg),
};
