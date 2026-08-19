import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetReturn, AssetListQueryOptions } from '../asset.types';

export class AssetReturnRepository extends BaseRepository<AssetReturn> {
  constructor() {
    super('asset_returns');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetReturn>> {
    const { page = 1, pageSize = 20, sortBy = 'return_date', sortOrder = 'desc' } = options;

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

  async getPending(ctx: TenantContext): Promise<AssetReturn[]> {
    return this.query(ctx).where('status', 'pending');
  }

  async create(ctx: TenantContext, data: Partial<AssetReturn> & { receivedBy: number }): Promise<AssetReturn> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetReturn>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetReturn>): Promise<AssetReturn> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetReturn>;
  }
}
