import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Asset {
  id: number;
  uuid: string;
  organization_id: number;
  asset_type_id: number;
  asset_code: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  currency: string;
  status: 'available' | 'allocated' | 'returned' | 'damaged' | 'disposed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AssetRepository extends BaseRepository<Asset> {
  constructor() {
    super('assets');
  }

  /**
   * Get asset by code
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Asset | null> {
    return this.query(ctx).where('asset_code', code).first() as Promise<Asset | null>;
  }

  /**
   * Get assets by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get available assets
   */
  async getAvailable(ctx: TenantContext, assetTypeId?: number) {
    let query = this.query(ctx).where('status', 'available');
    if (assetTypeId) {
      query = query.where('asset_type_id', assetTypeId);
    }
    return query.select();
  }

  /**
   * Get assets by type
   */
  async getByType(ctx: TenantContext, assetTypeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { asset_type_id: assetTypeId },
    });
  }

  protected getSearchableFields(): string[] {
    return ['asset_code', 'brand', 'model', 'serial_number'];
  }
}
