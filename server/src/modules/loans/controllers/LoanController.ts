import type { Request, Response } from 'express';
import { LoanService } from '../services/LoanService';

export class LoanController {
  private loanService: LoanService;

  constructor(loanService?: LoanService) {
    this.loanService = loanService || new LoanService();
  }

  async createLoan(req: Request, res: Response) {
    const loan = await this.loanService.createLoan(req.ctx, req.body);
    res.status(201).json({ success: true, data: loan });
  }

  async getLoans(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    const loans = await this.loanService.getEmployeeLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getActiveLoan(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    const loans = await this.loanService.getActiveLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.getLoan(req.ctx, parseInt(id, 10));
    res.json({ success: true, data: loan });
  }

  async updateLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.updateLoan(req.ctx, parseInt(id, 10), req.body);
    res.json({ success: true, data: loan });
  }

  async approveLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.approveLoan(req.ctx, parseInt(id, 10));
    res.json({ success: true, data: loan });
  }

  async rejectLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.rejectLoan(req.ctx, parseInt(id, 10), req.body.reason);
    res.json({ success: true, data: loan });
  }

  async getEmiSchedule(req: Request, res: Response) {
    const { loanId } = req.query;
    const targetId = req.params.id || (loanId as string);
    const schedule = await this.loanService.getRepaymentSchedule(req.ctx, parseInt(targetId, 10));
    res.json({ success: true, data: schedule });
  }

  async getNextEmi(req: Request, res: Response) {
    const { loanId } = req.query;
    const targetId = req.params.id || (loanId as string);
    const nextEmi = await this.loanService.getNextEmi(req.ctx, parseInt(targetId, 10));
    res.json({ success: true, data: nextEmi });
  }

  async getLoanTypes(req: Request, res: Response) {
    const types = await this.loanService.getLoanTypes(req.ctx);
    res.json({ success: true, data: types });
  }

  async saveLoanType(req: Request, res: Response) {
    const type = await this.loanService.saveLoanType(req.ctx, req.body);
    res.json({ success: true, data: type });
  }

  async deleteLoanType(req: Request, res: Response) {
    const { id } = req.params;
    const result = await this.loanService.deleteLoanType(req.ctx, parseInt(id, 10));
    res.json({ success: true, data: result });
  }
}
