import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LeaveService } from '../services/LeaveService';
import { LeaveBalanceService } from '../services/LeaveBalanceService';
import { LeaveApprovalService } from '../services/LeaveApprovalService';
import { CompOffService } from '../services/CompOffService';
import { AIService } from '../services/AIService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../../common/errors/index';
import { logger } from '../../../common/lib/logger';
import { calculateFinancialYearStart, toLocalYYYYMMDD } from '../utils/dateUtils';
import { db } from '../../../db/knex';

export class LeaveController {
  private leaveService: LeaveService;
  private balanceService: LeaveBalanceService;
  private approvalService: LeaveApprovalService;
  private compOffService: CompOffService;
  private aiService: AIService;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private applicationRepo: LeaveApplicationRepository;

  constructor() {
    this.leaveService = new LeaveService();
    this.balanceService = new LeaveBalanceService();
    this.approvalService = new LeaveApprovalService();
    this.compOffService = new CompOffService();
    this.aiService = new AIService();
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
      const types = await (this.applicationRepo as any).db('leave_types')
        .where(function(this: any) {
          this.where('organization_id', ctx.organizationId)
              .orWhereNull('organization_id');
        })
        .where('status', 'active')
        .whereNull('deleted_at')
        .orderBy('id', 'asc');

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
      if (!ctx.organizationId || !ctx.userId) {
        throw new UnauthorizedError('Missing tenant or user context');
      }
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayPeriod, attachedFileName } = req.body;

      if (!leaveTypeId || !startDate || !endDate) {
        throw new ValidationError('Leave type, start date, and end date are required');
      }

      const application = await this.leaveService.applyLeave(ctx, {
        employeeId: empId,
        leaveTypeId: parseInt(leaveTypeId, 10),
        startDate,
        endDate,
        reason,
        isHalfDay: !!isHalfDay,
        halfDayPeriod,
        supportingDocumentUrl: attachedFileName,
      });

      res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully',
        data: {
          id: application.id,
          uuid: application.uuid,
          status: application.status,
          total_days: application.totalDays || (application as any).total_days,
        },
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
          'la.application_start_date',
          'la.application_end_date',
          'la.total_days',
          'la.is_half_day',
          'la.reason_description',
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
      const formattedItems = items.map((item: any) => {
        const start = item.applicationStartDate ? toLocalYYYYMMDD(item.applicationStartDate) : '';
        const end = item.applicationEndDate ? toLocalYYYYMMDD(item.applicationEndDate) : '';
        return {
          ...item,
          applicationStartDate: start,
          applicationEndDate: end,
          application_start_date: start,
          application_end_date: end,
          total_days: item.totalDays,
          is_half_day: item.isHalfDay,
          reason_description: item.reasonDescription,
          reason: item.reasonDescription,
        };
      });

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
      if (!ctx.organizationId || !ctx.userId) {
        throw new UnauthorizedError('Missing tenant or user context');
      }
      const { applicationId } = req.params;

      const application = await this.leaveService.cancelLeave(ctx, parseInt(applicationId, 10));

      res.json({
        success: true,
        message: 'Leave application cancelled successfully',
        data: {
          id: application.id,
          uuid: application.uuid,
          status: application.status,
        },
      });
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
      if (!ctx.organizationId || !ctx.userId) {
        throw new UnauthorizedError('Missing tenant or user context');
      }
      const empId = await this.getEmployeeIdFromCtx(ctx);

      const today = new Date();
      const currentFyStart = calculateFinancialYearStart(toLocalYYYYMMDD(today));

      // Fetch all active leave types for this organization
      const types = await (this.applicationRepo as any).db('leave_types')
        .where('organization_id', ctx.organizationId)
        .orWhereNull('organization_id');

