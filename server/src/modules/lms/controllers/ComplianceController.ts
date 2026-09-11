import type { Request, Response } from 'express';
import { complianceService } from '../services/ComplianceService';
import { createComplianceSchema, updateComplianceSchema } from '../types/lms.types';

export class ComplianceController {
  async getComplianceRules(req: Request, res: Response) {
    const rules = await complianceService.getComplianceRules(req.ctx!);
    res.json({ success: true, data: rules });
  }

  async createComplianceRule(req: Request, res: Response) {
    const validated = createComplianceSchema.parse(req.body);
    const rule = await complianceService.createComplianceRule(req.ctx!, validated);
    res.status(201).json({ success: true, data: rule });
  }

  async updateComplianceRule(req: Request, res: Response) {
    const validated = updateComplianceSchema.parse(req.body);
    const rule = await complianceService.updateComplianceRule(req.ctx!, Number(req.params.id), validated);
    res.json({ success: true, data: rule });
  }

  async deleteComplianceRule(req: Request, res: Response) {
    await complianceService.deleteComplianceRule(req.ctx!, Number(req.params.id));
    res.json({ success: true, message: 'Compliance rule deleted' });
  }
}

export const complianceController = new ComplianceController();
