import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import type { TenantContext } from '../../db/types';

declare global {
  namespace Express {
    interface Request {
      ctx?: TenantContext;
    }
  }
}

/**
 * ResolveTenant middleware: extract organization context from JWT claims & headers
 * Runs second in middleware chain (after authenticate)
 */
export function resolveTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated');
  }

  // Extract organizationId & userId from JWT claims with fallbacks
  const rawOrgId =
    (req.user as any).oid ||
    (req.user as any).organizationId ||
    (req.user as any).organization_id ||
    (req.user as any).orgId ||
    (req.user as any).org_id ||
    8;
  const rawUserId = (req.user as any).sub || (req.user as any).id || (req.user as any).userId;
  const sessionUuid = (req.user as any).sid || 'session-default';

  const organizationId = parseInt(rawOrgId, 10);
  const userId = parseInt(rawUserId, 10);

  if (isNaN(organizationId) || isNaN(userId)) {
    throw new UnauthorizedError('Invalid JWT claims');
  }

  // Extract companyId: JWT claims take top priority for branch-locked tokens (e.g. company_admin login)
  let companyId: number | undefined;
  const jwtCid = (req.user as any)?.cid || (req.user as any)?.companyId || (req.user as any)?.company_id;

  if (jwtCid) {
    const parsed = parseInt(jwtCid, 10);
    if (!isNaN(parsed) && parsed > 0) {
      companyId = parsed;
    }
  }

  if (!companyId) {
    const headerCompanyId = req.headers['x-company-id'] || req.headers['company-id'];
    if (headerCompanyId && typeof headerCompanyId === 'string' && headerCompanyId !== 'all') {
      const parsed = parseInt(headerCompanyId, 10);
      if (!isNaN(parsed) && parsed > 0) {
        companyId = parsed;
      }
    }
  }

  // Attach tenant context to request
  req.ctx = {
    organizationId,
    userId,
    sessionUuid,
    companyId,
  };

  next();
}
