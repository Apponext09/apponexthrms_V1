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

  // A branch-locked company admin must always remain in the company embedded in
  // their token. Organization-level admins can switch context, so their explicit
  // X-Company-Id selection must take precedence over an incidental JWT companyId.
  let companyId: number | undefined;
  const jwtCid = (req.user as any)?.cid || (req.user as any)?.companyId || (req.user as any)?.company_id;
  const rawRoles = (req.user as any).roles || (req.user as any).roleCodes || [];
  const roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
    .map((role: unknown) => String(role).toLowerCase());
  const accessRole = String((req.user as any).role || (req.user as any).accessRole || '').toLowerCase();
  const isBranchLocked = Boolean(
    jwtCid &&
    (roles.includes('company_admin') || accessRole === 'company_admin') &&
    !roles.includes('super_admin') &&
    accessRole !== 'super_admin'
  );

  const headerCompanyId = req.headers['x-company-id'] || req.headers['company-id'];
  if (!isBranchLocked && headerCompanyId && typeof headerCompanyId === 'string' && headerCompanyId !== 'all') {
    const parsed = parseInt(headerCompanyId, 10);
    if (!isNaN(parsed) && parsed > 0) {
      companyId = parsed;
    }
  }

  if (!companyId && jwtCid) {
    const parsed = parseInt(jwtCid, 10);
    if (!isNaN(parsed) && parsed > 0) {
      companyId = parsed;
    }
  }

  if (!companyId) {
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
    role: (req.user as any).role || (req.user as any).accessRole,
    roles: (req.user as any).roles || (req.user as any).roleCodes || [],
    employeeId: (req.user as any).employeeId || (req.user as any).employee_id || (req.user as any).eid,
  };

  next();
}
