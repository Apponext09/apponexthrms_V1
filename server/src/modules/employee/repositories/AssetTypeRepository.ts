import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AssetType {
  id: number;
  uuid: string;
  organization_id: number;
  type_name: string;
  depreciation_rate: number | null;
  warranty_period_months: number | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AssetTypeRepository extends BaseRepository<AssetType> {
  constructor() {
    super('asset_types');
  }

  /**
   * Get asset type by name
   */
  async getByName(ctx: TenantContext, name: string): Promise<AssetType | null> {
    return this.query(ctx).where('type_name', name).first() as Promise<AssetType | null>;
  }

  /**
   * Check if type name is unique
   */
  async isNameUnique(ctx: TenantContext, name: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('type_name', name);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  protected getSearchableFields(): string[] {
    return ['type_name'];
  }
}
