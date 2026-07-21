import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import type { TenantContext } from '../db/types';

declare global {
  namespace Express {
    interface Request {
      ctx?: TenantContext;
    }
  }
}

/**
 * ResolveTenant middleware: extract organization context from JWT claims
 * Runs second in middleware chain (after authenticate)
 */
export function resolveTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated');
  }

  // Extract from JWT claims
  const organizationId = parseInt(req.user.oid, 10);
  const userId = parseInt(req.user.sub, 10);
  const sessionUuid = req.user.sid;

  if (!organizationId || !userId || !sessionUuid) {
    throw new UnauthorizedError('Invalid JWT claims');
  }

  // Attach tenant context to request
  req.ctx = {
    organizationId,
    userId,
    sessionUuid,
  };

  next();
}
