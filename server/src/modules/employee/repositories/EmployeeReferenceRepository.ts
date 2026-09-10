import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeReference {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  reference_name: string;
  designation: string;
  company: string;
  phone: string;
  email: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeReferenceRepository extends BaseRepository<EmployeeReference> {
  constructor() {
    super('employee_references');
  }

  /**
   * Get references by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get reference by company
   */
  async getByCompany(ctx: TenantContext, employeeId: number, company: string): Promise<EmployeeReference | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('company', company)
      .first() as Promise<EmployeeReference | null>;
  }

  protected getSearchableFields(): string[] {
    return ['reference_name', 'company', 'designation', 'email', 'phone'];
  }
}
