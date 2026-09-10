import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetMaintenance, AssetListQueryOptions } from '../asset.types';

export class AssetMaintenanceRepository extends BaseRepository<AssetMaintenance> {
  constructor() {
    super('asset_maintenance');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetMaintenance>> {
    const { page = 1, pageSize = 20, sortBy = 'start_date', sortOrder = 'desc' } = options;

    let query = this.query(ctx);

    const countResult = await query.clone().count('* as count').first();
    const total = (countResult as any).count;

    const offset = (page - 1) * pageSize;
    const items = await query
      .offset(offset)
      .limit(pageSize)
      .orderBy(sortBy, sortOrder as 'asc' | 'desc');

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: page * pageSize < total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getByAsset(ctx: TenantContext, assetId: number): Promise<AssetMaintenance[]> {
    return this.query(ctx).where('asset_id', assetId).orderBy('start_date', 'desc');
  }

  async getActive(ctx: TenantContext): Promise<AssetMaintenance[]> {
    return this.query(ctx)
      .where('status', 'in', ['pending', 'in_progress'])
      .orderBy('start_date', 'asc');
  }

  async create(ctx: TenantContext, data: Partial<AssetMaintenance>): Promise<AssetMaintenance> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetMaintenance>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetMaintenance>): Promise<AssetMaintenance> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetMaintenance>;
  }
}
