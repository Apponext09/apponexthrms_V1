import { v4 as uuidv4 } from 'uuid';
import { LeaveAccrualRepository } from '../repositories/LeaveAccrualRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';
import { toLocalYYYYMMDD } from '../utils/dateUtils';

export class LeaveAccrualService {
  private accrualRepo: LeaveAccrualRepository;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private balanceService: LeaveBalanceService;
  private auditService: AuditService;

  constructor() {
    this.accrualRepo = new LeaveAccrualRepository();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.balanceService = new LeaveBalanceService();
    this.auditService = new AuditService();
  }

  /**
   * Process monthly leave accruals
   */
  async accrueMonthlyLeaves(ctx: TenantContext, organizationId: number): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());

    // Get all active assignments
    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true)
      .where('monthly_accrual', '>', 0);

    for (const assignment of assignments) {
      if (!assignment.monthly_accrual) continue;

      // Create accrual record
      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'monthly',
        accrued_days: assignment.monthly_accrual,
        policy_id: assignment.leave_policy_id,
        processed: false,
        notes: `Monthly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

      // Initialize or update balance
      const fyStart = this.calculateFinancialYearStart(today);
      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota
        );
      }

      // Credit accrual
      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        assignment.monthly_accrual
      );

      // Mark as processed
      await this.accrualRepo.update(ctx, accrual.id, { processed: true } as any);

      // Audit log
      await this.auditService.log(ctx, {
        action: 'applied',
        entityType: 'application',
        entityId: accrual.id,
        afterState: { days: assignment.monthly_accrual, type: 'monthly' },
      });
    }
  }

  /**
   * Process quarterly leave accruals
   */
  async accrueQuarterlyLeaves(ctx: TenantContext): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());

    // Get all active assignments with quarterly accrual
    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true)
      .where('quarterly_accrual', '>', 0);

    for (const assignment of assignments) {
      if (!assignment.quarterly_accrual) continue;

      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'quarterly',
        accrued_days: assignment.quarterly_accrual,
        policy_id: assignment.leave_policy_id,
        processed: false,
        notes: `Quarterly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

      const fyStart = this.calculateFinancialYearStart(today);
      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota
        );
      }

      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        assignment.quarterly_accrual
      );

      await this.accrualRepo.update(ctx, accrual.id, { processed: true } as any);
    }
  }

  /**
   * Process yearly leave accruals
   */
  async accrueYearlyLeaves(ctx: TenantContext): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());

    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true)
      .where('yearly_accrual', '>', 0);

    for (const assignment of assignments) {
      if (!assignment.yearly_accrual) continue;

      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'yearly',
        accrued_days: assignment.yearly_accrual,
        policy_id: assignment.leave_policy_id,
        processed: false,
        notes: `Yearly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

      const fyStart = this.calculateFinancialYearStart(today);
      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota
        );
      }

      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        assignment.yearly_accrual
      );

      await this.accrualRepo.update(ctx, accrual.id, { processed: true } as any);
    }
  }

  /**
   * Helper: Calculate financial year start
   */
  private calculateFinancialYearStart(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    if (month < 3) {
      return `${year - 1}-04-01`;
    }
    return `${year}-04-01`;
  }
}
