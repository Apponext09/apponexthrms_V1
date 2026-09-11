import type { Request, Response } from 'express';
import { courseService } from '../services/CourseService';
import { createBatchSchema, updateBatchSchema } from '../types/lms.types';

export class BatchController {
  async getBatches(req: Request, res: Response) {
    const filters = {
      courseId: req.query.courseId ? Number(req.query.courseId) : undefined,
      status: req.query.status as string,
      search: req.query.search as string,
    };
    const batches = await courseService.getBatches(req.ctx!, filters);
    res.json({ success: true, data: batches });
  }

  async createBatch(req: Request, res: Response) {
    const validated = createBatchSchema.parse(req.body);
    const batch = await courseService.createBatch(req.ctx!, validated);
    res.status(201).json({ success: true, data: batch });
  }

  async updateBatch(req: Request, res: Response) {
    const validated = updateBatchSchema.parse(req.body);
    const batch = await courseService.updateBatch(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: batch });
  }

  async deleteBatch(req: Request, res: Response) {
    await courseService.deleteBatch(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Batch deleted successfully' });
  }
}

export const batchController = new BatchController();
