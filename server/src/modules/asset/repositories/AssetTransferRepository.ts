import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetTransfer, AssetListQueryOptions } from '../asset.types';

export class AssetTransferRepository extends BaseRepository<AssetTransfer> {
  constructor() {
    super('asset_transfers');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetTransfer>> {
    const { page = 1, pageSize = 20, sortBy = 'transfer_date', sortOrder = 'desc' } = options;

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

  async getPending(ctx: TenantContext): Promise<AssetTransfer[]> {
    return this.query(ctx).where('status', 'pending');
  }

  async create(ctx: TenantContext, data: Partial<AssetTransfer> & { requestedBy: number }): Promise<AssetTransfer> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetTransfer>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetTransfer>): Promise<AssetTransfer> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<AssetTransfer>;
  }
}
