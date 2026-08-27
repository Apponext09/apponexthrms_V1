import type { Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService';

export class ExpenseController {
  private expenseService: ExpenseService;

  constructor(expenseService?: ExpenseService) {
    this.expenseService = expenseService || new ExpenseService();
  }

  async submitClaim(req: Request, res: Response) {
    const employeeId = req.body.employeeId || req.body.employee_id || req.ctx?.employeeId || (req.user as any)?.employeeId || 1;
    const claim = await this.expenseService.submitClaim(req.ctx, Number(employeeId), req.body);
    res.status(201).json({ success: true, data: claim });
  }

  async getClaims(req: Request, res: Response) {
    const { employeeId, status } = req.query;
    const empId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    const claims = await this.expenseService.getClaims(req.ctx, isNaN(empId as any) ? undefined : empId, status as string);
    res.json({ success: true, data: claims });
  }

  async approveClaim(req: Request, res: Response) {
    const { id } = req.params;
    const claim = await this.expenseService.approveClaim(req.ctx, parseInt(id, 10), req.body.notes);
    res.json({ success: true, data: claim });
  }

  async rejectClaim(req: Request, res: Response) {
    const { id } = req.params;
    const claim = await this.expenseService.rejectClaim(req.ctx, parseInt(id, 10), req.body.remarks || req.body.reason);
    res.json({ success: true, data: claim });
  }
}
