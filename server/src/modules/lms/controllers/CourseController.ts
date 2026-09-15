import type { Request, Response } from 'express';
import { courseService } from '../services/CourseService';
import { createCourseSchema, updateCourseSchema } from '../types/lms.types';

export class CourseController {
  async getCourses(req: Request, res: Response) {
    const filters = {
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      status: req.query.status as string,
      type: req.query.type as string,
      isMandatory: req.query.isMandatory !== undefined ? req.query.isMandatory === 'true' : undefined,
      search: req.query.search as string,
    };
    const courses = await courseService.getCourses(req.ctx!, filters);
    res.json({ success: true, data: courses });
  }

  async getCourseById(req: Request, res: Response) {
    const course = await courseService.getCourseById(req.ctx!, Number(req.params.id));
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  }

  async createCourse(req: Request, res: Response) {
    const validated = createCourseSchema.parse(req.body);
    const course = await courseService.createCourse(req.ctx!, validated);
    res.status(201).json({ success: true, data: course });
  }

  async updateCourse(req: Request, res: Response) {
    const validated = updateCourseSchema.parse(req.body);
    const course = await courseService.updateCourse(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: course });
  }

  async deleteCourse(req: Request, res: Response) {
    await courseService.deleteCourse(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Course deleted successfully' });
  }
}

export const courseController = new CourseController();
