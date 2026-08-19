import { BaseRepository } from '../../../db/BaseRepository';
import { getKnex } from '../../../db/knex';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { Asset, AssetListQueryOptions } from '../asset.types';

export class AssetRepository extends BaseRepository<Asset> {
  constructor() {
    super('assets');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<Asset>> {
    const { page = 1, pageSize = 20, search, category, status, sortBy = 'asset_code', sortOrder = 'asc' } = options;

    let query = this.query(ctx);

    if (search) {
      query = query.where((qb) => {
        qb.where('asset_code', 'like', `%${search}%`)
          .orWhere('model', 'like', `%${search}%`)
          .orWhere('brand', 'like', `%${search}%`)
          .orWhere('serial_number', 'like', `%${search}%`);
      });
    }

    if (category) {
      query = query.where('category_id', category);
    }

    if (status) {
      query = query.where('status', status);
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

  async getByCode(ctx: TenantContext, assetCode: string): Promise<Asset | undefined> {
    return this.query(ctx).where('asset_code', assetCode).first();
  }

  async getBySerialNumber(serialNumber: string): Promise<Asset | undefined> {
    const db = getKnex();
    return db('assets').where('serial_number', serialNumber).first();
  }

  async getByOwner(ctx: TenantContext, employeeId: number): Promise<Asset[]> {
    return this.query(ctx).where('current_owner_id', employeeId);
  }

  async getByCategory(ctx: TenantContext, categoryId: number): Promise<Asset[]> {
    return this.query(ctx).where('category_id', categoryId);
  }

  async getAvailable(ctx: TenantContext): Promise<Asset[]> {
    return this.query(ctx).where('status', 'available');
  }

  async create(ctx: TenantContext, data: Partial<Asset> & { createdBy: number }): Promise<Asset> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<Asset>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<Asset>): Promise<Asset> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<Asset>;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    await this.query(ctx).where('id', id).update({ 
      deleted_at: new Date(),
      updated_at: new Date(),
    } as any);
  }
}
