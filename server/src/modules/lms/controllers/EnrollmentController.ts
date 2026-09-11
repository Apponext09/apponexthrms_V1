import type { Request, Response } from 'express';
import { enrollmentService } from '../services/EnrollmentService';
import { createEnrollmentSchema, bulkEnrollSchema, updateProgressSchema } from '../types/lms.types';

export class EnrollmentController {
  async getEnrollments(req: Request, res: Response) {
    const filters = {
      employeeId: req.query.employeeId ? Number(req.query.employeeId) : undefined,
      courseId: req.query.courseId ? Number(req.query.courseId) : undefined,
      batchId: req.query.batchId ? Number(req.query.batchId) : undefined,
      status: req.query.status as string,
      enrolledBy: req.query.enrolledBy as string,
      search: req.query.search as string,
    };
    const enrollments = await enrollmentService.getEnrollments(req.ctx!, filters);
    res.json({ success: true, data: enrollments });
  }

  async getMyEnrollments(req: Request, res: Response) {
    const employeeId = Number(req.query.employeeId || req.ctx?.userId);
    const enrollments = await enrollmentService.getEnrollments(req.ctx!, { employeeId });
    res.json({ success: true, data: enrollments });
  }

  async getTeamEnrollments(req: Request, res: Response) {
    const employeeIdsStr = req.query.employeeIds as string;
    let employeeIds: number[] = [];
    if (employeeIdsStr) {
      employeeIds = employeeIdsStr.split(',').map(Number).filter(Boolean);
    }
    const enrollments = await enrollmentService.getEnrollments(req.ctx!, { employeeIds });
    res.json({ success: true, data: enrollments });
  }

  async createEnrollment(req: Request, res: Response) {
    const validated = createEnrollmentSchema.parse(req.body);
    const enrollment = await enrollmentService.enroll(req.ctx!, {
      ...validated,
      enrolledByEmployeeId: req.ctx?.userId ? Number(req.ctx.userId) : null,
    });
    res.status(201).json({ success: true, data: enrollment });
  }

  async bulkEnroll(req: Request, res: Response) {
    const validated = bulkEnrollSchema.parse(req.body);
    const result = await enrollmentService.bulkEnroll(req.ctx!, validated);
    res.status(201).json({ success: true, data: result, message: `Successfully enrolled ${result.length} employee(s)` });
  }

  async updateProgress(req: Request, res: Response) {
    const validated = updateProgressSchema.parse(req.body);
    const updated = await enrollmentService.updateProgress(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: updated });
  }

  async dropEnrollment(req: Request, res: Response) {
    await enrollmentService.dropEnrollment(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Enrollment dropped' });
  }
}

export const enrollmentController = new EnrollmentController();
