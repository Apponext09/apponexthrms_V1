import type { Request, Response } from 'express';
import { z } from 'zod';
import { getKnex } from '../../../db/knex';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { CostCenterRepository } from '../repositories/CostCenterRepository';
import { assertMasterNotInUse } from '../utils/masterUsage';

const costCenterCreateSchema = z.object({
  name: z.string().min(2, 'Name is required').max(150, 'Name must be under 150 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be under 50 characters'),
  description: z.string().max(2000).optional().nullable(),
  currency: z.string().length(3).optional().default('INR'),
  budget_amount: z.coerce.number().nonnegative('Budget cannot be negative').optional().nullable(),
  parent_cost_center_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const costCenterUpdateSchema = costCenterCreateSchema.partial();

export class CostCenterController extends GenericSettingsController {
  constructor() {
    const repository = new CostCenterRepository();
    const service = new GenericSettingsService(repository, 'COST_CENTER', 'code');
    super(service, 'Cost Center');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = costCenterCreateSchema.parse(req.body);
      if (data.parent_cost_center_id) {
        const parent = await getKnex()('cost_centers')
          .where({ id: data.parent_cost_center_id, organization_id: req.ctx!.organizationId })
          .whereNull('deleted_at')
          .first('id');
        if (!parent) {
          res.status(400).json({ success: false, message: 'Parent cost center not found in this organization.' });
          return;
        }
      }
      req.body = data;
      await super.create(req, res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const data = costCenterUpdateSchema.parse(req.body);
      const id = Number(req.params.id);
      if (data.parent_cost_center_id) {
        if (data.parent_cost_center_id === id) {
          res.status(400).json({ success: false, message: 'A cost center cannot be its own parent.' });
          return;
        }
        const parent = await getKnex()('cost_centers')
          .where({ id: data.parent_cost_center_id, organization_id: req.ctx!.organizationId })
          .whereNull('deleted_at')
          .first('id');
        if (!parent) {
          res.status(400).json({ success: false, message: 'Parent cost center not found in this organization.' });
          return;
        }
      }
      req.body = data;
      await super.update(req, res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    await assertMasterNotInUse(req.ctx!.organizationId, req.params.id, 'cost center', [
      { table: 'employees', column: 'cost_center_id', label: 'employee(s)' },
      { table: 'cost_centers', column: 'parent_cost_center_id', label: 'child cost center(s)' },
    ]);
    await super.delete(req, res);
  }
}
