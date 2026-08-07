import type { Request, Response } from 'express';
import { z } from 'zod';
import { GenericSettingsController } from './GenericSettingsController';
import { GenericSettingsService } from '../services/GenericSettingsService';
import { BreakRepository } from '../repositories/BreakRepository';

const ALLOWED_BIOMETRIC_DEVICES = ['Face Recognition Web', 'Mobile', 'Device'] as const;

const breakBaseSchema = z.object({
  name: z.string().min(2, 'Break Name must be at least 2 characters').max(100, 'Break Name must be under 100 characters'),
  break_type: z.enum(['Manual', 'Auto'], { required_error: 'Break Type is required' }),
  biometric_device: z
    .enum(ALLOWED_BIOMETRIC_DEVICES)
    .nullable()
    .optional(),
  max_allow_time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, 'Max Allow Time must be in HH:MM format')
    .default('00:15'),
  is_active: z.enum(['Yes', 'No']).default('Yes'),
});

const breakCreateSchema = breakBaseSchema.refine(
  (data) => {
    if (data.break_type === 'Auto') {
      return !!data.biometric_device && ALLOWED_BIOMETRIC_DEVICES.includes(data.biometric_device as any);
    }
    return true;
  },
  {
    message: 'Biometric Device is required for Auto break type. Must be one of: Face Recognition Web, Mobile, Device.',
    path: ['biometric_device'],
  }
);

const breakUpdateSchema = breakBaseSchema.partial();

export class BreakController extends GenericSettingsController {
  constructor() {
    const repository = new BreakRepository();
    const service = new GenericSettingsService(repository, 'BREAK', '');
    super(service, 'Break');
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = breakCreateSchema.parse(req.body);
      // If Manual, clear biometric_device
      if (validatedData.break_type === 'Manual') {
        validatedData.biometric_device = null;
      }
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
      const validatedData = breakUpdateSchema.parse(req.body);
      // If Manual, clear biometric_device
      if (validatedData.break_type === 'Manual') {
        validatedData.biometric_device = null;
      }
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
