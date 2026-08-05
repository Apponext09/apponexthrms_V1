import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { GradeRepository } from '../repositories/GradeRepository';

const gradeCreateSchema = z.object({
  name: z.string().min(2, 'Name is required').max(150, 'Name must be under 150 characters'),
  code: z.string().min(1, 'Code is required').max(50, 'Code must be under 50 characters'),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const gradeUpdateSchema = gradeCreateSchema.partial();

export class GradeController extends GenericSettingsController {
  constructor() {
    const repository = new GradeRepository();
    const service = new GenericSettingsService(repository, 'GRADE', 'code');
    super(service, 'Grade');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = gradeCreateSchema.parse(req.body);
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
      const validatedData = gradeUpdateSchema.parse(req.body);
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
