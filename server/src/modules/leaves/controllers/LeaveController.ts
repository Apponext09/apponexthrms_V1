import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

  private async getEmployeeIdFromCtx(ctx: any): Promise<number> {
    let empId = ctx.userId;
    try {
      const user = await (this.applicationRepo as any).db('users')
        .where('id', ctx.userId)
        .first();
      if (user && user.employee_id) {
        return user.employee_id;
      }
      if (user && user.email) {
        const empByEmail = await (this.applicationRepo as any).db('employees')
          .where('email', user.email)
          .first();
        if (empByEmail && empByEmail.id) {
          return empByEmail.id;
        }
      }
    } catch (e) {}
    return empId;
  }

  /**
   * Get leave types
   */
  async getLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      let types = await (this.applicationRepo as any).db('leave_types')
        .where('organization_id', ctx.tenantId)
        .orWhereNull('organization_id');

      if (!types || types.length === 0) {
        types = await (this.applicationRepo as any).db('leave_types').select('*');
      }

      res.json({ success: true, data: types });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Apply for leave
   */
  async applyLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;

      if (!leaveTypeId || !startDate || !endDate) {
        throw new ValidationError('Leave type, start date, and end date are required');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (req.body.customDuration !== undefined && req.body.customDuration !== null) {
        diffDays = parseFloat(req.body.customDuration);
      } else if (isHalfDay) {
        diffDays = 0.5;
      }

      const uuid = uuidv4();
      const orgId = ctx.tenantId || 3;

      const [insertedId] = await (this.applicationRepo as any).db('leave_applications').insert({
        uuid,
        organization_id: orgId,
        employee_id: empId,
        leave_type_id: parseInt(leaveTypeId, 10),
        from_date: startDate,
        to_date: endDate,
        duration_days: diffDays,
        half_day: isHalfDay ? 1 : 0,
        reason: reason || 'Personal Leave Request',
        status: 'pending',
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
      });

      // Update available balance / pending approval balance in leave_balances
      try {
        const balance = await (this.applicationRepo as any).db('leave_balances')
          .where('employee_id', empId)
          .where('leave_type_id', parseInt(leaveTypeId, 10))
          .first();

        if (balance) {
          const allocated = parseFloat(balance.allocated_balance) || 12;
          const consumed = parseFloat(balance.consumed_balance) || 0;
          const newPending = (parseFloat(balance.pending_approval_balance) || 0) + diffDays;
          const newAvail = Math.max(0, allocated - consumed - newPending);

          await (this.applicationRepo as any).db('leave_balances')
            .where('id', balance.id)
            .update({
              pending_approval_balance: newPending,
              available_balance: newAvail,
            });
        }
      } catch (e) {
        console.error('Failed to update leave balance:', e);
      }

      res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully',
        data: { id: insertedId, status: 'pending', total_days: diffDays },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Submit leave application
   */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
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
      const ctx = req.ctx!;
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
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { status } = req.query;

      let query = (this.applicationRepo as any).db('leave_applications as la')
        .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
        .select(
          'la.id',
          'la.uuid',
          'la.employee_id',
          'la.leave_type_id',
          'la.from_date as application_start_date',
          'la.to_date as application_end_date',
          'la.duration_days as total_days',
          'la.half_day as is_half_day',
          'la.reason as reason_description',
          'la.reason',
          'la.status',
          'la.created_at',
          'lt.leave_name',
          'lt.leave_code'
        )
        .where('la.employee_id', empId)
        .orderBy('la.id', 'desc');

      if (status && status !== 'all') {
        query = query.where('la.status', status as string);
      }

      const items = await query;
      const formattedItems = items.map((item: any) => ({
        ...item,
        application_start_date: item.application_start_date ? new Date(item.application_start_date).toISOString().split('T')[0] : '',
        application_end_date: item.application_end_date ? new Date(item.application_end_date).toISOString().split('T')[0] : '',
      }));

      res.json({ success: true, data: formattedItems });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Cancel leave
   */
  async cancelLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { applicationId } = req.params;

      const app = await (this.applicationRepo as any).db('leave_applications')
        .where('id', parseInt(applicationId, 10))
        .first();

      if (!app) {
        throw new NotFoundError('Leave application not found');
      }

      await (this.applicationRepo as any).db('leave_applications')
        .where('id', app.id)
        .update({
          status: 'cancelled',
          updated_at: new Date(),
        });

      // Restore balance if it was pending
      try {
        const balance = await (this.applicationRepo as any).db('leave_balances')
          .where('employee_id', app.employee_id)
          .where('leave_type_id', app.leave_type_id)
          .first();

        if (balance) {
          const days = parseFloat(app.duration_days) || 1;
          const allocated = parseFloat(balance.allocated_balance) || 12;
          const consumed = parseFloat(balance.consumed_balance) || 0;
          const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - days);
          const newAvail = Math.max(0, allocated - consumed - newPending);

          await (this.applicationRepo as any).db('leave_balances')
            .where('id', balance.id)
            .update({
              pending_approval_balance: newPending,
              available_balance: newAvail,
            });
        }
      } catch (e) {}

      res.json({ success: true, message: 'Leave request cancelled successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Withdraw leave
   */
  async withdrawLeave(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
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
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);

      let balances = await (this.applicationRepo as any).db('leave_balances as lb')
        .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select(
          'lb.id',
          'lb.employee_id',
          'lb.leave_type_id',
          'lb.allocated_balance',
          'lb.consumed_balance',
          'lb.pending_approval_balance',
          'lb.available_balance',
          'lt.leave_name',
          'lt.leave_code',
          'lt.description',
          'lt.paid_type'
        )
        .where('lb.employee_id', empId);

      if (!balances || balances.length === 0) {
        const types = await (this.applicationRepo as any).db('leave_types').select('*');
        for (const t of types) {
          const allocated = parseFloat(t.default_allowance_days || 10);
          await (this.applicationRepo as any).db('leave_balances').insert({
            uuid: uuidv4(),
            organization_id: ctx.tenantId || 3,
            employee_id: empId,
            leave_type_id: t.id,
            financial_year_start: '2026-04-01',
            allocated_balance: allocated,
            consumed_balance: 0,
            pending_approval_balance: 0,
            available_balance: allocated,
          });
        }
        balances = await (this.applicationRepo as any).db('leave_balances as lb')
          .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
          .select(
            'lb.id',
            'lb.employee_id',
            'lb.leave_type_id',
            'lb.allocated_balance',
            'lb.consumed_balance',
            'lb.pending_approval_balance',
            'lb.available_balance',
            'lt.leave_name',
            'lt.leave_code',
            'lt.description',
            'lt.paid_type'
          )
          .where('lb.employee_id', empId);
      }

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

