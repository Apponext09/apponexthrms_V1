import type { Request, Response } from 'express';
import { LeaveService } from '../services/LeaveService';
import { LeaveBalanceService } from '../services/LeaveBalanceService';
import { LeaveApprovalService } from '../services/LeaveApprovalService';
import { CompOffService } from '../services/CompOffService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { logger } from '../../../common/lib/logger';

export class LeaveController {
  private leaveService: LeaveService;
  private balanceService: LeaveBalanceService;
  private approvalService: LeaveApprovalService;
  private compOffService: CompOffService;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private applicationRepo: LeaveApplicationRepository;

  constructor() {
    this.leaveService = new LeaveService();
    this.balanceService = new LeaveBalanceService();
    this.approvalService = new LeaveApprovalService();
    this.compOffService = new CompOffService();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.applicationRepo = new LeaveApplicationRepository();
  }

  /**
   * Apply for leave
   */
  async applyLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { employeeId, leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;

      const application = await this.leaveService.applyLeave(ctx, {
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        reason,
        isHalfDay,
        halfDayPeriod,
      });

      res.status(201).json({ success: true, data: application });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Submit leave application
   */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;

      const application = await this.leaveService.submitLeaveApplication(ctx, parseInt(applicationId));
      res.json({ success: true, data: application });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get leave application
   */
  async getApplication(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;

      const application = await this.leaveService.getApplication(ctx, parseInt(applicationId));
      res.json({ success: true, data: application });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get my leaves
   */
  async getMyLeaves(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { page = 1, pageSize = 20, status } = req.query;

      const result = await this.leaveService.getMyLeaves(ctx, {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        filters: status ? { status } : undefined,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Cancel leave
   */
  async cancelLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;
      const { reason, requiresApproval } = req.body;

      await this.leaveService.cancelLeave(ctx, {
        applicationId: parseInt(applicationId),
        reason,
        requiresApproval,
      });

      res.json({ success: true, message: 'Leave cancelled successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Withdraw leave
   */
  async withdrawLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;
      const { reason } = req.body;

      await this.leaveService.withdrawLeave(ctx, parseInt(applicationId), reason);
      res.json({ success: true, message: 'Leave withdrawn successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get my balances
   */
  async getMyBalances(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const balances = await this.balanceService.getBalancesForEmployee(ctx, ctx.userId);
      res.json({ success: true, data: balances });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { page = 1, pageSize = 20 } = req.query;

      const result = await this.approvalService.getApprovalQueue(ctx, ctx.userId, {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Approve leave
   */
  async approveLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;
      const { comment } = req.body;

      await this.approvalService.approveLeave(ctx, parseInt(applicationId), ctx.userId, comment);
      res.json({ success: true, message: 'Leave approved successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Reject leave
   */
  async rejectLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;
      const { reason } = req.body;

      await this.approvalService.rejectLeave(ctx, parseInt(applicationId), ctx.userId, reason);
      res.json({ success: true, message: 'Leave rejected successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get comp off balance
   */
  async getCompOffBalance(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const balance = await this.compOffService.getAvailableForEmployee(ctx, ctx.userId);
      const totalHours = await this.compOffService.getTotalAvailableHours(ctx, ctx.userId);

      res.json({ success: true, data: { balance, totalHours } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Request comp off
   */
  async requestCompOff(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { compOffId, reason } = req.body;

      const requestId = await this.compOffService.requestCompOff(ctx, {
        employeeId: ctx.userId,
        compOffId,
        reason,
      });

      res.status(201).json({ success: true, data: { requestId } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get applications for department (admin)
   */
  async getDepartmentApplications(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { departmentId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;

      const result = await this.applicationRepo.getByDepartment(ctx, parseInt(departmentId), {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get applications by date range
   */
  async getApplicationsByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { startDate, endDate, employeeId } = req.query;

      const applications = await this.applicationRepo.getByDateRange(
        ctx,
        startDate as string,
        endDate as string,
        employeeId ? parseInt(employeeId as string) : undefined
      );

      res.json({ success: true, data: applications });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Helper: Handle errors
   */
  private handleError(error: any, res: Response): void {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, error: { message: error.message } });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: { message: error.message } });
    } else {
      logger.error('Unhandled error in LeaveController', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export const leaveController = new LeaveController();

