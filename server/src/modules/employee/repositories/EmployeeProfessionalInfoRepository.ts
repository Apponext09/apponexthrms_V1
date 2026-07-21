import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeeProfessionalInfo {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  qualification: string | null;
  specialization: string | null;
  university: string | null;
  graduation_year: number | null;
  years_of_experience: number;
  linkedin_url: string | null;
  github_url: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeProfessionalInfoRepository extends BaseRepository<EmployeeProfessionalInfo> {
  constructor() {
    super('employee_professional_info');
  }

  /**
   * Get professional info by employee ID
   */
  async getByEmployeeId(ctx: TenantContext, employeeId: number): Promise<EmployeeProfessionalInfo | null> {
    return this.query(ctx).where('employee_id', employeeId).first() as Promise<EmployeeProfessionalInfo | null>;
  }

  /**
   * Create or update professional info
   */
  async upsert(ctx: TenantContext, employeeId: number, data: Partial<EmployeeProfessionalInfo>): Promise<EmployeeProfessionalInfo> {
    const existing = await this.getByEmployeeId(ctx, employeeId);

    if (existing) {
      return this.update(ctx, existing.id, data);
    } else {
      return this.create(ctx, { ...data, employee_id: employeeId } as any);
    }
  }

  protected getSearchableFields(): string[] {
    return ['qualification', 'specialization', 'university', 'linkedin_url'];
  }
}
