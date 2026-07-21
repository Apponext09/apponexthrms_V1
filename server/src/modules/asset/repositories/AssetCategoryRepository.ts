import { BaseRepository } from '../../../db/BaseRepository';
import { getKnex } from '../../../db/knex';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetCategory, AssetListQueryOptions } from '../asset.types';

export class AssetCategoryRepository extends BaseRepository<AssetCategory> {
  constructor() {
    super('asset_categories');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetCategory>> {
    const { page = 1, pageSize = 20, search, sortBy = 'name', sortOrder = 'asc' } = options;

    let query = this.query(ctx);

    if (search) {
      query = query.where((qb) => {
        qb.where('name', 'like', `%${search}%`).orWhere('code', 'like', `%${search}%`);
      });
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

  async getByCode(ctx: TenantContext, code: string): Promise<AssetCategory | undefined> {
    return this.query(ctx).where('code', code).first();
  }

  async create(ctx: TenantContext, data: Partial<AssetCategory>): Promise<AssetCategory> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getById(ctx, id) as Promise<AssetCategory>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetCategory>): Promise<AssetCategory> {
    await this.query(ctx).where('id', id).update({
      ...data,
      updated_at: new Date(),
    });

    return this.getById(ctx, id) as Promise<AssetCategory>;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    await this.query(ctx).where('id', id).del();
  }
}
