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
    return this.query(ctx)
      .where({
        employee_id: employeeId,
        is_current: true
      })
      .where('effective_from', '<=', date)
      .where(function(q) {
        q.whereNull('effective_to').orWhere('effective_to', '>=', date);
      })
      .first();
  }

  async getForEmployee(ctx: TenantContext, employeeId: number): Promise<EmployeeSalaryStructure[]> {
    const result = await this.list(ctx, {
      filters: { employee_id: employeeId },
      sortBy: 'effective_from',
      sortOrder: 'desc'
    });
    return result.items;
  }
}

