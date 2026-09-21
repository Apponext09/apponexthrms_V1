import type { NextFunction, Request, Response } from 'express';
import { getKnex } from '../../db/knex';
import { ForbiddenError } from '../errors/ForbiddenError';

/** Reject explicitly disabled roles even when a route otherwise has broad RBAC. */
export function denyRoles(disallowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.ctx) throw new ForbiddenError('Access denied');
      const roles = await getKnex()('user_roles as ur')
        .join('roles as r', 'r.id', 'ur.role_id')
        .where('ur.user_id', req.ctx.userId)
        .where('ur.organization_id', req.ctx.organizationId)
        .pluck('r.code');
      if (roles.some((role: string) => disallowedRoles.includes(String(role).toLowerCase()))) {
        throw new ForbiddenError('This module is not available for your role');
      }
      next();
    } catch (error) { next(error); }
  };
}
