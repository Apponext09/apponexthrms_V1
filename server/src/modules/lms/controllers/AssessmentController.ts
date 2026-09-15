import type { Request, Response } from 'express';
import { assessmentService } from '../services/AssessmentService';
import { createAssessmentSchema, updateAssessmentSchema, submitAssessmentSchema } from '../types/lms.types';

export class AssessmentController {
  async getByCourseId(req: Request, res: Response) {
    const courseId = Number(req.params.courseId || req.query.courseId);
    const assessment = await assessmentService.getByCourseId(req.ctx!, courseId, true);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found for this course' });
    }
    res.json({ success: true, data: assessment });
  }

  async getAdminAssessment(req: Request, res: Response) {
    const courseId = Number(req.params.courseId || req.query.courseId);
    const assessment = await assessmentService.getAdminAssessment(req.ctx!, courseId);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found for this course' });
    }
    res.json({ success: true, data: assessment });
  }

  async createAssessment(req: Request, res: Response) {
    const validated = createAssessmentSchema.parse(req.body);
    const assessment = await assessmentService.createAssessment(req.ctx!, validated);
    res.status(201).json({ success: true, data: assessment });
  }

  async updateAssessment(req: Request, res: Response) {
    const validated = updateAssessmentSchema.parse(req.body);
    const assessment = await assessmentService.updateAssessment(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: assessment });
  }

  async getAttempts(req: Request, res: Response) {
    const assessmentId = Number(req.params.id);
    const employeeId = Number(req.query.employeeId || req.ctx?.userId);
    const attempts = await assessmentService.getAttempts(req.ctx!, assessmentId, employeeId);
    res.json({ success: true, data: attempts });
  }

  async submitAssessment(req: Request, res: Response) {
    const validated = submitAssessmentSchema.parse(req.body);
    const employeeId = Number(req.body.employeeId || req.ctx?.userId);
    const result = await assessmentService.submitAssessment(req.ctx!, {
      ...validated,
      employeeId,
    });
    res.json({ success: true, data: result });
  }
}

export const assessmentController = new AssessmentController();
