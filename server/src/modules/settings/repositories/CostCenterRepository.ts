import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface CostCenter {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  parent_cost_center_id: number | null;
  budget_amount: number | null;
  currency: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CostCenterRepository extends BaseRepository<CostCenter> {
  constructor() {
    super('cost_centers');
    this.companyScoped = true;
  }

  /**
   * Get cost center by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<CostCenter | null> {
    return this.query(ctx).where('code', code).first() as Promise<CostCenter | null>;
  }

  /**
   * Get child cost centers
   */
  async getChildren(ctx: TenantContext, parentId: number) {
    return this.query(ctx).where('parent_cost_center_id', parentId);
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
