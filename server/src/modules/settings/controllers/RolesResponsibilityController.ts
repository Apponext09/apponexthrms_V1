import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { RolesResponsibilityRepository } from '../repositories/RolesResponsibilityRepository';

const rolesResponsibilityBaseSchema = z.object({
  company_id: z.number().nullable().optional(),
  company_name: z.string().nullable().optional(),
  department_id: z.number().nullable().optional(),
  department_name: z.string().nullable().optional(),
  designation_id: z.number().nullable().optional(),
  designation_name: z.string().nullable().optional(),
  kra_form_id: z.number().nullable().optional(),
  kra_form: z.string().nullable().optional(),
  responsibilities: z.string().min(2, 'Responsibilities content is required'),
  is_active: z.enum(['Yes', 'No']).default('Yes'),
});

const rolesResponsibilityCreateSchema = rolesResponsibilityBaseSchema;
const rolesResponsibilityUpdateSchema = rolesResponsibilityBaseSchema.partial();

export class RolesResponsibilityController extends GenericSettingsController {
  constructor() {
    const repository = new RolesResponsibilityRepository();
    const service = new GenericSettingsService(repository, 'ROLES_RESPONSIBILITY', '');
    super(service, 'Roles & Responsibility');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = rolesResponsibilityCreateSchema.parse(req.body);
      req.body = validatedData;
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
      const validatedData = rolesResponsibilityUpdateSchema.parse(req.body);
      req.body = validatedData;
      await super.update(req, res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
        return;
      }
      throw error;
    }
  }
}
