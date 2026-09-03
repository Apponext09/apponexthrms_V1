import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { logger } from '../lib/logger';
import { getKnex } from '../../db/knex';

/**
 * Enforce employee data isolation
 * Employees can only view/edit their own data
 * Managers can view/edit their team members' data
 * HR/Admins can view/edit all data
 */
export function enforceEmployeeDataIsolation() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userRole = req.user?.roles?.[0]; // Get primary role
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      const orgId = req.user?.oid ? parseInt(req.user.oid, 10) : undefined;

      if (!userId || !orgId) {
        logger.warn('[DataIsolation] Missing user context', {
          userId,
          orgId,
          path: req.path,
        });
        throw new ForbiddenError('Invalid user context');
      }

      // Extract target employee ID from request
      const targetEmployeeId = req.params.employeeId
        ? parseInt(req.params.employeeId, 10)
        : undefined;

      // If no target employee ID, allow (might be list operations)
      if (!targetEmployeeId) {
        return next();
      }

      // Admin roles can access any employee data
      const adminRoles = ['super_admin', 'organization_admin', 'ceo', 'hr_admin'];
      if (adminRoles.includes(userRole)) {
        logger.debug('[DataIsolation] Admin access granted', {
          userId,
          targetEmployeeId,
          role: userRole,
        });
        return next();
      }

      // Get the user's employee record
      const db = getKnex();
      const userEmployee = await db('employees')
        .where('user_id', userId)
        .where('organization_id', orgId)
        .first();

      if (!userEmployee) {
        logger.warn('[DataIsolation] User employee record not found', {
          userId,
          orgId,
        });
        throw new ForbiddenError('User employee record not found');
      }

      // Employee role: can only view/edit own data
      if (userRole === 'employee' || userRole === 'consultant' || userRole === 'intern') {
        if (userEmployee.id !== targetEmployeeId) {
          logger.warn('[DataIsolation] Employee data access denied', {
            userId,
            userEmployeeId: userEmployee.id,
            targetEmployeeId,
            role: userRole,
            path: req.path,
            method: req.method,
          });
          throw new ForbiddenError('You can only access your own data');
        }
        return next();
      }

      // Manager roles: can view/edit team members' data
      const managerRoles = ['manager', 'department_head', 'team_lead'];
      if (managerRoles.includes(userRole)) {
        // Check if target employee is in user's team/department
        const isTeamMember = await db('employees')
          .where('id', targetEmployeeId)
          .where('organization_id', orgId)
          .where((builder) => {
            if (userRole === 'team_lead') {
              // Team lead can view team members
              builder.where('team_id', userEmployee.team_id);
            } else if (userRole === 'department_head') {
              // Department head can view department members
              builder.where('department_id', userEmployee.department_id);
            } else if (userRole === 'manager') {
              // Manager can view direct reports
              builder.where('reporting_manager_id', userEmployee.id);
            }
          })
          .first();

        if (!isTeamMember && targetEmployeeId !== userEmployee.id) {
          logger.warn('[DataIsolation] Manager data access denied', {
            userId,
            userEmployeeId: userEmployee.id,
            targetEmployeeId,
            role: userRole,
            path: req.path,
          });
          throw new ForbiddenError('You cannot access this employee data');
        }
        return next();
      }

      // Default: deny access for unknown roles
      logger.warn('[DataIsolation] Unknown role access attempt', {
        userId,
        role: userRole,
        path: req.path,
      });
      throw new ForbiddenError('Access denied for your role');
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('[DataIsolation] Data isolation check error', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.sub,
        path: req.path,
      });
      throw new ForbiddenError('Data access validation failed');
    }
  };
}

/**
 * Middleware to restrict list queries based on user role
 * Employees see only their own records
 * Managers see their team's records
 * Admins see all records
 */
export function restrictListQueryByRole() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userRole = req.user?.roles?.[0];
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      const orgId = req.user?.oid ? parseInt(req.user.oid, 10) : undefined;

      if (!userId || !orgId || !userRole) {
        throw new ForbiddenError('Invalid user context');
      }

      // Store role info in request for use in subsequent middleware/controllers
      (req as any).userRoleInfo = {
        role: userRole,
        userId,
        orgId,
      };

      // Admin can see all
      const adminRoles = ['super_admin', 'organization_admin', 'ceo', 'hr_admin'];
      if (adminRoles.includes(userRole)) {
        return next();
      }

      // Get user's employee record
      const db = getKnex();
      const userEmployee = await db('employees')
        .where('user_id', userId)
        .where('organization_id', orgId)
        .first();

      if (!userEmployee) {
        throw new ForbiddenError('User employee record not found');
      }

      // Store employee info
      (req as any).userRoleInfo.employeeId = userEmployee.id;
      (req as any).userRoleInfo.departmentId = userEmployee.department_id;
      (req as any).userRoleInfo.teamId = userEmployee.team_id;

      logger.debug('[DataIsolation] List query context established', {
        userId,
        role: userRole,
        employeeId: userEmployee.id,
      });

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('[DataIsolation] List query restriction error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ForbiddenError('List query validation failed');
    }
  };
}

/**
 * Helper to build WHERE clause for role-based data filtering
 */
export function buildRoleBasedFilter(
  query: any,
  userRole: string,
  userEmployeeId: number,
  departmentId?: number,
  teamId?: number
): any {
  const adminRoles = ['super_admin', 'organization_admin', 'ceo', 'hr_admin'];

  // Admins see all
  if (adminRoles.includes(userRole)) {
    return query;
  }

  // Employee: only own data
  if (userRole === 'employee' || userRole === 'consultant' || userRole === 'intern') {
    return query.where('id', userEmployeeId);
  }

  // Team lead: team members
  if (userRole === 'team_lead' && teamId) {
    return query.where('team_id', teamId);
  }

  // Department head: department members
  if (userRole === 'department_head' && departmentId) {
    return query.where('department_id', departmentId);
  }

  // Manager: direct reports
  if (userRole === 'manager') {
    return query.where('reporting_manager_id', userEmployeeId);
  }

  // Default: restrict to employee's own record
  return query.where('id', userEmployeeId);
}
