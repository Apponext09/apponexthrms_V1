import { v4 as uuidv4 } from 'uuid';
import { LeaveAccrualRepository } from '../repositories/LeaveAccrualRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';
import { toLocalYYYYMMDD, calculateFinancialYearEnd, calculateFinancialYearStart } from '../utils/dateUtils';
import { getOrgLeaveSettings } from '../utils/settingsResolver';
import { getKnex } from '../../../db/knex';
import { subscribeEvent, publishEvent } from '../../../realtime/eventBus';

export class LeaveAccrualService {
  private accrualRepo: LeaveAccrualRepository;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private balanceService: LeaveBalanceService;
  private auditService: AuditService;
  private static terminationHookRegistered = false;

  constructor() {
    this.accrualRepo = new LeaveAccrualRepository();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.balanceService = new LeaveBalanceService();
    this.auditService = new AuditService();

    if (!LeaveAccrualService.terminationHookRegistered) {
      subscribeEvent('EmployeeTerminatedEvent', (payload: any) => this.handleEmployeeTerminated(payload));
      subscribeEvent('employee.terminated', (payload: any) => this.handleEmployeeTerminated(payload));
      LeaveAccrualService.terminationHookRegistered = true;
    }
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
      const employee = await this.assignmentRepo.db('employees').where('id', assignment.employee_id).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
      const fyStart = calculateFinancialYearStart(today, settings.holidayYearStartMonth);
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

      const employee = await this.assignmentRepo.db('employees').where('id', assignment.employee_id).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
      const fyStart = calculateFinancialYearStart(today, settings.holidayYearStartMonth);
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

      const employee = await this.assignmentRepo.db('employees').where('id', assignment.employee_id).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
      const fyStart = calculateFinancialYearStart(today, settings.holidayYearStartMonth);

      const policy = await this.assignmentRepo.db('leave_policies').where('id', assignment.leave_policy_id).first();
      let scalePercent = null;
      if (policy && policy.earned_leave_entitlement_percent !== null) {
        scalePercent = parseFloat(policy.earned_leave_entitlement_percent);
      }

      let accruedDays = assignment.yearly_accrual;
      if (scalePercent !== null) {
        accruedDays = (assignment.annual_quota || assignment.yearly_accrual || 0) * (scalePercent / 100);
      }

      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'yearly',
        accrued_days: accruedDays,
        policy_id: assignment.leave_policy_id,
        processed: false,
        notes: `Yearly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

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
        accruedDays
      );

      await this.accrualRepo.update(ctx, accrual.id, { processed: true } as any);
    }
  }



  /**
   * Process anniversary-based leave accruals
   */
  async accrueAnniversaryLeaves(ctx: TenantContext): Promise<void> {
    const db = getKnex();
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    const todayStr = toLocalYYYYMMDD(today);

    // Fetch active employees who started on this month and day
    const employees = await db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .whereRaw(`DATE_FORMAT(date_of_joining, '%m-%d') = ?`, [`${todayMonth}-${todayDay}`]);

    for (const emp of employees) {
      // Find active policy assignments that use anniversary-based accrual
      const assignments = await db('leave_policy_assignments')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', emp.id)
        .where('is_active', true)
        .where('accrual_method', 'anniversary_based')
        .whereNull('deleted_at');

      for (const assignment of assignments) {
        const policy = await db('leave_policies').where('id', assignment.leave_policy_id).first();
        let scalePercent = null;
        if (policy && policy.earned_leave_entitlement_percent !== null) {
          scalePercent = parseFloat(policy.earned_leave_entitlement_percent);
        }

        const baseAccrualDays = assignment.accrual_rate !== null && assignment.accrual_rate !== undefined 
          ? parseFloat(String(assignment.accrual_rate)) 
          : (assignment.annual_quota || 0);

        let accrualDays = baseAccrualDays;
        if (scalePercent !== null) {
          accrualDays = (assignment.annual_quota || baseAccrualDays) * (scalePercent / 100);
        }
          
        if (accrualDays <= 0) continue;

        const idempotencyKey = `ANNIV-${emp.id}-${assignment.leave_type_id}-${year}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (existing) continue;

        await db.transaction(async (trx) => {
          // 1. Create leave accrual record
          const [accrualId] = await trx('leave_accruals').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: emp.id,
            leave_type_id: assignment.leave_type_id,
            accrual_date: todayStr,
            accrual_type: 'anniversary',
            accrued_days: accrualDays,
            policy_id: assignment.leave_policy_id,
            processed: true,
            notes: `Anniversary accrual for joining date ${emp.date_of_joining}`,
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // 2. Create ledger entry
          await trx('leave_ledger_entries').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: emp.id,
            leave_type_id: assignment.leave_type_id,
            transaction_type: 'ACCRUAL',
            amount: accrualDays,
            effective_date: todayStr,
            reference_id: idempotencyKey,
            remarks: `Anniversary accrual for joining date ${emp.date_of_joining}`,
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // 3. Update Leave Balance
          const employee = await trx('employees').where('id', emp.id).first();
          const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
          const fyStart = calculateFinancialYearStart(todayStr, settings.holidayYearStartMonth);
          let balance = await trx('leave_balances')
            .where('employee_id', emp.id)
            .where('leave_type_id', assignment.leave_type_id)
            .where('financial_year_start', fyStart)
            .first();

          if (!balance) {
            // Initialize balance
            const fyEnd = calculateFinancialYearEnd(fyStart);
            await trx('leave_balances').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: emp.id,
              leave_type_id: assignment.leave_type_id,
              financial_year_start: fyStart,
              financial_year_end: fyEnd,
              opening_balance: assignment.annual_quota || 0,
              credited_balance: accrualDays,
              consumed_balance: 0,
              available_balance: (assignment.annual_quota || 0) + accrualDays,
              carry_forward_balance: 0,
              encashed_balance: 0,
              expired_balance: 0,
              pending_approval_balance: 0,
              hours_worked_accumulator: 0,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });
          } else {
            const newCredited = parseFloat(String(balance.credited_balance || 0)) + accrualDays;
            const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));
            await trx('leave_balances')
              .where('id', balance.id)
              .update({
                credited_balance: newCredited,
                available_balance: newAvailable,
                last_updated_at: new Date().toISOString(),
                updated_at: new Date(),
              });
          }

          // Audit log
          await this.auditService.log(ctx, {
            action: 'applied',
            entityType: 'application',
            entityId: accrualId,
            afterState: { days: accrualDays, type: 'anniversary' },
          });
        });
      }
    }
  }

  /**
   * Nightly reconciliation worker for hours-worked accrual
   */
  async reconcileHoursWorkedAccruals(ctx: TenantContext): Promise<void> {
    const db = getKnex();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toLocalYYYYMMDD(yesterday);

    const assignments = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .where('accrual_method', 'accrued_per_hours_worked')
      .whereNull('deleted_at');

    for (const assignment of assignments) {
      const employee = await db('employees').where('id', assignment.employee_id).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
      const fyStart = calculateFinancialYearStart(yesterdayStr, settings.holidayYearStartMonth);
      
      let balance = await db('leave_balances')
        .where('employee_id', assignment.employee_id)
        .where('leave_type_id', assignment.leave_type_id)
        .where('financial_year_start', fyStart)
        .first();

      if (!balance) {
        // Initialize balance if missing
        const fyEnd = calculateFinancialYearEnd(fyStart);
        const [insertedId] = await db('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: assignment.employee_id,
          leave_type_id: assignment.leave_type_id,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: assignment.annual_quota || 0,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: assignment.annual_quota || 0,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          hours_worked_accumulator: 0,
          last_reconciled_attendance_date: null,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
        
        balance = await db('leave_balances').where('id', insertedId).first();
      }

      // Determine reconciliation startDate
      let startDateStr = '';
      if (balance.last_reconciled_attendance_date) {
        const nextDay = new Date(balance.last_reconciled_attendance_date);
        nextDay.setDate(nextDay.getDate() + 1);
        startDateStr = toLocalYYYYMMDD(nextDay);
      } else {
        startDateStr = toLocalYYYYMMDD(new Date(assignment.assignment_start_date));
      }

      if (startDateStr > yesterdayStr) continue;

      // Query approved attendance records duration
      const attendanceSummary = await db('attendance_records')
        .where('employee_id', assignment.employee_id)
        .where('check_in_date', '>=', startDateStr)
        .where('check_in_date', '<=', yesterdayStr)
        .whereIn('status', ['present', 'half_day', 'work_from_home'])
        .whereNull('deleted_at')
        .select('work_duration_minutes');

      const totalMinutes = attendanceSummary.reduce((acc: number, cur: any) => acc + (cur.work_duration_minutes || 0), 0);
      const newHoursWorked = totalMinutes / 60;

      const currentAccumulator = parseFloat(String(balance.hours_worked_accumulator || 0));
      const totalAccumulatedHours = currentAccumulator + newHoursWorked;

      const threshold = assignment.accrual_rate !== null && parseFloat(String(assignment.accrual_rate)) > 0 
        ? parseFloat(String(assignment.accrual_rate)) 
        : 30.0; // 30 hours threshold default
        
      const crossings = Math.floor(totalAccumulatedHours / threshold);
      const remainder = totalAccumulatedHours % threshold;

      if (crossings > 0) {
        // Compute dynamically: 1 hour leave = 1 / fullTimeHours days leave
        const creditPerCrossing = 1 / settings.fullTimeHours;
        const totalCredit = crossings * creditPerCrossing;

        const idempotencyKey = `HOURS-${assignment.employee_id}-${assignment.leave_type_id}-${yesterdayStr}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (!existing) {
          await db.transaction(async (trx) => {
            // 1. Create accrual record
            const [accrualId] = await trx('leave_accruals').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: assignment.employee_id,
              leave_type_id: assignment.leave_type_id,
              accrual_date: yesterdayStr,
              accrual_type: 'monthly', // map to standard accrual type
              accrued_days: totalCredit,
              policy_id: assignment.leave_policy_id,
              processed: true,
              notes: `Accrual of ${totalCredit} days based on hours worked threshold crossings (${crossings} times).`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 2. Create ledger entry
            await trx('leave_ledger_entries').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: assignment.employee_id,
              leave_type_id: assignment.leave_type_id,
              transaction_type: 'ACCRUAL',
              amount: totalCredit,
              effective_date: yesterdayStr,
              reference_id: idempotencyKey,
              remarks: `Accrued from ${totalAccumulatedHours.toFixed(2)} hours worked. Accumulator remainder: ${remainder.toFixed(2)}`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 3. Update Balance
            const newCredited = parseFloat(String(balance.credited_balance || 0)) + totalCredit;
            const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));

            await trx('leave_balances')
              .where('id', balance.id)
              .update({
                credited_balance: newCredited,
                available_balance: newAvailable,
                hours_worked_accumulator: remainder,
                last_reconciled_attendance_date: yesterdayStr,
                last_updated_at: new Date().toISOString(),
                updated_at: new Date(),
              });

            // Audit log
            await this.auditService.log(ctx, {
              action: 'applied',
              entityType: 'application',
              entityId: accrualId,
              afterState: { days: totalCredit, type: 'hours_worked' },
            });
          });
        }
      } else {
        // Just update accumulator & last reconciled date
        await db('leave_balances')
          .where('id', balance.id)
          .update({
            hours_worked_accumulator: remainder,
            last_reconciled_attendance_date: yesterdayStr,
            last_updated_at: new Date().toISOString(),
            updated_at: new Date(),
          });
      }
    }
  }

  /**
   * Handle Employee Termination Event (Full & Final proration)
   */
  async handleEmployeeTerminated(payload: { ctx: TenantContext; employeeId: number; exitDate: string }): Promise<void> {
    const { ctx, employeeId, exitDate } = payload;
    const db = getKnex();

    const emp = await db('employees').where('id', employeeId).whereNull('deleted_at').first();
    if (!emp) return;

    // Determine current financial year cycle start & end
    const settings = await getOrgLeaveSettings(ctx.organizationId, emp.current_location_id || emp.currentLocationId);
    const cycleStartStr = calculateFinancialYearStart(exitDate, settings.holidayYearStartMonth);
    const cycleEndStr = calculateFinancialYearEnd(cycleStartStr);

    const cycleStart = new Date(cycleStartStr);
    const cycleEnd = new Date(cycleEndStr);
    const exit = new Date(exitDate);

    // Total days in current cycle
    const totalDaysInCycle = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Days worked in cycle (from start of cycle or joining date, whichever is later, to exit date)
    const joindDate = emp.date_of_joining ? new Date(emp.date_of_joining) : new Date();
    const actualStart = joindDate > cycleStart ? joindDate : cycleStart;
    const daysWorkedInCycle = Math.ceil((exit.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prorationRatio = Math.min(1.0, Math.max(0.0, daysWorkedInCycle / totalDaysInCycle));

    // Fetch active assignments
    const assignments = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('is_active', true)
      .whereNull('deleted_at');

    for (const assignment of assignments) {
      const annualEntitlement = assignment.annual_quota || 0;
      const earnedEntitlement = annualEntitlement * prorationRatio;

      const balance = await this.balanceService.getBalance(ctx, employeeId, assignment.leave_type_id);
      const usedDays = balance ? parseFloat(String(balance.consumed_balance || 0)) : 0;

      if (usedDays > earnedEntitlement) {
        const deficit = usedDays - earnedEntitlement;
        const idempotencyKey = `FF-${employeeId}-${assignment.leave_type_id}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (!existing) {
          await db.transaction(async (trx) => {
            // 1. Write negative MANUAL_ADJUSTMENT ledger entry
            await trx('leave_ledger_entries').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: employeeId,
              leave_type_id: assignment.leave_type_id,
              transaction_type: 'MANUAL_ADJUSTMENT',
              amount: -deficit,
              effective_date: exitDate,
              reference_id: idempotencyKey,
              remarks: `Deficit deduction on termination (proration: earned ${earnedEntitlement.toFixed(2)}, used ${usedDays}).`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 2. Deduct from balance
            if (balance) {
              const newCredited = parseFloat(String(balance.credited_balance || 0)) - deficit;
              const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));

              await trx('leave_balances')
                .where('id', balance.id)
                .update({
                  credited_balance: newCredited,
                  available_balance: newAvailable,
                  last_updated_at: new Date().toISOString(),
                  updated_at: new Date(),
                });
            }

            // 3. Expose/publish the deficit payload for Full & Final Payroll deduction
            publishEvent('payroll.ff_deficit_detected', {
              employeeId,
              leaveTypeId: assignment.leave_type_id,
              deficitDays: deficit,
              earnedEntitlement,
              usedDays,
              exitDate,
            });
          });
        }
      }
    }
  }
}
