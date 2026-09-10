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
    const result = await this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<SalaryAdvance[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getPendingApprovals(ctx: TenantContext): Promise<SalaryAdvance[]> {
    return this.getByStatus(ctx, 'pending');
  }

  async getActiveAdvances(ctx: TenantContext, employeeId: number): Promise<SalaryAdvance[]> {
    return this.query(ctx)
      .where({ employee_id: employeeId, status: 'approved' })
      .whereNull('recovery_completed_date');
  }
}

