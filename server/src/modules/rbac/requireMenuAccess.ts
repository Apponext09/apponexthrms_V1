import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../common/errors';
import { RbacService } from './rbac.service';
import { moduleForRoute } from './menu.catalog';

const rbac = new RbacService();

/** Apply after authenticate + resolveTenant on an API endpoint. Never trusts JWT role labels. */
export function requireMenuPage(routes: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context missing');
      const access = await rbac.getMyMenus(req.ctx);
      if (!access.items.some((item) => item.route && routes.includes(item.route))) {
        throw new ForbiddenError('This page is not available to your role');
      }
      next();
    } catch (error) { next(error); }
  };
}

/** Coarse module gate; specific sensitive APIs should use requireMenuPage instead. */
export function requireMenuModule(module: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.ctx) throw new UnauthorizedError('Tenant context missing');
      const access = await rbac.getMyMenus(req.ctx);
      if (!access.items.some((item) => item.route && moduleForRoute(item.route) === module)) {
        throw new ForbiddenError('This module is not available to your role');
      }
      next();
    } catch (error) { next(error); }
  };
}
