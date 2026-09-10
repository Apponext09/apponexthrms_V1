import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Request logging middleware
 * Logs incoming requests and response time
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture original res.json to log response
  const originalJson = res.json;
  res.json = function (data: unknown) {
    const duration = Date.now() - startTime;

    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.sub,
      organizationId: req.user?.oid,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode < 400) {
      logger.info(`${req.method} ${req.path}`, logData);
    } else if (res.statusCode < 500) {
      logger.warn(`${req.method} ${req.path}`, logData);
    } else {
      logger.error(`${req.method} ${req.path}`, logData);
    }

    return originalJson.call(this, data);
  };

  next();
}
