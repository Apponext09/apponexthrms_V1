import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmployeeType {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  status: 'active' | 'inactive';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeTypeRepository extends BaseRepository<EmployeeType> {
  constructor() {
    super('employee_types');
  }

  /**
   * Check if name exists within organization
   */
  async isNameUnique(ctx: TenantContext, name: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('name', name);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['name'];
  }
}
