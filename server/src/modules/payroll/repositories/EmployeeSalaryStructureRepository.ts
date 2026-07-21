import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeeSalaryStructure {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  salary_structure_id: number;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeSalaryStructureRepository extends BaseRepository<EmployeeSalaryStructure> {
  constructor() {
    super('employee_salary_structures');
  }

  async getCurrent(ctx: TenantContext, employeeId: number, date: string): Promise<EmployeeSalaryStructure | null> {
    return this.db()
      .where({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        is_current: true
      })
      .where('effective_from', '<=', date)
      .where(function(q) {
        q.whereNull('effective_to').orWhere('effective_to', '>=', date);
      })
      .whereNull('deleted_at')
      .first();
  }

  async getForEmployee(ctx: TenantContext, employeeId: number): Promise<EmployeeSalaryStructure[]> {
    return this.list(ctx, {
      filters: { employee_id: employeeId },
      orderBy: [{ field: 'effective_from', direction: 'desc' }]
    });
  }
}