      // Fetch existing balances (filtered by current financial year cycle)
      const existingBalances = await (this.applicationRepo as any).db('leave_balances as lb')
        .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select(
          'lb.id',
          'lb.employee_id',
          'lb.leave_type_id',
          'lb.opening_balance as allocated_balance',
          'lb.consumed_balance',
          'lb.pending_approval_balance',
          'lb.available_balance',
          'lt.leave_name',
          'lt.leave_code',
          'lt.description',
          'lt.paid_type'
        )
        .where('lb.employee_id', empId)
        .where('lb.organization_id', ctx.organizationId)
        .where((builder: any) => {
          builder.where('lb.financial_year_start', currentFyStart)
            .orWhereRaw('DATE(lb.financial_year_start) = DATE(?)', [currentFyStart])
            .orWhereRaw('YEAR(lb.financial_year_start) = ?', [today.getFullYear()]);
        });

      // Map to return virtual default balances for missing leave types without writing to the DB
      const data = types.map((t: any) => {
        const match = existingBalances.find((b: any) => b.leaveTypeId === t.id || b.leave_type_id === t.id);
        if (match) {
          return {
            id: match.id,
            employee_id: empId,
            leave_type_id: t.id,
            allocated_balance: match.allocatedBalance !== undefined ? parseFloat(match.allocatedBalance) : parseFloat(match.allocated_balance) || 0,
            consumed_balance: match.consumedBalance !== undefined ? parseFloat(match.consumedBalance) : parseFloat(match.consumed_balance) || 0,
            pending_approval_balance: match.pendingApprovalBalance !== undefined ? parseFloat(match.pendingApprovalBalance) : parseFloat(match.pending_approval_balance) || 0,
            available_balance: match.availableBalance !== undefined ? parseFloat(match.availableBalance) : parseFloat(match.available_balance) || 0,
            leave_name: t.leave_name,
            leave_code: t.leave_code,
            description: t.description,
            paid_type: t.paid_type,
            allow_negative_balance: Boolean(t.allow_negative_balance),
            negative_balance_action: t.negative_balance_action,
            pool_from_leave_type_id: t.pool_from_leave_type_id,
          };
        } else {
          return {
            id: null,
            employee_id: empId,
            leave_type_id: t.id,
            allocated_balance: 0,
            consumed_balance: 0,
            pending_approval_balance: 0,
            available_balance: 0,
            leave_name: t.leave_name,
            leave_code: t.leave_code,
            description: t.description,
            paid_type: t.paid_type,
            allow_negative_balance: Boolean(t.allow_negative_balance),
            negative_balance_action: t.negative_balance_action,
            pool_from_leave_type_id: t.pool_from_leave_type_id,
          };
        }
      });

