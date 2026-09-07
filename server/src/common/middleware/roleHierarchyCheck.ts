import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { logger } from '../lib/logger';

/**
 * Role Hierarchy Levels
 * Higher number = higher privilege
 */
const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 5,
  organization_admin: 4,
  ceo: 4,
  hr_admin: 4,
  asset_admin: 4,
  hr_manager: 3,
  support: 3,
  finance: 3,
  recruitment_manager: 3,
  department_head: 2,
  manager: 2,
  team_lead: 2,
  employee: 1,
  consultant: 1,
  intern: 0,
};

/**
 * Middleware to enforce minimum role hierarchy level
 * Usage: requireMinimumRoleLevel(3) — requires level 3 or higher
 */
export function requireMinimumRoleLevel(minLevel: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userRoles = req.user?.roles || [];

      if (!userRoles || userRoles.length === 0) {
        logger.warn('[RBAC] Access denied: User has no roles', {
          userId: req.user?.sub,
          path: req.path,
        });
        throw new ForbiddenError('User has no roles assigned');
      }

      // Check if user has any role at or above the minimum level
      const hasRequiredLevel = userRoles.some((role: string) => {
        const level = ROLE_HIERARCHY[role] ?? -1;
        return level >= minLevel;
      });

      if (!hasRequiredLevel) {
        logger.warn('[RBAC] Access denied: Insufficient role level', {
          userId: req.user?.sub,
          userRoles,
          requiredLevel: minLevel,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenError(
          `Access denied. Minimum role level required: ${minLevel}. Your level: ${Math.max(...userRoles.map(r => ROLE_HIERARCHY[r] ?? -1))}`
        );
      }

      logger.debug('[RBAC] Access granted: Role level check passed', {
        userId: req.user?.sub,
        userRoles,
        requiredLevel: minLevel,
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('[RBAC] Role hierarchy check error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.sub,
      });
      throw new ForbiddenError('Role verification failed');
    }
  };
}

/**
 * Middleware to enforce specific role(s)
 * Usage: requireRoles(['hr_admin', 'super_admin'])
 */
export function requireRolesHierarchy(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userRoles = req.user?.roles || [];

      if (!userRoles || userRoles.length === 0) {
        logger.warn('[RBAC] Access denied: User has no roles', {
          userId: req.user?.sub,
          path: req.path,
        });
        throw new ForbiddenError('User has no roles assigned');
      }

      // Check if user has any of the allowed roles
      const hasPermittedRole = userRoles.some((role: string) => allowedRoles.includes(role));

      if (!hasPermittedRole) {
        logger.warn('[RBAC] Access denied: Role not in allowed list', {
          userId: req.user?.sub,
          userRoles,
          allowedRoles,
          path: req.path,
          method: req.method,
        });
        throw new ForbiddenError(
          `Access denied. Allowed roles: ${allowedRoles.join(', ')}`
        );
      }

      logger.debug('[RBAC] Access granted: Role check passed', {
        userId: req.user?.sub,
        userRoles,
        allowedRoles,
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('[RBAC] Role check error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.sub,
      });
      throw new ForbiddenError('Role verification failed');
    }
  };
}

/**
 * Check if a role has higher or equal privilege than another
 */
export function hasHigherOrEqualRole(userRole: string, checkRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const checkLevel = ROLE_HIERARCHY[checkRole] ?? -1;
  return userLevel >= checkLevel;
}

/**
 * Get role hierarchy level for a role
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? -1;
}

/**
 * Get all roles at or below a certain level
 */
export function getRolesAtLevel(level: number): string[] {
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, roleLevel]) => roleLevel <= level)
    .map(([role]) => role);
}

/**
 * Get all roles at or above a certain level
 */
export function getRolesAboveLevel(level: number): string[] {
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, roleLevel]) => roleLevel >= level)
    .map(([role]) => role);
}

/**
 * Verify user has access to view/edit another user's data
 * Based on role hierarchy: higher roles can access lower roles' data
 */
export function canUserAccessUserData(
  viewerRole: string,
  targetUserRole: string
): boolean {
  const viewerLevel = ROLE_HIERARCHY[viewerRole] ?? -1;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] ?? -1;

  // User can access own data
  if (viewerRole === targetUserRole) {
    return true;
  }

  // Higher level can access lower level
  return viewerLevel > targetLevel;
}
