import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeWorkExperience {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  company_name: string;
  designation: string;
  department: string | null;
  start_date: string;
  end_date: string | null;
  salary: number | null;
  reason_for_leaving: string | null;
  reference_contact: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeWorkExperienceRepository extends BaseRepository<EmployeeWorkExperience> {
  constructor() {
    super('employee_work_experience');
  }

  /**
   * Get work experience by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'start_date',
      sortOrder: 'desc',
    });
  }

  /**
   * Get work experience by company
   */
  async getByCompany(ctx: TenantContext, employeeId: number, companyName: string): Promise<EmployeeWorkExperience | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('company_name', companyName)
      .first() as Promise<EmployeeWorkExperience | null>;
  }

  protected getSearchableFields(): string[] {
    return ['company_name', 'designation', 'department', 'reference_contact'];
  }
}
