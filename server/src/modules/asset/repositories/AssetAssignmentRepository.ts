import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, PaginatedList } from '../../../db/types';
import type { AssetAssignment, AssetListQueryOptions } from '../asset.types';

export class AssetAssignmentRepository extends BaseRepository<AssetAssignment> {
  constructor() {
    super('asset_assignments');
  }

  async list(ctx: TenantContext, options: AssetListQueryOptions = {}): Promise<PaginatedList<AssetAssignment>> {
    const { page = 1, pageSize = 20, sortBy = 'assigned_date', sortOrder = 'desc' } = options;

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

  async getActiveAssignments(ctx: TenantContext, employeeId: number): Promise<AssetAssignment[]> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('status', 'active');
  }

  async getByAsset(ctx: TenantContext, assetId: number): Promise<AssetAssignment | undefined> {
    return this.query(ctx)
      .where('asset_id', assetId)
      .where('status', 'active')
      .first();
  }

  async create(ctx: TenantContext, data: Partial<AssetAssignment> & { assignedBy: number }): Promise<AssetAssignment> {
    const { v4: uuidv4 } = await import('uuid');
    const [id] = await this.query(ctx).insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.getById(ctx, id) as Promise<AssetAssignment>;
  }

  async update(ctx: TenantContext, id: number, data: Partial<AssetAssignment>): Promise<AssetAssignment> {
    await this.query(ctx).where('id', id).update({
      ...data,
      updated_at: new Date(),
    });

    return this.getById(ctx, id) as Promise<AssetAssignment>;
  }

  async delete(ctx: TenantContext, id: number): Promise<void> {
    await this.query(ctx).where('id', id).update({
      deleted_at: new Date(),
      updated_at: new Date(),
    });
  }
}
