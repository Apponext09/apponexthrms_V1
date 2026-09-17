import type { Request, Response } from 'express';
import { courseService } from '../services/CourseService';
import { createCategorySchema, updateCategorySchema } from '../types/lms.types';

export class CategoryController {
  async getCategories(req: Request, res: Response) {
    const search = req.query.search as string;
    const categories = await courseService.getCategories(req.ctx!, { search });
    res.json({ success: true, data: categories });
  }

  async createCategory(req: Request, res: Response) {
    const validated = createCategorySchema.parse(req.body);
    const category = await courseService.createCategory(req.ctx!, validated);
    res.status(201).json({ success: true, data: category });
  }

  async updateCategory(req: Request, res: Response) {
    const validated = updateCategorySchema.parse(req.body);
    const category = await courseService.updateCategory(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: category });
  }

  async deleteCategory(req: Request, res: Response) {
    await courseService.deleteCategory(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Category deleted successfully' });
  }
}

export const categoryController = new CategoryController();
