import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeFamilyDetails {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  name: string;
  relationship: 'spouse' | 'son' | 'daughter' | 'dependent';
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeFamilyDetailsRepository extends BaseRepository<EmployeeFamilyDetails> {
  constructor() {
    super('employee_family_details');
  }

  /**
   * Get family details by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get spouse details
   */
  async getSpouse(ctx: TenantContext, employeeId: number): Promise<EmployeeFamilyDetails | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('relationship', 'spouse')
      .first() as Promise<EmployeeFamilyDetails | null>;
  }

  /**
   * Get children count
   */
  async getChildrenCount(ctx: TenantContext, employeeId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('employee_id', employeeId)
      .whereIn('relationship', ['son', 'daughter'])
      .count('* as count')
      .first();

    return result ? Number(result.count) : 0;
  }

  protected getSearchableFields(): string[] {
    return ['name', 'relationship'];
  }
}
