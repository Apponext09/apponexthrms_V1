import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { SoftwareLicense, AssetListQueryOptions } from '../asset.types';

export class SoftwareLicenseRepository extends BaseRepository<SoftwareLicense> {
  constructor() {
    super('software_licenses');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<SoftwareLicense>> {
    const { page = 1, pageSize = 20, search, sortBy = 'software_name', sortOrder = 'asc' } = options;

    let query = this.query(ctx);

    if (search) {
      query = query.where('software_name', 'like', `%${search}%`);
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

  async getExpiring(ctx: TenantContext): Promise<SoftwareLicense[]> {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.query(ctx)
      .where('status', 'active')
      .where('expiry_date', '<=', thirtyDaysFromNow)
      .orderBy('expiry_date', 'asc');
  }

  async create(ctx: TenantContext, data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({ 
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<SoftwareLicense>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<SoftwareLicense>): Promise<SoftwareLicense> {
    await this.query(ctx).where('id', id).update({ 
      ...data,
      updated_at: new Date(),
    } as any);

    return this.getById(ctx, id) as Promise<SoftwareLicense>;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    await this.query(ctx).where('id', id).update({ 
      deleted_at: new Date(),
      updated_at: new Date(),
    } as any);
  }
}
