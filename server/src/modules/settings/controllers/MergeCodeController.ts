import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { MergeCodeRepository } from '../repositories/MergeCodeRepository';

const mergeCodeBaseSchema = z.object({
  module_name: z.string().min(1, 'Module name is required').max(100, 'Module name must be under 100 characters'),
  sub_module_name: z.string().min(1, 'Sub-module name is required').max(100, 'Sub-module name must be under 100 characters'),
  description: z.string().nullable().optional(),
  is_active: z.enum(['Yes', 'No']).default('Yes'),
});

const mergeCodeCreateSchema = mergeCodeBaseSchema;
const mergeCodeUpdateSchema = mergeCodeBaseSchema.partial();

export class MergeCodeController extends GenericSettingsController {
  constructor() {
    const repository = new MergeCodeRepository();
    const service = new GenericSettingsService(repository, 'NOTIFICATION_MERGE_CODE', '');
    super(service, 'Notification Merge Code');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = mergeCodeCreateSchema.parse(req.body);
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
      const validatedData = mergeCodeUpdateSchema.parse(req.body);
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
