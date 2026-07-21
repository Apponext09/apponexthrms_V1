import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeeCompensation {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  base_salary: number | null;
  currency: string;
  salary_structure_id: number | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  uan_number: string | null;
  esic_number: string | null;
  pension_number: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeCompensationRepository extends BaseRepository<EmployeeCompensation> {
  constructor() {
    super('employee_compensation');
  }

  /**
   * Get compensation by employee ID
   */
  async getByEmployeeId(ctx: TenantContext, employeeId: number): Promise<EmployeeCompensation | null> {
    return this.query(ctx).where('employee_id', employeeId).first() as Promise<EmployeeCompensation | null>;
  }

  /**
   * Create or update compensation
   */
  async upsert(ctx: TenantContext, employeeId: number, data: Partial<EmployeeCompensation>): Promise<EmployeeCompensation> {
    const existing = await this.getByEmployeeId(ctx, employeeId);

    if (existing) {
      return this.update(ctx, existing.id, data);
    } else {
      return this.create(ctx, { ...data, employee_id: employeeId } as any);
    }
  }

  /**
   * Get employees by salary structure
   */
  async getByStructure(ctx: TenantContext, structureId: number) {
    return this.query(ctx).where('salary_structure_id', structureId).select();
  }

  protected getSearchableFields(): string[] {
    return ['bank_name', 'account_number', 'uan_number', 'esic_number'];
  }
}
