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
import { evaluateConditionGroup } from '../utils/ruleEngine';
import { holidayCalendarService } from '../../master/services/HolidayCalendarService';

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
   * Evaluates if a leave type is eligible/visible for the given employee.
   * This must mirror every check that LeaveService.checkEmploymentEligibility
   * performs at application time so that ineligible leave types are never shown.
   */
  private filterEligibleLeaveTypes(types: any[], employee: any): any[] {
    if (!employee) return types;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    // Normalized employee facts context
    const empCtx: any = {
      ...(employee || {}),
      gender: (employee.gender || '').toString().toLowerCase().trim(),
      marital_status: (employee.marital_status || employee.maritalStatus || employee.marital || '').toString().toLowerCase().trim(),
      current_department_id: employee.current_department_id || employee.currentDepartmentId || employee.department_id || employee.departmentId,
      current_location_id: employee.current_location_id || employee.currentLocationId || employee.location_id || employee.locationId || employee.branch_id || employee.branchId,
      current_grade_id: employee.current_grade_id || employee.currentGradeId || employee.grade_id || employee.gradeId || employee.grade,
      current_designation_id: employee.current_designation_id || employee.currentDesignationId || employee.designation_id || employee.designationId,
      employment_type: (employee.employment_type || employee.employmentType || '').toString(),
      status: (employee.status || '').toString(),
      date_of_joining: employee.date_of_joining || employee.dateOfJoining,
      date_of_birth: employee.date_of_birth || employee.dateOfBirth,
      date_of_confirmation: employee.date_of_confirmation || employee.dateOfConfirmation || employee.confirmation_date || employee.confirmationDate,
      last_working_date: employee.last_working_date || employee.lastWorkingDate,
      resignation_date: employee.resignation_date || employee.resignationDate,
      sub_department_id: employee.sub_department_id || employee.subDepartmentId,
      company_id: employee.company_id || employee.companyId,
      organization_id: employee.organization_id || employee.organizationId,
    };

    // Robust overlap helper — matches the logic in LeaveService.checkEmploymentEligibility
    const hasOverlap = (employeeVal: any, ruleArray: any[]): boolean => {
      const cleanRules = (ruleArray || []).filter(
        (r: any) => r !== null && r !== undefined && r !== '' && String(r).toLowerCase() !== 'select' && String(r).toLowerCase() !== 'all'
      );
      if (cleanRules.length === 0) return true; // No restriction configured → everyone eligible
      if (employeeVal === undefined || employeeVal === null || employeeVal === '') return true; // Employee field not set → don't block
      const eArray = Array.isArray(employeeVal) ? employeeVal : [employeeVal];
      return eArray.some(e =>
        cleanRules.includes(e) ||
        cleanRules.includes(String(e)) ||
        (typeof e === 'number' && cleanRules.includes(Number(e)))
      );
    };

    const parseJson = (raw: any): any => {
      if (!raw) return {};
      try {
        let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed); // double-stringified
        return (typeof parsed === 'object' && parsed !== null) ? parsed : {};
      } catch (e) { return {}; }
    };

    return types.filter((t: any) => {
      const allocSettings = parseJson(t.allocation_settings || t.allocationSettings);
      const appSettings = parseJson(t.application_settings || t.applicationSettings);
      const empAllocSettings = parseJson(t.employment_allocation_settings || t.employmentAllocationSettings);
      const empAppSettings = parseJson(t.employment_application_settings || t.employmentApplicationSettings);

      // ── 1. Effective date window ──
      const effFrom = t.effective_from || t.effectiveFrom || allocSettings.effective_from || allocSettings.effectiveFrom;
      const effTo = t.effective_to || t.effectiveTo || allocSettings.effective_to || allocSettings.effectiveTo;
      if (effFrom && todayStr < effFrom) return false; // Not yet active
      if (effTo && todayStr > effTo) return false;     // Expired

      // Helper to check if onlyWhen has a dynamic condition on a specific fact
      const hasFactInGroup = (group: any, targetFact: string): boolean => {
        if (!group) return false;
        const cleanFact = targetFact.toLowerCase().replace(/[\s_-]+/g, '');
        const list = group.conditions || group.rules;
        if (!Array.isArray(list) || list.length === 0) return false;
        return list.some((c: any) => {
          if (c.conjunction || c.conditions || c.rules) return hasFactInGroup(c, targetFact);
          const f = (c.fact || c.field || '').toString().toLowerCase().replace(/[\s_-]+/g, '');
          return f === cleanFact && Boolean(c.operator);
        });
      };

      const allocOnlyWhen = allocSettings.onlyWhen || allocSettings.only_when || t.only_when || t.onlyWhen;
      const appOnlyWhen = appSettings.onlyWhen || appSettings.only_when;
      const hasOnlyWhenGender = hasFactInGroup(allocOnlyWhen, 'gender') || hasFactInGroup(appOnlyWhen, 'gender');
      const hasOnlyWhenMarital = hasFactInGroup(allocOnlyWhen, 'marital_status') || hasFactInGroup(appOnlyWhen, 'marital_status');

      // ── 2. Gender applicability (leave-type level + allocation settings, evaluated only if onlyWhen does not define gender rules) ──
      if (!hasOnlyWhenGender) {
        const genderApplicable = (
          t.gender_applicable || t.genderApplicable || allocSettings.gender || 'all'
        ).toString().toLowerCase().trim();
        if (genderApplicable !== 'all' && genderApplicable !== 'both' && genderApplicable !== '') {
          const empGender = (empCtx.gender || '').toLowerCase().trim();
          if (empGender && empGender !== genderApplicable) return false;
        }
      }

      // ── 3. Marital status ──
      if (!hasOnlyWhenMarital) {
        const maritalReq = (allocSettings.maritalStatus || '').toLowerCase().trim();
        if (maritalReq && maritalReq !== 'all' && maritalReq !== '') {
          const empMarital = (empCtx.marital_status || '').toLowerCase().trim();
          if (empMarital && empMarital !== maritalReq) return false;
        }
      }

      // ── 4. onlyWhen rule trees (allocation + application) ──
      if (allocOnlyWhen) {
        if (!evaluateConditionGroup(allocOnlyWhen, empCtx)) return false;
      }
      if (appOnlyWhen) {
        if (!evaluateConditionGroup(appOnlyWhen, empCtx)) return false;
      }

      // ── 5. Employment Allocation scope (comprehensive) ──
      if (empAllocSettings && Object.keys(empAllocSettings).length > 0) {
        const compVal = employee.company_id || employee.companyId || employee.organization_id || employee.organizationId;
        if (!hasOverlap(compVal, empAllocSettings.companies || empAllocSettings.organizations)) return false;

        const deptVal = employee.current_department_id || employee.currentDepartmentId || employee.department_id || employee.departmentId;
        if (!hasOverlap(deptVal, empAllocSettings.departments)) return false;

        const subDeptVal = employee.sub_department_id || employee.subDepartmentId;
        if (!hasOverlap(subDeptVal, empAllocSettings.subDepartments || empAllocSettings.sub_departments)) return false;

        const locVal = employee.current_location_id || employee.currentLocationId || employee.location_id || employee.locationId || employee.branch_id || employee.branchId;
        if (!hasOverlap(locVal, empAllocSettings.locations)) return false;

        const desigVal = employee.current_designation_id || employee.currentDesignationId || employee.designation_id || employee.designationId;
        if (!hasOverlap(desigVal, empAllocSettings.designations)) return false;

        const empTypeVal = employee.employment_type || employee.employmentType || employee.employee_type || employee.employeeType;
        if (!hasOverlap(empTypeVal, empAllocSettings.employeeTypes)) return false;

        const statusVal = employee.status;
        if (!hasOverlap(statusVal, empAllocSettings.employeeStatuses)) return false;

        const gradeVal = employee.current_grade_id || employee.currentGradeId || employee.grade_id || employee.gradeId || employee.grade || employee.grade_band;
        if (!hasOverlap(gradeVal, empAllocSettings.grades)) return false;
      }

      // ── 6. Employment Application scope (comprehensive) ──
      if (empAppSettings && Object.keys(empAppSettings).length > 0) {
        const compVal = employee.company_id || employee.companyId || employee.organization_id || employee.organizationId;
        if (!hasOverlap(compVal, empAppSettings.companies || empAppSettings.organizations)) return false;

        const deptVal = employee.current_department_id || employee.currentDepartmentId || employee.department_id || employee.departmentId;
        if (!hasOverlap(deptVal, empAppSettings.departments)) return false;

        const subDeptVal = employee.sub_department_id || employee.subDepartmentId;
        if (!hasOverlap(subDeptVal, empAppSettings.subDepartments || empAppSettings.sub_departments)) return false;

        const locVal = employee.current_location_id || employee.currentLocationId || employee.location_id || employee.locationId || employee.branch_id || employee.branchId;
        if (!hasOverlap(locVal, empAppSettings.locations)) return false;

        const desigVal = employee.current_designation_id || employee.currentDesignationId || employee.designation_id || employee.designationId;
        if (!hasOverlap(desigVal, empAppSettings.designations)) return false;

        const empTypeVal = employee.employment_type || employee.employmentType || employee.employee_type || employee.employeeType;
        if (!hasOverlap(empTypeVal, empAppSettings.employeeTypes)) return false;

        const statusVal = employee.status;
        if (!hasOverlap(statusVal, empAppSettings.employeeStatuses)) return false;

        const gradeVal = employee.current_grade_id || employee.currentGradeId || employee.grade_id || employee.gradeId || employee.grade || employee.grade_band;
        if (!hasOverlap(gradeVal, empAppSettings.grades)) return false;
      }

      // ── 7. Min service required ──
      const minService = allocSettings.minServiceRequired;
      const minServiceUnit = (allocSettings.minServiceRequiredUnit || '').toLowerCase();
      if (minService && minServiceUnit && minServiceUnit !== 'select') {
        const joiningDate = employee.date_of_joining || employee.dateOfJoining || employee.joining_date || employee.joiningDate;
        if (joiningDate) {
          const joinD = new Date(joiningDate);
          const diffMs = today.getTime() - joinD.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          const minVal = parseFloat(minService);
          if (!isNaN(minVal) && minVal > 0) {
            let requiredDays = minVal;
            if (minServiceUnit.includes('month')) requiredDays = minVal * 30;
            else if (minServiceUnit.includes('year')) requiredDays = minVal * 365;
            if (diffDays < requiredDays) return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Get leave types
   */
  async getLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const employee = await (this.applicationRepo as any).db('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', empId)
        .whereNull('deleted_at')
        .first();

      const types = await (this.applicationRepo as any).db('leave_types')
        .where(function (this: any) {
          this.where('organization_id', ctx.organizationId)
            .orWhereNull('organization_id');
        })
        .where('status', 'active')
        .whereNull('deleted_at')
        .orderBy('id', 'asc');

      const eligibleTypes = this.filterEligibleLeaveTypes(types, employee);

      res.json({ success: true, data: eligibleTypes });
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
      let employee = await (this.applicationRepo as any).db('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', empId)
        .whereNull('deleted_at')
        .first();

      if (!employee && ctx.userId) {
        const userRec = await (this.applicationRepo as any).db('users').where('id', ctx.userId).first();
        if (userRec) {
          employee = {
            id: empId || userRec.id,
            first_name: userRec.first_name,
            last_name: userRec.last_name,
            gender: userRec.gender || '',
            status: userRec.status || 'active',
            email: userRec.email,
          };
        }
      }

      // Fetch all active leave types for this organization
      const rawTypes = await (this.applicationRepo as any).db('leave_types')
        .where(function (this: any) {
          this.where('organization_id', ctx.organizationId)
            .orWhereNull('organization_id');
        })
        .where('status', 'active')
        .whereNull('deleted_at')
        .orderBy('id', 'asc');

      const types = this.filterEligibleLeaveTypes(rawTypes, employee);

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

          const consumed = match.consumedBalance !== undefined ? parseFloat(match.consumedBalance) : parseFloat(match.consumed_balance) || 0;
          const pending = match.pendingApprovalBalance !== undefined ? parseFloat(match.pendingApprovalBalance) : parseFloat(match.pending_approval_balance) || 0;
          const carryForward = match.carryForwardBalance !== undefined ? parseFloat(match.carryForwardBalance) : parseFloat(match.carry_forward_balance) || 0;
          const matchAllocated = match.allocatedBalance !== undefined ? parseFloat(match.allocatedBalance) : parseFloat(match.allocated_balance) || 0;

          // Base quota comes from current active Leave Settings
          const baseAllocated = currentQuota > 0 ? currentQuota : matchAllocated;
          // Effective allocated includes any carry-forward from previous years
          const effectiveAllocated = baseAllocated + carryForward;
          const effectiveAvailable = Math.max(0, effectiveAllocated - consumed);

          return {
            id: match.id,
            employee_id: empId,
            leave_type_id: t.id,
            allocated_balance: effectiveAllocated,
            consumed_balance: consumed,
            pending_approval_balance: pending,
            available_balance: effectiveAvailable,
            carry_forward_balance: carryForward,
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
            allocation_settings: t.allocation_settings || t.allocationSettings,
            application_settings: t.application_settings || t.applicationSettings,
            employment_allocation_settings: t.employment_allocation_settings || t.employmentAllocationSettings,
            employment_application_settings: t.employment_application_settings || t.employmentApplicationSettings,
            only_when: t.only_when || t.onlyWhen,
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
            allocation_settings: t.allocation_settings || t.allocationSettings,
            application_settings: t.application_settings || t.applicationSettings,
            employment_allocation_settings: t.employment_allocation_settings || t.employmentAllocationSettings,
            employment_application_settings: t.employment_application_settings || t.employmentApplicationSettings,
            only_when: t.only_when || t.onlyWhen,
          };
        }
      });

      res.json({
        success: true,
        employee: employee ? {
          ...employee,
          gender: (employee.gender || '').toLowerCase(),
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
   * HR Override for pending leaves
   */
  async hrOverride(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { applicationId } = req.params;
      const { decision, action, comment, adminNotes } = req.body;
      const dec = decision || action;
      const comm = comment || adminNotes || '';

      if (dec === 'grant_without_deduction' || dec === 'convert_to_lop') {
        await this.approvalService.hrOverride(ctx, parseInt(applicationId), ctx.userId, dec, comm);
      } else if (dec === 'approve' || dec === 'force_approve') {
        await this.approvalService.approveLeave(ctx, parseInt(applicationId), ctx.userId, comm);
      } else if (dec === 'reject' || dec === 'force_reject') {
        await this.approvalService.rejectLeave(ctx, parseInt(applicationId), ctx.userId, comm || 'Rejected via HR Override');
      } else {
        throw new ValidationError('Invalid decision. Must be grant_without_deduction, convert_to_lop, force_approve, or force_reject');
      }

      res.json({ success: true, message: 'Leave override processed successfully' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get employee resolved holiday calendar, published holidays, and weekly off rules
   */
  async getLeaveCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      let employeeId = 1;
      try {
        employeeId = await this.getEmployeeIdFromCtx(ctx);
      } catch (e) {
        employeeId = 1;
      }
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

      let data = await holidayCalendarService.getEmployeeHolidaysAndRules(null, ctx, employeeId, year);

      // Fallback: If no calendar or holidays found, query any holiday calendars for this org
      if (!data || !data.holidays || data.holidays.length === 0) {
        const knex = (this.applicationRepo as any).db;
        const fallbackCal = await knex('holiday_calendars')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .orderByRaw("CASE WHEN status IN ('Published', 'Active', 'active') THEN 1 WHEN status IN ('Draft', 'draft') THEN 2 ELSE 3 END")
          .first();

        if (fallbackCal) {
          const holidays = await knex('holidays')
            .where('organization_id', ctx.organizationId)
            .where((builder: any) => {
              builder.where('calendar_id', fallbackCal.id).orWhere('holiday_calendar_id', fallbackCal.id);
            })
            .whereNull('deleted_at')
            .orderBy('holiday_date', 'asc');

          const weeklyOffRules = await knex('weekly_off_rules')
            .where('calendar_id', fallbackCal.id)
            .where((builder: any) => {
              builder.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
            })
            .whereNull('deleted_at');

          data = {
            calendar: fallbackCal,
            holidays: holidays || [],
            weeklyOffRules: weeklyOffRules || [],
          };
        } else {
          // If no holiday calendar table found, query any active holidays directly
          const allHolidays = await knex('holidays')
            .where('organization_id', ctx.organizationId)
            .whereNull('deleted_at')
            .orderBy('holiday_date', 'asc');

          data = {
            calendar: null,
            holidays: allHolidays || [],
            weeklyOffRules: [],
          };
        }
      }

      res.json({
        success: true,
        data: data || { calendar: null, holidays: [], weeklyOffRules: [] }
      });
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
      const startYear = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();

      // Touchpoint 3: Resolve published Holiday Calendar for this employee
      const calRes = await holidayCalendarService.getCalendarForEmployee(null, ctx, empId, startYear);

      if (!calRes) {
        res.json({ success: true, data: [], message: 'No published holiday calendar assigned for this year.' });
        return;
      }

      const holidays = await db('holidays')
        .where({
          organization_id: ctx.organizationId,
          calendar_id: calRes.calendarId,
        })
        .where((builder) => {
          builder.where('is_optional', true).orWhere('holiday_type', 'Optional');
        })
        .whereNull('deleted_at')
        .orderBy('holiday_date', 'asc');

      const selections = await db('optional_holiday_selections')
        .where({
          organization_id: ctx.organizationId,
          employee_id: empId,
          year: startYear,
        })
        .whereNull('deleted_at');

      const data = holidays.map((h) => {
        const selection = selections.find((s) => s.holiday_id === h.id);
        return {
          ...h,
          selected: !!selection,
          selection_status: selection ? selection.status : null,
          selection_id: selection ? selection.id : null,
        };
      });

      res.json({ success: true, data, calendar_id: calRes.calendarId, calendar_name: calRes.calendar.calendar_name || calRes.calendar.name });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Select optional holiday
   * Touchpoint 3: Enforces quota, creates optional_holiday_selections and creates approved 1-day leave_applications
   */
  async selectOptionalHoliday(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { holidayId, holiday_id } = req.body;
      const targetHolidayId = holidayId || holiday_id;
      if (!targetHolidayId) {
        throw new ValidationError('Holiday ID is required');
      }

      const year = new Date().getFullYear();

      const holiday = await db('holidays')
        .where({ id: parseInt(targetHolidayId, 10), organization_id: ctx.organizationId })
        .where((builder) => {
          builder.where('is_optional', true).orWhere('holiday_type', 'Optional');
        })
        .whereNull('deleted_at')
        .first();

      if (!holiday) {
        throw new NotFoundError('Optional holiday not found or not eligible');
      }

      let quota = 2; // Assumption/Default: 2 optional floating holidays per year
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

      // Check if already selected
      const existing = currentSelections.find((s) => s.holiday_id === holiday.id);
      if (existing) {
        throw new ValidationError('You have already selected this optional holiday.');
      }

      const uuid = uuidv4();
      const [selectionId] = await db('optional_holiday_selections').insert({
        uuid,
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        employee_id: empId,
        holiday_id: holiday.id,
        year,
        status: 'approved',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Find or fallback leave type for Floating / Optional Holiday
      let floatLeaveType = await db('leave_types')
        .where('organization_id', ctx.organizationId)
        .where((builder) => {
          builder.whereIn('leave_code', ['FL', 'OH', 'OPT', 'CL', 'PL'])
            .orWhere('is_optional', true)
            .orWhere('leave_name', 'like', '%optional%')
            .orWhere('leave_name', 'like', '%floating%');
        })
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();

      if (!floatLeaveType) {
        floatLeaveType = await db('leave_types')
          .where('organization_id', ctx.organizationId)
          .where('status', 'active')
          .whereNull('deleted_at')
          .first();
      }

      if (floatLeaveType) {
        const appUuid = uuidv4();
        const holidayDateStr = toLocalYYYYMMDD(new Date(holiday.holiday_date));

        const [appId] = await db('leave_applications').insert({
          uuid: appUuid,
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          employee_id: empId,
          leave_type_id: floatLeaveType.id,
          application_start_date: holidayDateStr,
          application_end_date: holidayDateStr,
          total_days: 1.0,
          is_half_day: false,
          reason: `Optional Holiday: ${holiday.holiday_name || 'Floating Holiday'}`,
          status: 'approved',
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Day record
        await db('leave_application_days').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          application_id: appId,
          leave_date: holidayDateStr,
          day_type: 'FULL',
          is_weekend: false,
          is_holiday: false,
          is_sandwich_day: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      res.status(201).json({
        success: true,
        message: `Optional holiday "${holiday.holiday_name}" selected successfully.`,
        data: { id: selectionId, uuid, holiday_name: holiday.holiday_name, holiday_date: holiday.holiday_date },
      });
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
        .whereNull('deleted_at')
        .first();

      if (!selection) {
        throw new NotFoundError('Selection record not found');
      }

      await db('optional_holiday_selections')
        .where({ id: selection.id })
        .update({
          deleted_at: new Date(),
          updated_by: ctx.userId,
          updated_at: new Date(),
        });

      // Also cancel any corresponding auto-generated leave application for that holiday date
      const holiday = await db('holidays').where('id', selection.holiday_id).first();
      if (holiday) {
        const holidayDateStr = toLocalYYYYMMDD(new Date(holiday.holiday_date));
        await db('leave_applications')
          .where({
            employee_id: empId,
            organization_id: ctx.organizationId,
            application_start_date: holidayDateStr,
            application_end_date: holidayDateStr,
          })
          .update({
            status: 'cancelled',
            deleted_at: new Date(),
            updated_at: new Date(),
          });
      }

      res.json({ success: true, message: 'Optional holiday selection cancelled successfully.' });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Request / Earn Compensatory Off
   * Touchpoint 4: Validates worked_date against published Holiday Calendar and rejects regular working days.
   */
  async createCompOffRequest(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);
      const { workedDate, worked_date, hoursEarned, hours, reason } = req.body;

      const dateToValidate = workedDate || worked_date;
      if (!dateToValidate) {
        throw new ValidationError('Worked date is required to request comp-off.');
      }

      const earnedHours = parseFloat(hoursEarned || hours || 8);
      if (isNaN(earnedHours) || earnedHours <= 0) {
        throw new ValidationError('Valid earned hours are required (e.g. 4 for half day, 8 for full day).');
      }

      const workedYear = new Date(dateToValidate).getFullYear();

      // Resolve employee's published calendar
      const calRes = await holidayCalendarService.getCalendarForEmployee(null, ctx, empId, workedYear);

      let isEligibleOffDay = false;
      if (calRes) {
        const offCheck = await holidayCalendarService.isHolidayOrWeekOff(null, ctx, calRes.calendarId, dateToValidate);
        isEligibleOffDay = offCheck.isOff;
      } else {
        // Fallback: Check if date is a weekend (Sunday = 0, Saturday = 6)
        const dObj = new Date(dateToValidate);
        isEligibleOffDay = [0, 6].includes(dObj.getDay());
      }

      if (!isEligibleOffDay) {
        throw new ValidationError('Comp-off can only be earned for holidays or week-offs.');
      }

      const expiresAt = new Date(dateToValidate);
      expiresAt.setDate(expiresAt.getDate() + 60); // 60 days validity
      const expiresAtStr = toLocalYYYYMMDD(expiresAt);

      const uuid = uuidv4();
      const [balanceId] = await db('comp_off_balances').insert({
        uuid,
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        employee_id: empId,
        comp_off_earned_date: dateToValidate,
        comp_off_earned_hours: earnedHours,
        comp_off_expires_at: expiresAtStr,
        status: 'available',
        reason: reason || 'Comp-off earned for extra work on holiday/week-off',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const reqUuid = uuidv4();
      await db('comp_off_requests').insert({
        uuid: reqUuid,
        organization_id: ctx.organizationId,
        company_id: ctx.companyId || null,
        employee_id: empId,
        comp_off_id: balanceId,
        request_date: dateToValidate,
        reason: reason || 'Comp-off earned for extra work on holiday/week-off',
        status: 'approved',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.status(201).json({
        success: true,
        message: 'Comp-off recorded successfully.',
        data: {
          id: balanceId,
          uuid,
          earnedHours,
          workedDate: dateToValidate,
          expiresAt: expiresAtStr,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get Comp Off balances & requests
   */
  async getCompOffRequests(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const empId = await this.getEmployeeIdFromCtx(ctx);

      const balances = await db('comp_off_balances')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', empId)
        .whereNull('deleted_at')
        .orderBy('comp_off_earned_date', 'desc');

      res.json({ success: true, data: balances });
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
   * Create a new custom named leave policy
   */
  async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;
      const { name, code } = req.body;

      if (!name || !name.trim()) {
        throw new ValidationError('Policy name is required');
      }

      const uuid = uuidv4();
      const policyCode = (code || name).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
      const userId = ctx.userId || 1;

      const [id] = await db('leave_policies').insert({
        uuid,
        organization_id: ctx.organizationId,
        name: name.trim(),
        code: policyCode,
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      res.status(201).json({ success: true, message: 'Leave policy created successfully', data: { id, uuid, name: name.trim(), code: policyCode } });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Sync and recalculate leave balances for all active employees in the organization
   * based on current leave_types annual_quota
   */
  async syncBalances(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx!;

      // 1. Fetch all active leave_types for org
      const leaveTypes = await db('leave_types')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');

      // 2. Fetch all active employees
      const employees = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');

      let updatedCount = 0;

      for (const lt of leaveTypes) {
        let quota = parseFloat(String(lt.annual_quota || lt.annualQuota || 0));
        if (!quota && lt.allocation_settings) {
          try {
            const parsedAlloc = typeof lt.allocation_settings === 'string' ? JSON.parse(lt.allocation_settings) : lt.allocation_settings;
            quota = parseFloat(parsedAlloc?.entitlementDays) || 0;
          } catch (e) {}
        }

        for (const emp of employees) {
          const existingBal = await db('leave_balances')
            .where({
              organization_id: ctx.organizationId,
              employee_id: emp.id,
              leave_type_id: lt.id,
            })
            .whereNull('deleted_at')
            .first();

          if (existingBal) {
            const consumed = parseFloat(String(existingBal.consumed_balance || 0));
            const newAvail = Math.max(0, quota - consumed);

            await db('leave_balances')
              .where('id', existingBal.id)
              .update({
                credited_balance: quota,
                available_balance: newAvail,
                updated_at: new Date(),
              });
            updatedCount++;
          } else {
            const uuid = uuidv4();
            const year = new Date().getFullYear();
            const userId = ctx.userId || 1;
            await db('leave_balances').insert({
              uuid,
              organization_id: ctx.organizationId,
              employee_id: emp.id,
              leave_type_id: lt.id,
              financial_year_start: `${year}-01-01`,
              financial_year_end: `${year}-12-31`,
              opening_balance: quota,
              credited_balance: quota,
              consumed_balance: 0,
              available_balance: quota,
              created_by: userId,
              updated_by: userId,
              created_at: new Date(),
              updated_at: new Date(),
            });
            updatedCount++;
          }
        }
      }

      res.json({
        success: true,
        message: `Successfully synchronized leave balances across ${employees.length} employees and ${leaveTypes.length} leave categories!`,
      });
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

      try { await accrualService.accrueMonthlyLeaves(ctx, ctx.organizationId); } catch (e) { logger.error('Error during accrueMonthlyLeaves', { error: e }); }
      try { await accrualService.accrueQuarterlyLeaves(ctx); } catch (e) { logger.error('Error during accrueQuarterlyLeaves', { error: e }); }
      try { await accrualService.accrueYearlyLeaves(ctx); } catch (e) { logger.error('Error during accrueYearlyLeaves', { error: e }); }
      try { await accrualService.accrueAnniversaryLeaves(ctx); } catch (e) { logger.error('Error during accrueAnniversaryLeaves', { error: e }); }
      try { await accrualService.reconcileHoursWorkedAccruals(ctx); } catch (e) { logger.error('Error during reconcileHoursWorkedAccruals', { error: e }); }
      try { await accrualService.reconcileNonCalendarRulesAccruals(ctx); } catch (e) { logger.error('Error during reconcileNonCalendarRulesAccruals', { error: e }); }

      res.json({ success: true, message: 'Leave allocation and balances synced successfully for all employees!' });
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

      let q = db('leave_encashment_settings')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');

      const companyId = req.query.company_id || ctx.companyId || (req.headers['x-company-id'] && req.headers['x-company-id'] !== 'all' ? parseInt(req.headers['x-company-id'] as string, 10) : null);
      if (companyId) {
        q = q.where(function() {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }

      const settings = await q.orderBy('id', 'asc');
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
      const resolvedCompanyId = req.body.company_id || req.body.companyId || ctx.companyId || (req.headers['x-company-id'] ? parseInt(req.headers['x-company-id'] as string, 10) : null) || ctx.organizationId || null;

      const [id] = await db('leave_encashment_settings').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_id: resolvedCompanyId,
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
      const resolvedCompanyId = req.body.company_id || req.body.companyId || ctx.companyId || (req.headers['x-company-id'] ? parseInt(req.headers['x-company-id'] as string, 10) : null) || ctx.organizationId || null;

      const updateData: any = {
        name,
        formula,
        limit: limit ? parseFloat(limit) : null,
        is_active: isActive !== undefined ? !!isActive : true,
        days_basis: daysBasis ? parseInt(daysBasis, 10) : 30,
        employment: employment ? (typeof employment === 'string' ? employment : JSON.stringify(employment)) : null,
        updated_by: ctx.userId,
        updated_at: new Date()
      };
      if (resolvedCompanyId) {
        updateData.company_id = resolvedCompanyId;
      }

      const count = await db('leave_encashment_settings')
        .where({ id, organization_id: ctx.organizationId })
        .update(updateData);
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
      const hasCompanyId = await db.schema.hasColumn('leave_encashment_settings', 'company_id');
      if (!hasCompanyId) {
        await db.schema.alterTable('leave_encashment_settings', (table: any) => {
          table.bigInteger('company_id').unsigned().nullable();
        });
        logger.info('[LeaveController] Added company_id column to leave_encashment_settings');
      }

      // Backfill any existing NULL company_id with organization_id
      await db('leave_encashment_settings')
        .whereNull('company_id')
        .update({ company_id: db.raw('COALESCE(organization_id, 1)') })
        .catch(() => {});

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
      .whereIn('r.code', ['admin', 'hr', 'hr_manager', 'super_admin'])
      .first();
    return !!isAdmin;
  }

  private async calculateEncashmentHelper(
    db: any,
    ctx: any,
    employeeId: number,
    leaveTypeId: number,
    leaveEncashmentSettingId: number | null | undefined,
    requestedDays: number,
    isFullAndFinal: boolean
  ) {
    // 1. Fetch employee
    let employee = await db('employees').where({ id: employeeId, organization_id: ctx.organizationId }).first();
    if (!employee) {
      employee = await db('employees').where({ id: employeeId }).first();
    }
    if (!employee) {
      throw new ValidationError('Employee record not found.');
    }

    // 2. Fetch policy setting
    let policy: any = null;
    if (leaveEncashmentSettingId) {
      policy = await db('leave_encashment_settings')
        .where({ id: leaveEncashmentSettingId, organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .first();
    }

    if (!policy) {
      let q = db('leave_encashment_settings')
        .where({ organization_id: ctx.organizationId, is_active: true })
        .whereNull('deleted_at');
      if (ctx.companyId) {
        q = q.where((builder: any) => builder.where('company_id', ctx.companyId).orWhereNull('company_id'));
      }
      policy = await q.orderBy('id', 'asc').first();
    }

    if (!policy) {
      try {
        const [insertedSettingId] = await db('leave_encashment_settings').insert({
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          name: 'Standard Encashment Policy',
          formula: 'Basic + DA',
          days_basis: 30,
          is_active: true,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
        policy = await db('leave_encashment_settings').where({ id: insertedSettingId }).first();
      } catch (e) {
        policy = { id: null, name: 'Standard Encashment Policy', formula: 'Basic + DA', days_basis: 30, is_active: true };
      }
    }

    // 3. Fetch employee's current active salary structure
    const struct = await db('salary_structures')
      .where({ employee_id: employeeId })
      .whereNull('deleted_at')
      .orderBy('id', 'desc')
      .first()
      .catch(() => null);

    if (!struct || (!struct.basic_monthly && !struct.gross_monthly && !struct.annual_ctc)) {
      throw new ValidationError('No active salary structure found for this employee. Please assign a salary structure in Payroll first before requesting leave encashment.');
    }

    // 4. Determine days limit & capped days
    let cappedDays = requestedDays;
    if (isFullAndFinal && policy?.limit !== null && policy?.limit !== undefined) {
      cappedDays = Math.min(requestedDays, Number(policy.limit));
    }

    // 5. Parse formula and calculate dynamic base or full total
    const formulaStr = String(policy?.formula || 'Basic + DA').trim();
    const daysBasis = Number(policy?.days_basis || 30);
    
    // Map employee's actual database salary components
    const basicVal = Number(struct.basic_monthly || 0);
    const hraVal = Number(struct.hra_monthly || 0);
    const daVal = Number(struct.da_monthly || struct.da || 0);
    const specialVal = Number(struct.special_allowance_monthly || 0);
    const conveyanceVal = Number(struct.conveyance_monthly || 0);
    const medicalVal = Number(struct.medical_monthly || 0);
    const grossVal = Number(struct.gross_monthly || (basicVal + hraVal + daVal + specialVal + conveyanceVal + medicalVal));
    const ctcVal = Number(struct.ctc_monthly || (grossVal * 1.15));
    const perDayVal = daysBasis > 0 ? (basicVal / daysBasis) : 0;

    let dailyRate = 0;
    let totalAmount = 0;

    let evalStr = formulaStr
      .replace(/\bBasic\b|\bbasic_monthly\b|\bbasic monthly\b/gi, String(basicVal))
      .replace(/\bDA\b|\bda_monthly\b|\bda monthly\b/gi, String(daVal))
      .replace(/\bHRA\b|\bhra_monthly\b|\bhra monthly\b/gi, String(hraVal))
      .replace(/\bSpecial_Allowance\b|\bspecial_allowance\b|\bspecial allowance\b/gi, String(specialVal))
      .replace(/\bConveyance\b|\bconveyance\b/gi, String(conveyanceVal))
      .replace(/\bMedical_Allowance\b|\bmedical_allowance\b/gi, String(medicalVal))
      .replace(/\bGross_Salary\b|\bGross\b|\bgross_monthly\b|\bgross monthly\b/gi, String(grossVal))
      .replace(/\bCTC\b|\bctc_monthly\b/gi, String(ctcVal))
      .replace(/\bPER_DAY_SALARY\b/gi, String(perDayVal))
      .replace(/\bLEAVE_BALANCE\b|\bLEAVE_DAYS\b|\bNUMBER_OF_LEAVE\b/gi, String(cappedDays));

    if (struct?.custom_components) {
      try {
        const custom = typeof struct.custom_components === 'string' ? JSON.parse(struct.custom_components) : struct.custom_components;
        if (custom && typeof custom === 'object') {
          for (const [k, v] of Object.entries(custom)) {
            const re = new RegExp(`\\b${k}\\b`, 'gi');
            evalStr = evalStr.replace(re, String(Number(v) || 0));
          }
        }
      } catch (e) {}
    }

    try {
      if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(evalStr)) {
        // eslint-disable-next-line no-new-func
        const evaluated = Function(`"use strict"; return (${evalStr});`)();
        if (typeof evaluated === 'number' && !isNaN(evaluated) && isFinite(evaluated)) {
          if (formulaStr.includes('LEAVE_BALANCE') || formulaStr.includes('LEAVE_DAYS') || formulaStr.includes('NUMBER_OF_LEAVE') || formulaStr.includes('/')) {
            totalAmount = Math.max(0, evaluated);
            dailyRate = cappedDays > 0 ? (totalAmount / cappedDays) : totalAmount;
          } else {
            const sumBase = Math.max(0, evaluated);
            dailyRate = daysBasis > 0 ? (sumBase / daysBasis) : 0;
            totalAmount = dailyRate * cappedDays;
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating dynamic encashment formula:', err);
    }

    if (!dailyRate && !totalAmount) {
      dailyRate = (basicVal + daVal) / (daysBasis || 30);
      totalAmount = dailyRate * cappedDays;
    }

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

    let balance = await db('leave_balances')
      .where({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        financial_year_start: financialYearStart
      })
      .first();

    if (!balance) {
      balance = await db('leave_balances')
        .where({
          employee_id: employeeId,
          leave_type_id: leaveTypeId
        })
        .orderBy('id', 'desc')
        .first();
    }

    const availableBalance = balance ? Number(balance.available_balance ?? balance.availableBalance ?? 0) : 0;

    return {
      policyId: policy?.id || null,
      employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      policyName: policy?.name || 'Standard Encashment Policy',
      formula: policy?.formula || 'Basic + DA',
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
      let { employeeId, leaveTypeId, leaveEncashmentSettingId, encashmentDays, isFullAndFinal } = req.body;
      if (!employeeId) {
        employeeId = await this.getEmployeeIdFromCtx(ctx);
      }
      if (!employeeId || !leaveTypeId || encashmentDays === undefined || encashmentDays === null || Number(encashmentDays) <= 0) {
        throw new ValidationError('Leave category and valid encashment days are required for preview calculation.');
      }
      await this.ensureLeaveEncashmentSchema(db);

      const result = await this.calculateEncashmentHelper(
        db,
        ctx,
        Number(employeeId),
        Number(leaveTypeId),
        leaveEncashmentSettingId ? Number(leaveEncashmentSettingId) : null,
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
      let { employeeId, leaveTypeId, leaveEncashmentSettingId, encashmentDays, isFullAndFinal, reason } = req.body;
      
      if (!employeeId) {
        employeeId = await this.getEmployeeIdFromCtx(ctx);
      }

      if (!employeeId || !leaveTypeId || encashmentDays === undefined || encashmentDays === null || Number(encashmentDays) <= 0) {
        throw new ValidationError('Leave category and number of days to encash are required.');
      }
      await this.ensureLeaveEncashmentSchema(db);

      const empIdNum = Number(employeeId);
      const loggedInEmpId = await this.getEmployeeIdFromCtx(ctx);
      const isAdminOrHR = await this.checkIsAdminOrHR(ctx);

      if (!isAdminOrHR && empIdNum !== loggedInEmpId) {
        throw new ForbiddenError('You can only request leave encashment for yourself.');
      }

      // Check if self-service encashment is enabled for this leave type
      if (!isAdminOrHR) {
        const lt = await db('leave_types').where({ id: Number(leaveTypeId), organization_id: ctx.organizationId }).first();
        if (lt && lt.encashment_settings) {
          try {
            const encSettings = typeof lt.encashment_settings === 'string' ? JSON.parse(lt.encashment_settings) : lt.encashment_settings;
            if (encSettings.employeesCanRequestEncashment === false || encSettings.allow_employee_encashment_request === false) {
              throw new ValidationError('Self-service encashment requests are disabled for this leave type. Encashment occurs automatically during cycle reset.');
            }
          } catch (err: any) {
            if (err instanceof ValidationError) throw err;
          }
        }
      }

      const calc = await this.calculateEncashmentHelper(
        db,
        ctx,
        empIdNum,
        Number(leaveTypeId),
        leaveEncashmentSettingId ? Number(leaveEncashmentSettingId) : null,
        Number(encashmentDays),
        !!isFullAndFinal
      );

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const existingPending = await db('leave_encashments')
        .where({
          organization_id: ctx.organizationId,
          employee_id: empIdNum,
          leave_type_id: Number(leaveTypeId),
          status: 'pending'
        })
        .whereBetween('encashment_date', [startOfMonth, endOfMonth])
        .whereNull('deleted_at')
        .first();

      if (existingPending) {
        throw new ValidationError('A pending encashment request already exists for this leave category in the current month.');
      }

      if (calc.cappedDays > calc.availableBalance) {
        throw new ValidationError(`Requested encashment days (${calc.cappedDays}) exceed the available balance (${calc.availableBalance} days).`);
      }

      const [insertedId] = await db('leave_encashments').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: empIdNum,
        financial_year_start: calc.financialYearStart,
        leave_type_id: Number(leaveTypeId),
        leave_encashment_setting_id: calc.policyId || null,
        encashment_days: calc.cappedDays,
        daily_rate: calc.dailyRate,
        total_amount: calc.totalAmount,
        encashment_date: now,
        status: 'pending',
        reason: reason || null,
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

      const query = db('leave_encashments as le')
        .join('leave_types as lt', 'le.leave_type_id', 'lt.id')
        .join('employees as e', 'le.employee_id', 'e.id')
        .leftJoin('leave_encashment_settings as les', 'le.leave_encashment_setting_id', 'les.id')
        .where('le.organization_id', ctx.organizationId)
        .whereNull('le.deleted_at')
        .where('le.employee_id', loggedInEmpId)
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
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: msg, error: { message: msg } });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: msg, error: { message: msg } });
    } else if (error instanceof UnauthorizedError) {
      res.status(401).json({ success: false, message: msg, error: { message: msg } });
    } else if (error instanceof ForbiddenError) {
      res.status(403).json({ success: false, message: msg, error: { message: msg } });
    } else {
      logger.error('Unhandled error in LeaveController', {
        message: msg,
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ success: false, message: msg || 'Internal server error', error: { message: msg || 'Internal server error' } });
    }
  }
}

export const leaveController = new LeaveController();

