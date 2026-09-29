import { v4 as uuidv4 } from 'uuid';
import { EmployeeLifecycleRepository } from '../repositories/EmployeeLifecycleRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { getKnex } from '../../../db/knex';

export class EmployeeLifecycleService {
  private lifecycleRepo: EmployeeLifecycleRepository;
  private employeeRepo: EmployeeRepository;
  private auditService: AuditService;

  constructor() {
    this.lifecycleRepo = new EmployeeLifecycleRepository();
    this.employeeRepo = new EmployeeRepository();
    this.auditService = new AuditService();
  }

  private async revokeAccessForTerminalStatus(ctx: TenantContext, employeeId: number, status: string) {
    if (!['exit', 'alumni', 'inactive'].includes(String(status).toLowerCase())) return;
    const db = getKnex();
    await db.transaction(async (trx) => {
      const userIds = await trx('users').where({ organization_id: ctx.organizationId, employee_id: employeeId }).pluck('id') as number[];
      if (!userIds.length) return;
      await trx('users').whereIn('id', userIds).update({ status: 'inactive', updated_at: new Date() });
      await trx('auth_sessions').whereIn('user_id', userIds).whereNull('revoked_at').update({ revoked_at: new Date(), revoked_reason: 'employee_exited' });
    });
  }

  /**
   * Record status transition
   */
  async transitionStatus(ctx: TenantContext, input: {
    employeeId: number;
    toStatus: string;
    transitionDate: string;
    notes?: string;
  }) {
    const employee = await this.employeeRepo.getById(ctx, input.employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Create lifecycle record
    const lifecycle = await this.lifecycleRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      from_status: employee.status,
      to_status: input.toStatus,
      transition_date: input.transitionDate,
      notes: input.notes || null,
      created_by: ctx.userId,
    } as any);

    // Update employee status
    await this.employeeRepo.update(ctx, input.employeeId, {
      status: input.toStatus,
    } as any);
    await this.revokeAccessForTerminalStatus(ctx, input.employeeId, input.toStatus);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'LIFECYCLE_TRANSITION',
      entityId: lifecycle.id,
      description: `Employee transitioned from ${employee.status} to ${input.toStatus}`,
    });

    return lifecycle;
  }

  /**
   * Get employee lifecycle history
   */
  async getEmployeeHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.lifecycleRepo.getEmployeeHistory(ctx, employeeId, options);
  }

  /**
   * Get latest transition
   */
  async getLatestTransition(ctx: TenantContext, employeeId: number) {
    return this.lifecycleRepo.getLatestTransition(ctx, employeeId);
  }

  /**
   * Confirm employee (candidate -> onboarding or probation -> active)
   */
  async confirmEmployee(ctx: TenantContext, employeeId: number, confirmationDate: string) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    let newStatus = 'active';
    if (employee.status === 'candidate') {
      newStatus = 'onboarding';
    }

    const lifecycle = await this.lifecycleRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: employeeId,
      from_status: employee.status,
      to_status: newStatus,
      transition_date: confirmationDate,
      notes: 'Employee confirmation',
      created_by: ctx.userId,
    } as any);

    await this.employeeRepo.update(ctx, employeeId, {
      status: newStatus,
      date_of_confirmation: confirmationDate,
    } as any);

    return lifecycle;
  }

  /**
   * Initiate exit
   */
  async initiateExit(ctx: TenantContext, employeeId: number, exitDate: string) {
    const employee = await this.employeeRepo.getById(ctx, employeeId);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const lifecycle = await this.lifecycleRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: employeeId,
      from_status: employee.status,
      to_status: 'exit',
      transition_date: exitDate,
      notes: 'Exit initiated',
      created_by: ctx.userId,
    } as any);

    await this.employeeRepo.update(ctx, employeeId, {
      status: 'exit',
    } as any);
    await this.revokeAccessForTerminalStatus(ctx, employeeId, 'exit');

    return lifecycle;
  }
}
