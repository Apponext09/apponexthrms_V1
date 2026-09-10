import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetVendor, AssetListQueryOptions } from '../asset.types';

export class AssetVendorRepository extends BaseRepository<AssetVendor> {
  constructor() {
    super('asset_vendors');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetVendor>> {
    const { page = 1, pageSize = 20, search, sortBy = 'name', sortOrder = 'asc' } = options;

    let query = this.query(ctx);

    if (search) {
      query = query.where('name', 'like', `%${search}%`);
    }

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

  async create(ctx: TenantContext, data: Partial<AssetVendor>): Promise<AssetVendor> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetVendor>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetVendor>): Promise<AssetVendor> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetVendor>;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    await this.query(ctx).where('id', id).update({ 
      deleted_at: new Date(),
      updated_at: new Date(),
    } as any);
  }
}
