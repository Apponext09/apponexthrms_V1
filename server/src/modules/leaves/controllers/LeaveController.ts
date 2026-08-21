import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LeaveService } from '../services/LeaveService';
import { LeaveBalanceService } from '../services/LeaveBalanceService';
import { LeaveApprovalService } from '../services/LeaveApprovalService';
import { AIService } from '../services/AIService';
import { LeaveExpiryJobService } from '../services/LeaveExpiryJobService';
import { LeaveAccrualService } from '../services/LeaveAccrualService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from '../../../common/errors/index';
import { logger } from '../../../common/lib/logger';
import { calculateFinancialYearStart, toLocalYYYYMMDD } from '../utils/dateUtils';
import { db } from '../../../db/knex';

export class LeaveController {
  private leaveService: LeaveService;
  private balanceService: LeaveBalanceService;
  private approvalService: LeaveApprovalService;
  private aiService: AIService;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private applicationRepo: LeaveApplicationRepository;

  constructor() {
    this.leaveService = new LeaveService();
    this.balanceService = new LeaveBalanceService();
    this.approvalService = new LeaveApprovalService();
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
      const empIdVal = user ? (user.employee_id || (user as any).employeeId) : null;
      if (user && empIdVal) {
        return empIdVal;
      }
      if (user && user.email) {
        const empByEmail = await (this.applicationRepo as any).db('employees')
          .where('email', user.email)
          .first();
        if (empByEmail && empByEmail.id) {
          return empByEmail.id;
        }
      }
    } catch (e) { }
    return empId;
  }

  /**
   * Get leave types
   */
  async getLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const types = await (this.applicationRepo as any).db('leave_types')
        .where(function (this: any) {
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

      // Dynamic Notification Template Rendering for Manager
      try {
        const userRec = await (this.applicationRepo as any).db('users').where('id', ctx.userId).first();
        let emp = await (this.applicationRepo as any).db('employees').where('id', empId).first();
        const userEmail = userRec?.email || req.userEmail;
        if (!emp && userEmail) {
          emp = await (this.applicationRepo as any).db('employees').whereRaw('LOWER(email) = ?', [userEmail.toLowerCase()]).first();
        }
        
        const empName = (emp?.first_name || userRec?.first_name)
          ? `${emp?.first_name || userRec?.first_name} ${emp?.last_name || userRec?.last_name || ''}`.trim()
          : 'Rahul Sharma';

        let leaveTypeName = 'Leave';
        if (leaveTypeId) {
          const lt = await (this.applicationRepo as any).db('leave_types').where('id', leaveTypeId).first();
          if (lt?.name) leaveTypeName = lt.name;
        }

        let mgrUserId: number | null = null;
        let mgrName = 'Manager';

        if (emp && emp.reporting_manager_id) {
          const mgrEmp = await (this.applicationRepo as any).db('employees').where('id', emp.reporting_manager_id).first();
          if (mgrEmp) {
            mgrName = `${mgrEmp.first_name || ''} ${mgrEmp.last_name || ''}`.trim();
            const mgrUser = await (this.applicationRepo as any).db('users').whereRaw('LOWER(email) = ?', [mgrEmp.email.toLowerCase()]).first();
            if (mgrUser) mgrUserId = mgrUser.id;
          }
        }

        // Fallback: Find any active manager user in organization
        if (!mgrUserId) {
          const mgrUser = await (this.applicationRepo as any).db('users')
            .where('organization_id', ctx.organizationId)
            .whereRaw("LOWER(email) LIKE '%manager%'")
            .first();
          if (mgrUser) mgrUserId = mgrUser.id;
        }

        // Fetch Master Template from DB (ID 9 or LEAVE_REQUESTED)
        const tmpl = await (this.applicationRepo as any).db('notification_templates')
          .where('organization_id', ctx.organizationId)
          .where(function(this: any) {
            this.where('id', 9).orWhere('template_code', 'LEAVE_REQUESTED').orWhere('template_name', 'Leave Request Submitted');
          })
          .first().catch(() => null);

        const empCode = emp?.employee_code || `EMP${empId}`;
        const companyName = 'Apponext';

        let subject = tmpl?.subject || `🌴 New Leave Request from {{employee_name}} ({{leave_type}})`;
        let body = tmpl?.email_notification || tmpl?.body_text || tmpl?.body || `Hi {{manager_name}},\n\n{{employee_name}} ({{employee_code}}) has submitted a new {{leave_type}} application.\n\n• Employee Name: {{employee_name}} ({{employee_code}})\n• Leave Type: {{leave_type}}\n• Start Date: {{start_date}}\n• End Date: {{end_date}}\n• Reason: {{reason}}\n\nPlease review and approve/reject.\n\nRegards,\n{{company_name}} HR Team`;

        const replacements: Record<string, string> = {
          employee_name: empName,
          employee_code: empCode,
          manager_name: mgrName,
          leave_type: leaveTypeName,
          start_date: startDate,
          end_date: endDate,
          reason: reason || 'Personal work',
          company_name: companyName,
          action_url: '/leaves/approvals'
        };

        for (const [key, val] of Object.entries(replacements)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, val);
          body = body.replace(regex, val);
        }

        if (mgrUserId) {
          await (this.applicationRepo as any).db('notifications').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            event_code: 'LEAVE_REQUESTED',
            template_id: tmpl?.id || 9,
            recipient_id: mgrUserId,
            channels: JSON.stringify(['inapp', 'email']),
            subject_line: subject,
            body_text: body,
            variables: JSON.stringify(replacements),
            status: 'sent',
            priority: 'high',
            created_by: ctx.userId,
            updated_by: ctx.userId,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(() => {});
        }
      } catch (e) {}

      res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully',
        data: {
          id: application.id,
          uuid: application.uuid,
          status: application.status,
          total_days: (application as any).totalDays || application.total_days,
        },
        ...((application as any).team_conflict_warning && {
          team_conflict_warning: true,
          overlapping_count: (application as any).overlapping_count,
        }),
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
        .leftJoin('employees as emp', 'la.employee_id', 'emp.id')
        .leftJoin('employees as rm', 'emp.reporting_manager_id', 'rm.id')
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
          'lt.leave_code',
          'rm.first_name as rm_first_name',
          'rm.last_name as rm_last_name'
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
        const rmFirst = item.rmFirstName || item.rm_first_name;
        const rmLast = item.rmLastName || item.rm_last_name;
        const approverName = rmFirst || rmLast
          ? `${rmFirst || ''} ${rmLast || ''}`.trim()
          : 'HR / Admin';

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
          approverName,
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

      // Fetch employee info for frontend checks
      const employee = await (this.applicationRepo as any).db('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', empId)
        .whereNull('deleted_at')
        .first();

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
          'lb.expired_balance',
          'lt.leave_name',
          'lt.leave_code',
          'lt.description',
          'lt.paid_type',
          'lt.allocation_settings'
        )
        .where('lb.employee_id', empId)
        .where('lb.organization_id', ctx.organizationId)
        .where((builder: any) => {
          builder.where('lb.financial_year_start', currentFyStart)
            .orWhereRaw('DATE(lb.financial_year_start) = DATE(?)', [currentFyStart])
            .orWhereRaw('YEAR(lb.financial_year_start) = ?', [today.getFullYear()]);
        });

      // Fetch active assignments to find probation exclusion
      const assignments = await (this.applicationRepo as any).db('leave_policy_assignments')
        .where('employee_id', empId)
        .where('is_active', true)
        .whereNull('deleted_at');

      const assignmentsMap = new Map(
        assignments.map((a: any) => [a.leave_type_id || a.leaveTypeId, Boolean(a.probation_excluded || a.probationExcluded)])
      );

      // Map to return virtual default balances for missing leave types without writing to the DB
      const data = types.map((t: any) => {
        const match = existingBalances.find((b: any) => b.leaveTypeId === t.id || b.leave_type_id === t.id);
        const isProbationExcluded = assignmentsMap.get(t.id) ?? false;

        if (match) {
          let currentQuota = parseFloat(t.annualQuota ?? t.annual_quota ?? 0) || 0;
          if (!currentQuota && t.allocation_settings) {
            try {
              const parsedAlloc = typeof t.allocation_settings === 'string' ? JSON.parse(t.allocation_settings) : t.allocation_settings;
              currentQuota = parseFloat(parsedAlloc?.entitlementDays) || 0;
            } catch (e) {}
          }
          const matchAllocated = match.allocatedBalance !== undefined ? parseFloat(match.allocatedBalance) : parseFloat(match.allocated_balance) || 0;
          const quotaDiff = (currentQuota > 0 && matchAllocated > 0 && currentQuota > matchAllocated) ? (currentQuota - matchAllocated) : 0;

          const effectiveAllocated = matchAllocated + quotaDiff;
          const matchAvailable = match.availableBalance !== undefined ? parseFloat(match.availableBalance) : parseFloat(match.available_balance) || 0;
          const effectiveAvailable = matchAvailable + quotaDiff;

          return {
            id: match.id,
            employee_id: empId,
            leave_type_id: t.id,
            allocated_balance: effectiveAllocated,
            consumed_balance: match.consumedBalance !== undefined ? parseFloat(match.consumedBalance) : parseFloat(match.consumed_balance) || 0,
            pending_approval_balance: match.pendingApprovalBalance !== undefined ? parseFloat(match.pendingApprovalBalance) : parseFloat(match.pending_approval_balance) || 0,
            available_balance: effectiveAvailable,
            expired_balance: match.expired_balance !== undefined ? parseFloat(match.expired_balance) : parseFloat(match.expired_balance) || 0,
            leave_name: t.leaveName || t.leave_name,
            leave_code: t.leaveCode || t.leave_code,
            description: t.description,
            paid_type: t.paidType || t.paid_type,
            allow_negative_balance: Boolean(t.allowNegativeBalance ?? t.allow_negative_balance),
            negative_balance_action: t.negativeBalanceAction || t.negative_balance_action,
            pool_from_leave_type_id: t.poolFromLeaveTypeId || t.pool_from_leave_type_id,
            gender_applicable: t.gender_applicable || t.genderApplicable || 'all',
            probation_excluded: isProbationExcluded,
            allocation_settings: t.allocation_settings,
          };
        } else {
          let defaultQuota = parseFloat(t.annualQuota ?? t.annual_quota ?? 0) || 0;
          if (!defaultQuota && t.allocation_settings) {
            try {
              const parsedAlloc = typeof t.allocation_settings === 'string' ? JSON.parse(t.allocation_settings) : t.allocation_settings;
              defaultQuota = parseFloat(parsedAlloc?.entitlementDays) || 0;
            } catch (e) {}
          }
          return {
            id: null,
            employee_id: empId,
            leave_type_id: t.id,
            allocated_balance: defaultQuota,
            consumed_balance: 0,
            pending_approval_balance: 0,
            available_balance: defaultQuota,
            expired_balance: 0,
            leave_name: t.leaveName || t.leave_name,
            leave_code: t.leaveCode || t.leave_code,
            description: t.description,
            paid_type: t.paidType || t.paid_type,
            allow_negative_balance: Boolean(t.allowNegativeBalance ?? t.allow_negative_balance),
            negative_balance_action: t.negativeBalanceAction || t.negative_balance_action,
            pool_from_leave_type_id: t.poolFromLeaveTypeId || t.pool_from_leave_type_id,
            gender_applicable: t.gender_applicable || t.genderApplicable || 'all',
            probation_excluded: isProbationExcluded,
            allocation_settings: t.allocation_settings,
          };
        }
      });

      res.json({
        success: true,
        employee: employee ? {
          gender: employee.gender || 'other',
          status: employee.status || 'active',
          probationEndDate: employee.probation_end_date || employee.probationEndDate || null,
        } : null,
        data
      });
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

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await this.aiService.chatWithHRStream(ctx, message, history);

      for await (const chunk of stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          // Send each chunk as an SSE message
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }

      // Indicate stream is finished
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        this.handleError(error, res);
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
        res.end();
      }
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
   * Suggest best leave type based on reason text
   */
  async suggestLeaveType(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      if (!ctx.organizationId || !ctx.userId) {
        throw new UnauthorizedError('Missing tenant or user context');
      }
      const { employee_id, reason_text } = req.body;
      if (!employee_id || !reason_text) {
        throw new ValidationError('employee_id and reason_text are required');
      }

      const suggestion = await this.aiService.suggestLeaveType(ctx, employee_id, reason_text);
      res.json({ success: true, ...suggestion });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Optimize team coverage by suggesting alternative leave dates
   */
  async optimizeCoverage(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      if (!ctx.organizationId || !ctx.userId) {
        throw new UnauthorizedError('Missing tenant or user context');
      }
      const { request_id, department_id, requested_start_date, requested_end_date } = req.body;
      if (!department_id || !requested_start_date || !requested_end_date) {
        throw new ValidationError('department_id, requested_start_date, and requested_end_date are required');
      }

      const suggestions = await this.aiService.optimizeCoverage(
        ctx,
        request_id || null,
        department_id,
        requested_start_date,
        requested_end_date
      );
      res.json({ success: true, data: suggestions });
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
   * Get policy mappings
   */
  async getPolicyMappings(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const hasRoleIdCol = await db.schema.hasColumn('leave_policy_mappings', 'role_id');
      
      let query = db('leave_policy_mappings as lpm')
        .join('leave_policies as lp', 'lpm.leave_policy_id', 'lp.id')
        .leftJoin('departments as d', 'lpm.department_id', 'd.id')
        .leftJoin('designations as dg', 'lpm.designation_id', 'dg.id')
        .where('lpm.organization_id', ctx.organizationId)
        .whereNull('lpm.deleted_at');

      if (hasRoleIdCol) {
        query = query
          .leftJoin('roles as r', 'lpm.role_id', 'r.id')
          .select(
            'lpm.*',
            'lp.name as policy_name',
            'r.name as role_name',
            'd.name as department_name',
            'dg.name as designation_name'
          );
      } else {
        query = query.select(
          'lpm.*',
          'lp.name as policy_name',
          'd.name as department_name',
          'dg.name as designation_name'
        );
      }

      const mappings = await query;
      res.json({ success: true, data: mappings });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create policy mapping
   */
  async createPolicyMapping(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { leavePolicyId, roleId, departmentId, designationId, employmentType, priority } = req.body;
      if (!leavePolicyId) {
        throw new ValidationError('Leave policy ID is required');
      }
      const uuid = uuidv4();
      const [id] = await db('leave_policy_mappings').insert({
        uuid,
        organization_id: ctx.organizationId,
        leave_policy_id: parseInt(leavePolicyId, 10),
        role_id: roleId ? parseInt(roleId, 10) : null,
        department_id: departmentId ? parseInt(departmentId, 10) : null,
        designation_id: designationId ? parseInt(designationId, 10) : null,
        employment_type: employmentType || null,
        priority: parseInt(priority, 10) || 0,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });
      res.status(201).json({ success: true, message: 'Policy mapping created successfully', data: { id, uuid } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete policy mapping
   */
  async deletePolicyMapping(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { mappingId } = req.params;
      await db('leave_policy_mappings')
        .where({ organization_id: ctx.organizationId, id: parseInt(mappingId, 10) })
        .update({
          deleted_at: new Date(),
          updated_by: ctx.userId,
          updated_at: new Date()
        });
      res.json({ success: true, message: 'Policy mapping deleted successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get optional holidays
   */
  async getOptionalHolidays(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const employee = await db('employees').where('id', empId).first();
      const locationId = employee ? employee.current_location_id : null;
      const startYear = new Date().getFullYear();

      let calendar = null;
      if (locationId) {
        calendar = await db('holiday_calendars')
          .where('organization_id', ctx.organizationId)
          .where('year', startYear)
          .where('applicable_location_id', locationId)
          .where('status', 'active')
          .whereNull('deleted_at')
          .first();
      }
      if (!calendar) {
        calendar = await db('holiday_calendars')
          .where('organization_id', ctx.organizationId)
          .where('year', startYear)
          .where('is_default', true)
          .where('status', 'active')
          .whereNull('deleted_at')
          .first();
      }

      if (!calendar) {
        res.json({ success: true, data: [] });
        return;
      }

      const holidays = await db('holidays')
        .where({
          organization_id: ctx.organizationId,
          holiday_calendar_id: calendar.id,
          is_optional: true
        })
        .whereNull('deleted_at');

      const selections = await db('optional_holiday_selections')
        .where({
          organization_id: ctx.organizationId,
          employee_id: empId,
          year: startYear
        })
        .whereNull('deleted_at');

      const data = holidays.map(h => {
        const selection = selections.find(s => s.holiday_id === h.id);
        return {
          ...h,
          selected: !!selection,
          selection_status: selection ? selection.status : null,
          selection_id: selection ? selection.id : null
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Select optional holiday
   */
  async selectOptionalHoliday(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { holidayId } = req.body;
      if (!holidayId) {
        throw new ValidationError('Holiday ID is required');
      }

      const year = new Date().getFullYear();

      const holiday = await db('holidays')
        .where({ id: parseInt(holidayId, 10), organization_id: ctx.organizationId, is_optional: true })
        .whereNull('deleted_at')
        .first();

      if (!holiday) {
        throw new NotFoundError('Optional holiday not found or not eligible');
      }

      let quota = 2;
      const assignment = await db('leave_policy_assignments')
        .where({ employee_id: empId, organization_id: ctx.organizationId, is_active: true })
        .whereNull('deleted_at')
        .first();

      if (assignment && assignment.floating_holiday_quota !== undefined && assignment.floating_holiday_quota !== null) {
        quota = assignment.floating_holiday_quota;
      }

      const currentSelections = await db('optional_holiday_selections')
        .where({ employee_id: empId, organization_id: ctx.organizationId, year })
        .whereIn('status', ['pending', 'approved'])
        .whereNull('deleted_at');

      if (currentSelections.length >= quota) {
        throw new ValidationError(`You have already selected ${currentSelections.length} optional holidays. Your annual quota is ${quota}.`);
      }

      const uuid = uuidv4();
      const [id] = await db('optional_holiday_selections').insert({
        uuid,
        organization_id: ctx.organizationId,
        employee_id: empId,
        holiday_id: parseInt(holidayId, 10),
        year,
        status: 'approved',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.status(201).json({ success: true, message: 'Optional holiday selected successfully', data: { id, uuid } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Cancel optional holiday selection
   */
  async cancelOptionalHolidaySelection(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { selectionId } = req.params;
      const empId = await this.getEmployeeIdFromCtx(ctx);

      const selection = await db('optional_holiday_selections')
        .where({ id: parseInt(selectionId, 10), employee_id: empId, organization_id: ctx.organizationId })
        .first();

      if (!selection) {
        throw new NotFoundError('Selection record not found');
      }

      await db('optional_holiday_selections')
        .where({ id: selection.id })
        .update({
          deleted_at: new Date(),
          updated_by: ctx.userId,
          updated_at: new Date()
        });

      res.json({ success: true, message: 'Optional holiday selection cancelled successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get all active leave policies
   */
  async getPolicies(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const policies = await db('leave_policies')
        .where('organization_id', ctx.organizationId)
        .where('status', 'active')
        .whereNull('deleted_at');
      res.json({ success: true, data: policies });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update active leave policy metadata
   */
  async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = parseInt(req.params.id, 10);
      const { earnedLeaveEntitlementPercent, entitlementIncludesPublicHolidays } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid policy ID');
      }

      const policy = await db('leave_policies')
        .where('id', id)
        .where('organization_id', ctx.organizationId)
        .first();

      if (!policy) {
        throw new NotFoundError('Leave policy not found');
      }

      await db('leave_policies')
        .where('id', id)
        .update({
          earned_leave_entitlement_percent: earnedLeaveEntitlementPercent !== undefined && earnedLeaveEntitlementPercent !== null ? parseFloat(earnedLeaveEntitlementPercent) : null,
          entitlement_includes_public_holidays: entitlementIncludesPublicHolidays !== undefined ? !!entitlementIncludesPublicHolidays : false,
          updated_at: new Date()
        });

      res.json({ success: true, message: 'Leave policy updated successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get processed approvals (approved/rejected history)
   */
  async getProcessedApprovals(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { page = 1, pageSize = 50 } = req.query;
      const history = await this.applicationRepo.getHistoryForApprover(ctx, ctx.userId, {
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });
      res.json({ success: true, data: history });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get approval history list (comments/actions) for an application
   */
  async getApprovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { applicationId } = req.params;
      const history = await this.approvalService.getApprovalHistory(ctx, parseInt(applicationId, 10));
      res.json({ success: true, data: history });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get all blackout periods
   */
  async getBlackoutPeriods(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const data = await db('leave_blackout_periods as lbp')
        .leftJoin('departments as d', 'lbp.applicable_department_id', 'd.id')
        .leftJoin('locations as l', 'lbp.applicable_location_id', 'l.id')
        .where('lbp.organization_id', ctx.organizationId)
        .whereNull('lbp.deleted_at')
        .select(
          'lbp.*',
          'd.name as department_name',
          'l.name as location_name'
        )
        .orderBy('lbp.start_date', 'asc');

      res.json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create a new blackout period
   */
  async createBlackoutPeriod(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { start_date, end_date, reason, applicable_department_id, applicable_location_id } = req.body;

      if (!start_date || !end_date || !reason) {
        throw new ValidationError('Start date, end date, and reason are required.');
      }

      const inserted = await db('leave_blackout_periods').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        start_date,
        end_date,
        reason,
        applicable_department_id: applicable_department_id ? parseInt(applicable_department_id, 10) : null,
        applicable_location_id: applicable_location_id ? parseInt(applicable_location_id, 10) : null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.json({ success: true, message: 'Blackout period created successfully.', data: inserted });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete a blackout period (soft delete)
   */
  async deleteBlackoutPeriod(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { id } = req.params;

      await db('leave_blackout_periods')
        .where('id', parseInt(id, 10))
        .where('organization_id', ctx.organizationId)
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        });

      res.json({ success: true, message: 'Blackout period deleted successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }


  /**
   * Manually trigger comp-off and carry-forward expiry checks
   */
  async runExpiryCron(req: Request, res: Response): Promise<void> {
    try {
      const jobService = new LeaveExpiryJobService();
      const result = await jobService.runExpiryJobs();
      res.json({ success: true, message: 'Expiry jobs executed successfully.', data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Manually trigger allocation cron checks
   */
  async runAllocationCron(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const accrualService = new LeaveAccrualService();

      await accrualService.accrueMonthlyLeaves(ctx, ctx.organizationId);
      await accrualService.accrueQuarterlyLeaves(ctx);
      await accrualService.accrueYearlyLeaves(ctx);
      await accrualService.accrueAnniversaryLeaves(ctx);
      await accrualService.reconcileHoursWorkedAccruals(ctx);
      await accrualService.reconcileNonCalendarRulesAccruals(ctx);

      res.json({ success: true, message: 'Leave allocation cron executed successfully!' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Save a scheduled custom report delivery configuration
   */
  async createReportSchedule(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { scheduleName, frequency, entity, fields, filters } = req.body;

      if (!scheduleName || !frequency || !entity || !fields) {
        throw new ValidationError('Schedule name, frequency, entity, and fields are required.');
      }

      await db('leave_report_schedules').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        user_id: ctx.userId,
        schedule_name: scheduleName,
        frequency,
        entity,
        fields: Array.isArray(fields) ? fields.join(',') : fields,
        filters: typeof filters === 'string' ? filters : JSON.stringify(filters || {}),
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.json({ success: true, message: 'Report delivery scheduled successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * List scheduled reports for logged-in user
   */
  async getReportSchedules(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const data = await db('leave_report_schedules')
        .where('user_id', ctx.userId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc');

      res.json({ success: true, data });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * AI-Powered Leave Utilization Forecast (next 3 months)
   */
  async getLeaveForecast(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      if (!ctx.organizationId) {
        throw new UnauthorizedError('Missing tenant context');
      }

      // Build historical monthly aggregation from leave_applications (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyData = await db('leave_applications')
        .where('organization_id', ctx.organizationId)
        .where('status', 'approved')
        .where('application_start_date', '>=', twelveMonthsAgo.toISOString().split('T')[0])
        .whereNull('deleted_at')
        .select(
          db.raw("DATE_FORMAT(application_start_date, '%Y-%m') as month_key"),
          db.raw('SUM(total_days) as daysTaken')
        )
        .groupByRaw("DATE_FORMAT(application_start_date, '%Y-%m')")
        .orderBy('month_key', 'asc');

      const historyData = monthlyData.map((r: any) => ({
        month: r.month_key,
        daysTaken: parseFloat(r.daysTaken) || 0,
      }));

      // If no history, provide a minimal default
      if (historyData.length === 0) {
        for (let i = 3; i >= 1; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          historyData.push({
            month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            daysTaken: Math.round(Math.random() * 8 + 2),
          });
        }
      }

      const result = await this.aiService.forecastFutureLeaves(ctx, historyData);

      res.json({ success: true, history: historyData, ...result });
    } catch (error) {
      this.handleError(error, res);
    }
  }



  /**
   * Get Leave Encashment Settings
   */
  async getEncashmentSettings(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;

      await this.ensureLeaveEncashmentSchema(db);

      const settings = await db('leave_encashment_settings')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .orderBy('id', 'asc');
      res.json({ success: true, data: settings });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create Leave Encashment Setting
   */
  async createEncashmentSetting(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { name, formula, limit, isActive, employment, daysBasis } = req.body;
      if (!name || !formula) {
        throw new ValidationError('Name and formula are required');
      }
      await this.ensureLeaveEncashmentSchema(db);
      const [id] = await db('leave_encashment_settings').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        name,
        formula,
        limit: limit ? parseFloat(limit) : null,
        is_active: isActive !== undefined ? !!isActive : true,
        days_basis: daysBasis ? parseInt(daysBasis, 10) : 30,
        employment: employment ? (typeof employment === 'string' ? employment : JSON.stringify(employment)) : null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update Leave Encashment Setting
   */
  async updateEncashmentSetting(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = Number(req.params.id);
      const { name, formula, limit, isActive, employment, daysBasis } = req.body;
      await this.ensureLeaveEncashmentSchema(db);
      const count = await db('leave_encashment_settings')
        .where({ id, organization_id: ctx.organizationId })
        .update({
          name,
          formula,
          limit: limit ? parseFloat(limit) : null,
          is_active: isActive !== undefined ? !!isActive : true,
          days_basis: daysBasis ? parseInt(daysBasis, 10) : 30,
          employment: employment ? (typeof employment === 'string' ? employment : JSON.stringify(employment)) : null,
          updated_by: ctx.userId,
          updated_at: new Date()
        });
      if (!count) {
        throw new NotFoundError('Leave encashment setting not found');
      }
      res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete Leave Encashment Setting
   */
  async deleteEncashmentSetting(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = Number(req.params.id);
      const count = await db('leave_encashment_settings')
        .where({ id, organization_id: ctx.organizationId })
        .update({
          deleted_at: new Date(),
          is_active: false,
          updated_by: ctx.userId,
          updated_at: new Date()
        });
      if (!count) {
        throw new NotFoundError('Leave encashment setting not found');
      }
      res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private async ensureLeaveEncashmentSchema(db: any): Promise<void> {
    try {
      const hasDaysBasis = await db.schema.hasColumn('leave_encashment_settings', 'days_basis');
      if (!hasDaysBasis) {
        await db.schema.alterTable('leave_encashment_settings', (table: any) => {
          table.integer('days_basis').defaultTo(30);
        });
        logger.info('[LeaveController] Added days_basis column to leave_encashment_settings');
      }

      const hasSettingId = await db.schema.hasColumn('leave_encashments', 'leave_encashment_setting_id');
      if (!hasSettingId) {
        await db.schema.alterTable('leave_encashments', (table: any) => {
          table.bigInteger('leave_encashment_setting_id').unsigned().nullable();
          table.foreign('leave_encashment_setting_id').references('leave_encashment_settings.id');
        });
        logger.info('[LeaveController] Added leave_encashment_setting_id column to leave_encashments');
      }
    } catch (err) {
      logger.error('[LeaveController] ensureLeaveEncashmentSchema error:', err);
    }
  }

  private async checkIsAdminOrHR(ctx: any): Promise<boolean> {
    const isAdmin = await db('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', ctx.userId)
      .where('ur.organization_id', ctx.organizationId)
      .whereIn('r.code', ['admin', 'hr_manager', 'super_admin'])
      .first();
    return !!isAdmin;
  }

  private async calculateEncashmentHelper(
    db: any,
    ctx: any,
    employeeId: number,
    leaveTypeId: number,
    leaveEncashmentSettingId: number,
    requestedDays: number,
    isFullAndFinal: boolean
  ) {
    // 1. Fetch employee
    const employee = await db('employees').where({ id: employeeId, organization_id: ctx.organizationId }).first();
    if (!employee) {
      throw new ValidationError('Employee record not found.');
    }

    // 2. Fetch policy setting
    const policy = await db('leave_encashment_settings')
      .where({ id: leaveEncashmentSettingId, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .first();
    if (!policy) {
      throw new ValidationError('Encashment policy configuration not found.');
    }
    if (!policy.is_active) {
      throw new ValidationError('Selected encashment policy is inactive.');
    }

    // 3. Fetch employee's current active salary structure
    const struct = await db('employee_salary_structures as ess')
      .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where({ 'ess.employee_id': employeeId, 'ess.is_current': true, 'ess.organization_id': ctx.organizationId })
      .whereNull('ess.deleted_at')
      .select('ss.*')
      .first();

    if (!struct) {
      throw new ValidationError('Active salary structure not found for this employee.');
    }

    // 4. Parse formula and sum components
    const formulaStr = policy.formula || 'basic_monthly';
    const components = formulaStr.split('+').map((c: string) => c.trim().toLowerCase());
    let sum = 0;
    for (const comp of components) {
      if (comp === 'basic' || comp === 'basic_monthly' || comp === 'basic monthly') {
        sum += Number(struct.basic_monthly || 0);
      } else if (comp === 'hra' || comp === 'hra_monthly' || comp === 'hra monthly') {
        sum += Number(struct.hra_monthly || 0);
      } else if (comp === 'special_allowance' || comp === 'special allowance' || comp === 'special_allowance_monthly') {
        sum += Number(struct.special_allowance_monthly || 0);
      } else if (comp === 'gross' || comp === 'gross_monthly' || comp === 'gross monthly') {
        sum += Number(struct.gross_monthly || 0);
      } else {
        // Look inside custom_components JSON if it exists
        let customVal = 0;
        if (struct.custom_components) {
          try {
            const custom = typeof struct.custom_components === 'string'
              ? JSON.parse(struct.custom_components)
              : struct.custom_components;
            if (custom && custom[comp] !== undefined) {
              customVal = Number(custom[comp] || 0);
            } else {
              // Try case-insensitive matching in custom JSON keys
              const foundKey = Object.keys(custom).find(k => k.toLowerCase() === comp);
              if (foundKey) {
                customVal = Number(custom[foundKey] || 0);
              }
            }
          } catch (e) {
            console.error('Error parsing custom components:', e);
          }
        }
        sum += customVal;
      }
    }

    // 5. Calculate daily rate
    const daysBasis = Number(policy.days_basis || 30);
    const dailyRate = sum / daysBasis;

    // 6. Fetch leave balance
    const settings = await db('organization_leave_settings')
      .where('organization_id', ctx.organizationId)
      .first()
      .catch(() => null);
    const startMonth = settings ? (settings.holiday_year_start_month || 1) : 1;

    const now = new Date();
    const currentYear = now.getFullYear();
    let fyStartYear = currentYear;
    if (now.getMonth() + 1 < startMonth) {
      fyStartYear = currentYear - 1;
    }
    const financialYearStart = `${fyStartYear}-${String(startMonth).padStart(2, '0')}-01`;

    const balance = await db('leave_balances')
      .where({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        financial_year_start: financialYearStart
      })
      .first();

    const availableBalance = balance ? Number(balance.available_balance || 0) : 0;

    // 7. Apply limits for FNF/resignation if enabled
    let cappedDays = requestedDays;
    if (isFullAndFinal && policy.limit !== null && policy.limit !== undefined) {
      cappedDays = Math.min(requestedDays, Number(policy.limit));
    }

    const totalAmount = dailyRate * cappedDays;

    return {
      employeeName: `${employee.first_name} ${employee.last_name}`,
      policyName: policy.name,
      formula: policy.formula,
      daysBasis,
      dailyRate: Number(dailyRate.toFixed(2)),
      requestedDays,
      cappedDays,
      availableBalance,
      totalAmount: Number(totalAmount.toFixed(2)),
      financialYearStart
    };
  }

  async previewLeaveEncashment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { employeeId, leaveTypeId, leaveEncashmentSettingId, encashmentDays, isFullAndFinal } = req.body;
      if (!employeeId || !leaveTypeId || !leaveEncashmentSettingId || encashmentDays === undefined) {
        throw new ValidationError('All fields are required for preview calculation.');
      }
      await this.ensureLeaveEncashmentSchema(db);

      const result = await this.calculateEncashmentHelper(
        db,
        ctx,
        Number(employeeId),
        Number(leaveTypeId),
        Number(leaveEncashmentSettingId),
        Number(encashmentDays),
        !!isFullAndFinal
      );

      res.json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async requestLeaveEncashment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { employeeId, leaveTypeId, leaveEncashmentSettingId, encashmentDays, isFullAndFinal } = req.body;
      if (!employeeId || !leaveTypeId || !leaveEncashmentSettingId || encashmentDays === undefined) {
        throw new ValidationError('All fields are required.');
      }
      await this.ensureLeaveEncashmentSchema(db);

      const empIdNum = Number(employeeId);
      const loggedInEmpId = await this.getEmployeeIdFromCtx(ctx);
      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);

      if (!isAdminOrHR && empIdNum !== loggedInEmpId) {
        throw new ForbiddenError('You can only request leave encashment for yourself.');
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const existingPending = await db('leave_encashments')
        .where({
          organization_id: ctx.organizationId,
          employee_id: empIdNum,
          leave_encashment_setting_id: Number(leaveEncashmentSettingId),
          status: 'pending'
        })
        .whereBetween('encashment_date', [startOfMonth, endOfMonth])
        .whereNull('deleted_at')
        .first();

      if (existingPending) {
        throw new ValidationError('A pending encashment request already exists for this policy and employee in the current month.');
      }

      const calc = await this.calculateEncashmentHelper(
        db,
        ctx,
        empIdNum,
        Number(leaveTypeId),
        Number(leaveEncashmentSettingId),
        Number(encashmentDays),
        !!isFullAndFinal
      );

      if (calc.cappedDays > calc.availableBalance) {
        throw new ValidationError(`Requested encashment days (${calc.cappedDays}) exceed the available balance (${calc.availableBalance} days).`);
      }

      const [insertedId] = await db('leave_encashments').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: empIdNum,
        financial_year_start: calc.financialYearStart,
        leave_type_id: Number(leaveTypeId),
        leave_encashment_setting_id: Number(leaveEncashmentSettingId),
        encashment_days: calc.cappedDays,
        daily_rate: calc.dailyRate,
        total_amount: calc.totalAmount,
        encashment_date: now,
        status: 'pending',
        processed: false,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: now,
        updated_at: now
      });

      res.status(201).json({ success: true, message: 'Leave encashment request submitted successfully.', data: { id: insertedId } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getMyEncashments(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      await this.ensureLeaveEncashmentSchema(db);

      const loggedInEmpId = await this.getEmployeeIdFromCtx(ctx);
      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);

      let query = db('leave_encashments as le')
        .join('leave_types as lt', 'le.leave_type_id', 'lt.id')
        .join('employees as e', 'le.employee_id', 'e.id')
        .leftJoin('leave_encashment_settings as les', 'le.leave_encashment_setting_id', 'les.id')
        .where('le.organization_id', ctx.organizationId)
        .whereNull('le.deleted_at')
        .select(
          'le.*',
          'lt.leave_name',
          'lt.leave_code',
          'e.first_name',
          'e.last_name',
          'e.employee_code',
          'les.name as policy_name'
        )
        .orderBy('le.created_at', 'desc');

      if (!isAdminOrHR) {
        query = query.where('le.employee_id', loggedInEmpId);
      }

      const list = await query;
      res.json({ success: true, data: list });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getPendingEncashments(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      await this.ensureLeaveEncashmentSchema(db);

      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);
      if (!isAdminOrHR) {
        throw new ForbiddenError('Only Admin or HR Manager is allowed to view pending requests.');
      }

      let listQuery = db('leave_encashments as le')
        .join('leave_types as lt', 'le.leave_type_id', 'lt.id')
        .join('employees as e', 'le.employee_id', 'e.id')
        .leftJoin('leave_encashment_settings as les', 'le.leave_encashment_setting_id', 'les.id')
        .where({
          'le.organization_id': ctx.organizationId,
          'le.status': 'pending'
        })
        .whereNull('le.deleted_at');

      if (ctx.companyId) {
        listQuery = listQuery.where('e.company_id', ctx.companyId);
      }

      const list = await listQuery
        .select(
          'le.*',
          'lt.leave_name',
          'lt.leave_code',
          'e.first_name',
          'e.last_name',
          'e.employee_code',
          'les.name as policy_name'
        )
        .orderBy('le.created_at', 'desc');

      res.json({ success: true, data: list });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async approveEncashment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = Number(req.params.id);
      await this.ensureLeaveEncashmentSchema(db);

      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);
      if (!isAdminOrHR) {
        throw new ForbiddenError('Only Admin or HR Manager is allowed to approve requests.');
      }

      const count = await db('leave_encashments')
        .where({ id, organization_id: ctx.organizationId, status: 'pending' })
        .update({
          status: 'approved',
          updated_by: ctx.userId,
          updated_at: new Date()
        });

      if (!count) {
        throw new ValidationError('Pending encashment request not found or already processed.');
      }

      res.json({ success: true, message: 'Request approved successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async rejectEncashment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = Number(req.params.id);
      const { comments, reason } = req.body;
      await this.ensureLeaveEncashmentSchema(db);

      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);
      if (!isAdminOrHR) {
        throw new ForbiddenError('Only Admin or HR Manager is allowed to reject requests.');
      }

      const count = await db('leave_encashments')
        .where({ id, organization_id: ctx.organizationId, status: 'pending' })
        .update({
          status: 'rejected',
          reason: reason || comments || 'Rejected by Admin',
          updated_by: ctx.userId,
          updated_at: new Date()
        });

      if (!count) {
        throw new ValidationError('Pending encashment request not found or already processed.');
      }

      res.json({ success: true, message: 'Request rejected successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async markEncashmentAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const id = Number(req.params.id);
      await this.ensureLeaveEncashmentSchema(db);

      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);
      if (!isAdminOrHR) {
        throw new ForbiddenError('Only Admin or HR Manager is allowed to mark requests as paid.');
      }

      const encashment = await db('leave_encashments')
        .where({ id, organization_id: ctx.organizationId, status: 'approved' })
        .first();

      if (!encashment) {
        throw new ValidationError('Approved encashment request not found.');
      }

      await db.transaction(async (trx) => {
        const balance = await trx('leave_balances')
          .where({
            organization_id: ctx.organizationId,
            employee_id: encashment.employee_id,
            leave_type_id: encashment.leave_type_id,
            financial_year_start: encashment.financial_year_start
          })
          .first();

        if (!balance || Number(balance.available_balance) < Number(encashment.encashment_days)) {
          throw new ValidationError('Insufficient available leave balance to complete transaction.');
        }

        const updatedAvailable = Number(balance.available_balance) - Number(encashment.encashment_days);
        const updatedEncashed = Number(balance.encashed_balance || 0) + Number(encashment.encashment_days);

        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            available_balance: updatedAvailable,
            encashed_balance: updatedEncashed,
            last_updated_at: new Date(),
            updated_by: ctx.userId,
            updated_at: new Date()
          });

        await trx('leave_ledger_entries').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: encashment.employee_id,
          leave_type_id: encashment.leave_type_id,
          transaction_type: 'ENCASHMENT',
          amount: -Number(encashment.encashment_days),
          reference_id: encashment.uuid,
          effective_date: new Date(),
          remarks: `Leave encashment request paid: ID ${id}`,
          created_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });

        await trx('leave_encashments')
          .where('id', id)
          .update({
            status: 'paid',
            processed: true,
            updated_by: ctx.userId,
            updated_at: new Date()
          });
      });

      res.json({ success: true, message: 'Request marked as Paid and leave balance adjusted successfully.' });
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
    } else if (error instanceof ForbiddenError) {
      res.status(403).json({ success: false, error: { message: error.message } });
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

