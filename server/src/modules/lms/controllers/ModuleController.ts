import type { Request, Response } from 'express';
import { courseService } from '../services/CourseService';
import { createModuleSchema, updateModuleSchema, reorderModulesSchema } from '../types/lms.types';

export class ModuleController {
  async getModules(req: Request, res: Response) {
    const courseId = Number(req.params.courseId || req.query.courseId);
    const modules = await courseService.getModulesByCourse(req.ctx!, courseId);
    res.json({ success: true, data: modules });
  }

  async createModule(req: Request, res: Response) {
    const validated = createModuleSchema.parse(req.body);
    const moduleItem = await courseService.createModule(req.ctx!, validated);
    res.status(201).json({ success: true, data: moduleItem });
  }

  async updateModule(req: Request, res: Response) {
    try {
      const validated = updateModuleSchema.parse(req.body);
      const moduleItem = await courseService.updateModule(req.ctx!, Number(req.params.id), validated);
      res.json({ success: true, data: moduleItem });
    } catch (err: any) {
      console.error(`[ModuleController.updateModule] Failed for module ${req.params.id}:`, err?.message || err);
      throw err;
    }
  }

  async deleteModule(req: Request, res: Response) {
    await courseService.deleteModule(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Module deleted successfully' });
  }

  async reorderModules(req: Request, res: Response) {
    const validated = reorderModulesSchema.parse(req.body);
    await courseService.reorderModules(req.ctx!, validated.courseId, validated.moduleOrders);
    res.json({ success: true, message: 'Modules reordered successfully' });
  }
}

export const moduleController = new ModuleController();
