import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import type { ApiResponse } from '@apponexthrms/shared';
import { logger } from '../lib/logger';

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  const logContext = {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    organizationId: req.user?.oid,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  };


  if (error instanceof AppError) {
    logger.warn(`${error.name}: ${error.message}`, logContext);

    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };

    res.status(error.statusCode).json(response);
  } else {
    // Unknown error
    logger.error(`${error.name}: ${error.message}`, {
      ...logContext,
      stack: error.stack,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      },
    };

    res.status(500).json(response);
  }
}

/**
 * Not found handler (404)
 * Register after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
    },
  };

  res.status(404).json(response);
}

