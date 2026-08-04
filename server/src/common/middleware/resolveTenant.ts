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

  // Extract from JWT claims with fallbacks
  const rawOrgId = (req.user as any).oid || (req.user as any).organizationId || (req.user as any).organization_id || 68;
  const rawUserId = (req.user as any).sub || (req.user as any).id || (req.user as any).userId;
  const sessionUuid = (req.user as any).sid || 'session-default';

  const organizationId = parseInt(rawOrgId, 10);
  const userId = parseInt(rawUserId, 10);

  if (isNaN(organizationId) || isNaN(userId)) {
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
