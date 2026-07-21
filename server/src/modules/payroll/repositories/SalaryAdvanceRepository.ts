import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface SalaryAdvance {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  advance_amount: number;
  advance_date: string;
  recovery_months: number;
  reason: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'recovered';
  approved_by: number | null;
  approval_date: string | null;
  recovery_completed_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SalaryAdvanceRepository extends BaseRepository<SalaryAdvance> {
  constructor() {
    super('salary_advances');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions): Promise<SalaryAdvance[]> {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<SalaryAdvance[]> {
    return this.list(ctx, {
      ...options,
      filters: { status },
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  }

  async getPendingApprovals(ctx: TenantContext): Promise<SalaryAdvance[]> {
    return this.getByStatus(ctx, 'pending');
  }

  async getActiveAdvances(ctx: TenantContext, employeeId: number): Promise<SalaryAdvance[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, employee_id: employeeId, status: 'approved' })
      .where('recovery_completed_date', 'is', null)
      .whereNull('deleted_at');
  }
}

