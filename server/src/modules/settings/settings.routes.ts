import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@apponexthrms/shared';
import { getKnex } from '../../db/knex';

const router = Router();
router.use(authenticate, resolveTenant);

// Root endpoint - get organization settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId)
    .first();

  const response: ApiResponse = {
    success: true,
    data: settings || { organization_id: ctx.organizationId },
  };

  res.status(200).json(response);
}));

router.get('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  
  const db = getKnex();
  const offset = (page - 1) * pageSize;

  const locations = await db('locations')
    .where('organization_id', ctx.organizationId)
    .limit(pageSize)
    .offset(offset);

  const countResult = await db('locations')
    .where('organization_id', ctx.organizationId)
    .count('* as count')
    .first();

  const response: ApiResponse = {
    success: true,
    data: locations,
    meta: {
      page,
      pageSize,
      total: (countResult as any).count,
      hasMore: page * pageSize < (countResult as any).count,
      totalPages: Math.ceil((countResult as any).count / pageSize),
    },
  };

  res.status(200).json(response);
}));

router.post('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const [id] = await db('locations').insert({
    organization_id: ctx.organizationId,
    name: req.body.name,
    address: req.body.address,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const response: ApiResponse = {
    success: true,
    data: { id, message: 'Location created' },
  };

  res.status(201).json(response);
}));

router.get('/departments', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  
  const db = getKnex();
  const offset = (page - 1) * pageSize;

  const departments = await db('departments')
    .where('organization_id', ctx.organizationId)
    .limit(pageSize)
    .offset(offset);

  const countResult = await db('departments')
    .where('organization_id', ctx.organizationId)
    .count('* as count')
    .first();

  const response: ApiResponse = {
    success: true,
    data: departments,
    meta: {
      page,
      pageSize,
      total: (countResult as any).count,
      hasMore: page * pageSize < (countResult as any).count,
      totalPages: Math.ceil((countResult as any).count / pageSize),
    },
  };

  res.status(200).json(response);
}));

router.post('/departments', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const [id] = await db('departments').insert({
    organization_id: ctx.organizationId,
    name: req.body.name,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const response: ApiResponse = {
    success: true,
    data: { id, message: 'Department created' },
  };

  res.status(201).json(response);
}));

export default router;
