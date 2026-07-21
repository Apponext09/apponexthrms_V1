import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeEducation {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  education_type: string;
  institution: string;
  field_of_study: string;
  start_date: string;
  end_date: string | null;
  score: number | null;
  certificate_file_url: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeEducationRepository extends BaseRepository<EmployeeEducation> {
  constructor() {
    super('employee_education');
  }

  /**
   * Get education records by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get education by type
   */
  async getByType(ctx: TenantContext, employeeId: number, educationType: string): Promise<EmployeeEducation | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('education_type', educationType)
      .first() as Promise<EmployeeEducation | null>;
  }

  protected getSearchableFields(): string[] {
    return ['education_type', 'institution', 'field_of_study'];
  }
}
