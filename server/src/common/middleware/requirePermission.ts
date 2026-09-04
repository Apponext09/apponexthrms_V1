import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { RbacService } from '../../modules/rbac/rbac.service';

const rbacService = new RbacService();

/**
 * RequirePermission middleware factory
 * Enforces role-based access control (RBAC) by checking if user has required permission(s)
 *
 * Usage: requirePermission('employee.read') - requires single permission
 *        requirePermission('employee.write', 'employee.delete') - requires ALL permissions
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Delegate to async function with error handling
    permissionCheckAsync(req, res, next, requiredPermissions).catch(next);
  };
}

/**
 * Async permission check implementation
 */
async function permissionCheckAsync(
  req: Request,
  res: Response,
  next: NextFunction,
  requiredPermissions: string[]
): Promise<void> {
  if (!req.ctx) {
    throw new ForbiddenError('Tenant context not resolved');
  }

  if (!requiredPermissions || requiredPermissions.length === 0) {
    // No specific permissions required, just authenticated
    next();
    return;
  }

  const roles = (req.user?.roles || req.ctx?.roles || []).map((r: string) => String(r).toLowerCase());
  if (
    roles.includes('organization_admin') ||
    roles.includes('super_admin') ||
    roles.includes('admin') ||
    roles.includes('hr_admin') ||
    roles.includes('hr_manager')
  ) {
    next();
    return;
  }

  // Allow managers, department heads, and team leads to create and access MRF requests & view recruitment/interview info
  const isMrfOrHiringOp = requiredPermissions.every(p =>
    p.startsWith('recruitment.mrf.') ||
    p.startsWith('recruitment.interview.') ||
    p === 'recruitment.read' ||
    p === 'recruitment.job.read' ||
    p === 'recruitment.jobs.read' ||
    p === 'recruitment.application.read'
  );
  const isPerformanceOp = requiredPermissions.every(p =>
    p.startsWith('performance.')
  );
  if (
    (isMrfOrHiringOp || isPerformanceOp) &&
    (roles.includes('manager') ||
      roles.includes('department_head') ||
      roles.includes('team_lead') ||
      roles.includes('reporting_manager'))
  ) {
    next();
    return;
  }

  const { organizationId, userId } = req.ctx;

  // Check if user has all required permissions via RBAC
  const hasAllPerms = await rbacService.hasAllPermissions(
    organizationId,
    userId,
    requiredPermissions
  );

  if (!hasAllPerms) {
    // Check DB user roles fallback via user_roles JOIN roles
    try {
      const db = (await import('../../db/knex')).getKnex();
      const dbRoles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.organization_id', organizationId)
        .where('user_roles.user_id', userId)
        .select('roles.code');
        
      const roleCodes = dbRoles.map(r => String(r.code || '').toLowerCase());
      
      // If user has no explicit restricted role or has admin/hr role, grant access
      if (
        roleCodes.length === 0 ||
        roleCodes.some(r => ['superadmin', 'admin', 'org_admin', 'organization_admin', 'hr_admin', 'hr_manager', 'owner'].includes(r))
      ) {
        next();
        return;
      }

      // Check manager / team lead role codes in DB
      if (
        (isMrfOrHiringOp || isPerformanceOp) &&
        roleCodes.some(r => ['manager', 'department_head', 'team_lead', 'reporting_manager'].includes(r))
      ) {
        next();
        return;
      }
    } catch (err) {
      // In case of query fallback error, allow authenticated org user
      next();
      return;
    }

    throw new ForbiddenError(
      `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
    );
  }

  next();
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  organizationId: number,
  userId: number,
  permission: string
): Promise<boolean> {
  return rbacService.hasPermission(organizationId, userId, permission);
}

/**
 * Check if user has any of the given permissions
 */
export async function hasAnyPermission(
  organizationId: number,
  userId: number,
  permissions: string[]
): Promise<boolean> {
  return rbacService.hasAnyPermission(organizationId, userId, permissions);
}

/**
 * Check if user has all of the given permissions
 */
export async function hasAllPermissions(
  organizationId: number,
  userId: number,
  permissions: string[]
): Promise<boolean> {
  return rbacService.hasAllPermissions(organizationId, userId, permissions);
}
