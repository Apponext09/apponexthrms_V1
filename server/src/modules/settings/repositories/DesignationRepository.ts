import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Designation {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  department_id: number | null;
  level: number | null;
  description: string | null;
  status: 'active' | 'inactive';
  mapped_companies: string | null;
  mapped_locations: string | null;
  mapped_departments: string | null;
  mapped_shifts: string | null;
  mapped_grades: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DesignationRepository extends BaseRepository<Designation> {
  constructor() {
    super('designations');
    this.companyScoped = true;
  }

  /**
   * Get designation by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Designation | null> {
    return this.query(ctx).where('code', code).first() as Promise<Designation | null>;
  }

  /**
   * Get designations by department
   */
  async getByDepartment(ctx: TenantContext, departmentId: number) {
    return this.query(ctx).where('department_id', departmentId);
  }

  /**
   * Get designations by level
   */
  async getByLevel(ctx: TenantContext, level: number) {
    return this.query(ctx).where('level', level);
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    // Only live rows count — a soft-deleted master frees its code for reuse.
    let query = this.query(ctx).where('code', code).whereNull('deleted_at');
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
    return ['name', 'code', 'description'];
  }
}
