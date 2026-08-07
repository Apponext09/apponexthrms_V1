import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { KraRepository } from '../repositories/KraRepository';

const kraBaseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150, 'Title must be under 150 characters'),
  description: z.string().nullable().optional(),
  is_active: z.enum(['Yes', 'No']).default('Yes'),
});

const kraCreateSchema = kraBaseSchema;
const kraUpdateSchema = kraBaseSchema.partial();

export class KraController extends GenericSettingsController {
  constructor() {
    const repository = new KraRepository();
    const service = new GenericSettingsService(repository, 'KRA_FORM', '');
    super(service, 'KRA Form');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = kraCreateSchema.parse(req.body);
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
      const validatedData = kraUpdateSchema.parse(req.body);
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
