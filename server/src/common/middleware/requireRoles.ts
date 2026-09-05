import type { NextFunction, Request, Response } from 'express';
import { getKnex } from '../../db/knex';
import { ForbiddenError } from '../errors/ForbiddenError';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import type { JwtClaims } from '@apponexthrms/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
    }
  }
}

/**
 * Requires at least one role for the authenticated user. Roles are resolved
 * from the database instead of trusting client-provided role data.
 */
export function requireRoles(allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const knex = getKnex();
      const userId = Number(req.user.sub);
      const organizationId = Number(req.user.oid);

      const superAdmin = await knex('super_admins as sa')
        .leftJoin('users as u', 'u.id', knex.raw('?', [userId]))
        .where('sa.status', 'active')
        .where((query) => {
          query.where('sa.id', userId)
            .orWhere('sa.user_id', userId)
            .orWhereRaw('LOWER(sa.email) = LOWER(u.email)');
        })
        .first('sa.id');

      if (superAdmin && allowedRoles.includes('super_admin')) {
        next();
        return;
      }

      const roles = await knex('user_roles as ur')
        .join('roles as r', 'r.id', 'ur.role_id')
        .where('ur.user_id', userId)
        .where('ur.organization_id', organizationId)
        .where((query) => query.whereNull('ur.expires_at').orWhere('ur.expires_at', '>', knex.fn.now()))
        .pluck('r.code');

      if (!roles.some((role) => allowedRoles.includes(role))) {
        throw new ForbiddenError('You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
