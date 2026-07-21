import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeePersonalInfo {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  father_name: string | null;
  mother_name: string | null;
  spouse_name: string | null;
  children_count: number;
  permanent_address: string | null;
  current_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeePersonalInfoRepository extends BaseRepository<EmployeePersonalInfo> {
  constructor() {
    super('employee_personal_info');
  }

  /**
   * Get personal info by employee ID
   */
  async getByEmployeeId(ctx: TenantContext, employeeId: number): Promise<EmployeePersonalInfo | null> {
    return this.query(ctx).where('employee_id', employeeId).first() as Promise<EmployeePersonalInfo | null>;
  }

  /**
   * Create or update personal info
   */
  async upsert(ctx: TenantContext, employeeId: number, data: Partial<EmployeePersonalInfo>): Promise<EmployeePersonalInfo> {
    const existing = await this.getByEmployeeId(ctx, employeeId);

    if (existing) {
      return this.update(ctx, existing.id, data);
    } else {
      return this.create(ctx, { ...data, employee_id: employeeId } as any);
    }
  }

  protected getSearchableFields(): string[] {
    return ['father_name', 'mother_name', 'spouse_name', 'city', 'country'];
  }
}
