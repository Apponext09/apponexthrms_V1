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

  const roles = req.user?.roles || (req.ctx as any)?.roles || [];
  if (roles.includes('organization_admin') || roles.includes('super_admin') || roles.includes('admin') || roles.includes('hr_admin')) {
    next();
    return;
  }

  const { organizationId, userId } = req.ctx;

  // Check if user has all required permissions
  const hasAllPerms = await rbacService.hasAllPermissions(
    organizationId,
    userId,
    requiredPermissions
  );

  if (!hasAllPerms) {
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
