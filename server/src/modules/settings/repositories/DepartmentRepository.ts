import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Department {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  parent_department_id: number | null;
  department_head_id: number | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super('departments');
    this.companyScoped = true;
  }

  /**
   * Get department by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Department | null> {
    return this.query(ctx).where('code', code).first() as Promise<Department | null>;
  }

  /**
   * Get departments with parent relationship
   */
  async getWithParent(ctx: TenantContext, id: number | string) {
    const dept = await this.getById(ctx, id);
    if (!dept || !dept.parent_department_id) return dept;

    const parent = await this.getById(ctx, dept.parent_department_id);
    return { ...dept, parent };
  }

  /**
   * Get all child departments
   */
  async getChildren(ctx: TenantContext, parentId: number) {
    return this.query(ctx).where('parent_department_id', parentId);
  }

  /**
   * Get department hierarchy
   */
  async getHierarchy(ctx: TenantContext, parentId?: number) {
    return this.query(ctx)
      .where('parent_department_id', parentId || null)
      .select();
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);
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
