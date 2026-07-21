import type { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async route handlers to catch and forward errors to errorHandler middleware
 * Usage: router.post('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