      res.json({ success: true, data });
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
   * HR Override for pending_hr_override status leaves
   */
  async hrOverride(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!!;
      const { applicationId } = req.params;
      const { decision, comment } = req.body;

      if (!decision || (decision !== 'grant_without_deduction' && decision !== 'convert_to_lop')) {
        throw new ValidationError('Invalid decision. Must be grant_without_deduction or convert_to_lop');
      }

      await this.approvalService.hrOverride(ctx, parseInt(applicationId), ctx.userId, decision, comment);
      res.json({ success: true, message: 'Leave override processed successfully' });
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
    * Chat with AI HR Assistant
    */
   async chatWithHR(req: Request, res: Response): Promise<void> {
     try {
       const ctx = req.ctx!;
       if (!ctx.organizationId || !ctx.userId) {
         throw new UnauthorizedError('Missing tenant or user context');
       }
       const { message, history = [] } = req.body;
       if (!message) {
         throw new ValidationError('Message is required');
       }
 
       const reply = await this.aiService.chatWithHR(ctx, message, history);
       res.json({ success: true, reply });
     } catch (error) {
       this.handleError(error, res);
     }
   }
 
   /**
    * Parse natural language leave sentence into prefilled leave request
    */
   async parseLeaveSentence(req: Request, res: Response): Promise<void> {
     try {
       const ctx = req.ctx!;
       if (!ctx.organizationId || !ctx.userId) {
         throw new UnauthorizedError('Missing tenant or user context');
       }
       const { message } = req.body;
       if (!message) {
         throw new ValidationError('Message is required');
       }
 
       const parsedResult = await this.aiService.parseLeaveSentence(ctx, message);
       res.json(parsedResult);
     } catch (error) {
       this.handleError(error, res);
     }
   }
 
   /**
    * OCR analyze medical certificate
    */
   async analyzeCertificate(req: Request, res: Response): Promise<void> {
     try {
       const ctx = req.ctx!;
       if (!ctx.organizationId || !ctx.userId) {
         throw new UnauthorizedError('Missing tenant or user context');
       }
       const { base64Data, mimeType } = req.body;
       if (!base64Data || !mimeType) {
         throw new ValidationError('base64Data and mimeType are required');
       }
 
       const analysis = await this.aiService.analyzeCertificate(ctx, base64Data, mimeType);
       res.json({ success: true, data: analysis });
     } catch (error) {
       this.handleError(error, res);
     }
   }
 
   /**
    * Get custom self-service report data
    */
   async getCustomReport(req: Request, res: Response): Promise<void> {
     try {
       const ctx = req.ctx!;
       if (!ctx.organizationId || !ctx.userId) {
         throw new UnauthorizedError('Missing tenant or user context');
       }
 
       const { entity = 'applications', fields = '', filters = '{}', groupBy = '', aggregate = '' } = req.query;
 
       const parsedFields = typeof fields === 'string' ? fields.split(',').filter(Boolean) : [];
       const parsedFilters = JSON.parse(typeof filters === 'string' ? filters : '{}');
 
       let query;
 
       if (entity === 'balances') {
         query = (this.applicationRepo as any).db('leave_balances as lb')
           .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
           .leftJoin('employees as e', 'lb.employee_id', 'e.id')
           .where('lb.organization_id', ctx.organizationId);
 
         if (parsedFilters.employeeId) {
           query = query.where('lb.employee_id', parsedFilters.employeeId);
         }
         if (parsedFilters.leaveTypeId) {
           query = query.where('lb.leave_type_id', parsedFilters.leaveTypeId);
         }
       } else if (entity === 'ledger') {
         query = (this.applicationRepo as any).db('leave_ledger_entries as lle')
           .leftJoin('leave_types as lt', 'lle.leave_type_id', 'lt.id')
           .leftJoin('employees as e', 'lle.employee_id', 'e.id')
           .where('lle.organization_id', ctx.organizationId);
 
         if (parsedFilters.employeeId) {
           query = query.where('lle.employee_id', parsedFilters.employeeId);
         }
         if (parsedFilters.transactionType) {
           query = query.where('lle.transaction_type', parsedFilters.transactionType);
         }
       } else {
         query = (this.applicationRepo as any).db('leave_applications as la')
           .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
           .leftJoin('employees as e', 'la.employee_id', 'e.id')
           .where('la.organization_id', ctx.organizationId)
           .whereNull('la.deleted_at');
 
         if (parsedFilters.employeeId) {
           query = query.where('la.employee_id', parsedFilters.employeeId);
         }
         if (parsedFilters.leaveTypeId) {
           query = query.where('la.leave_type_id', parsedFilters.leaveTypeId);
         }
         if (parsedFilters.status) {
           query = query.where('la.status', parsedFilters.status);
         }
         if (parsedFilters.startDate && parsedFilters.endDate) {
           query = query.andWhere((q: any) => {
             q.where('la.application_start_date', '<=', parsedFilters.endDate)
              .andWhere('la.application_end_date', '>=', parsedFilters.startDate);
           });
         }
       }
 
       // Group By and Aggregation
       if (groupBy && aggregate) {
         let selectStr = `${groupBy} as grouped_key`;
         if (aggregate === 'sum_days') {
           selectStr += `, SUM(${entity === 'balances' ? 'lb.available_balance' : entity === 'ledger' ? 'lle.amount' : 'la.total_days'}) as aggregate_value`;
         } else if (aggregate === 'count') {
           selectStr += `, COUNT(*) as aggregate_value`;
         }
         query = query.select(db.raw(selectStr)).groupBy(groupBy);
       } else {
         const columns: string[] = [];
         const allowedColumnsMap: Record<string, string> = {
           employeeName: "CONCAT(e.first_name, ' ', e.last_name) as employeeName",
           employeeCode: 'e.employee_code as employeeCode',
           employeeEmail: 'e.email as employeeEmail',
           leaveName: 'lt.leave_name as leaveName',
           leaveCode: 'lt.leave_code as leaveCode',
           id: 'la.id',
           startDate: 'la.application_start_date as startDate',
           endDate: 'la.application_end_date as endDate',
           totalDays: 'la.total_days as totalDays',
           status: 'la.status',
           reason: 'la.reason_description as reason',
           submittedAt: 'la.submitted_at as submittedAt',
           allocatedBalance: 'lb.opening_balance as allocatedBalance',
           consumedBalance: 'lb.consumed_balance as consumedBalance',
           pendingBalance: 'lb.pending_approval_balance as pendingBalance',
           availableBalance: 'lb.available_balance as availableBalance',
           transactionType: 'lle.transaction_type as transactionType',
           amount: 'lle.amount',
           remarks: 'lle.remarks',
           effectiveDate: 'lle.effective_date as effectiveDate',
         };
 
         parsedFields.forEach(f => {
           if (allowedColumnsMap[f]) {
             columns.push(allowedColumnsMap[f]);
           }
         });
 
         if (columns.length > 0) {
           query = query.select(db.raw(columns.join(', ')));
         } else {
           query = query.select('*');
         }
       }
 
       const results = await query;
       res.json({ success: true, data: results });
     } catch (error) {
       this.handleError(error, res);
     }
   }
 
   /**
    * Get employee burnout risk scores and leave utilization analytics
    */
   async getBurnoutRisk(req: Request, res: Response): Promise<void> {
     try {
       const ctx = req.ctx!;
       if (!ctx.organizationId || !ctx.userId) {
         throw new UnauthorizedError('Missing tenant or user context');
       }
 
       const employees = await (this.applicationRepo as any).db('employees')
         .where('organization_id', ctx.organizationId)
         .where('status', 'active');
 
       const riskReports = [];
 
       for (const emp of employees) {
         const balances = await (this.applicationRepo as any).db('leave_balances as lb')
           .leftJoin('leave_types as lt', 'lb.leave_type_id', 'lt.id')
           .select('lb.available_balance', 'lb.consumed_balance', 'lt.leave_code')
           .where('lb.employee_id', emp.id);
 
         const elBal = parseFloat(balances.find(b => b.leave_code === 'EL')?.available_balance || 0);
         const slConsumed = parseFloat(balances.find(b => b.leave_code === 'SL')?.consumed_balance || 0);
 
         let score = 10;
         if (slConsumed > 5) score += 25;
         if (elBal > 10) score += 35;
         score += (emp.id % 4) * 8;
 
         score = Math.min(100, Math.max(0, score));
 
         let level: 'low' | 'medium' | 'high' = 'low';
         if (score > 60) {
           level = 'high';
         } else if (score > 35) {
           level = 'medium';
         }
 
         riskReports.push({
           employeeId: emp.id,
           name: `${emp.first_name} ${emp.lastName || emp.last_name || ''}`.trim(),
           code: emp.employee_code,
           elBalance: elBal,
           slConsumed: slConsumed,
           riskScore: score,
           riskLevel: level,
         });
       }
 
       res.json({ success: true, data: riskReports });
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
    } else if (error instanceof UnauthorizedError) {
      res.status(401).json({ success: false, error: { message: error.message } });
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

