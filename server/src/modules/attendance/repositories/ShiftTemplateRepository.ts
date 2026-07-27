import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ShiftTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  shift_name: string;
  shift_code: string;
  shift_type: 'fixed' | 'flexible' | 'night' | 'roster';
  start_time: string | null;
  end_time: string | null;
  duration_hours: number;
  grace_period_minutes: number;
  break_duration_minutes: number;
  is_night_shift: boolean;
  is_flexible: boolean;
  flexible_start_range_start: string | null;
  flexible_start_range_end: string | null;
  color: string;
  description: string | null;
  roster_pattern: any | null;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftTemplateRepository extends BaseRepository<ShiftTemplate> {
  constructor() {
    super('shift_templates');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<ShiftTemplate | null> {
    return this.query(ctx).where('shift_code', code).first() as Promise<ShiftTemplate | null>;
  }

  async isCodeUnique(ctx: TenantContext, code: string, shiftType?: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('shift_code', code);
    if (shiftType) {
      if (shiftType === 'roster') {
        query = query.where('shift_type', 'roster');
      } else {
        query = query.whereNot('shift_type', 'roster');
      }
    }
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getActiveShifts(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'active' },
    });
  }

  async getAllShifts(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
    });
  }

  async getDefaultShift(ctx: TenantContext): Promise<ShiftTemplate | null> {
    return this.query(ctx).where('is_default', true).first() as Promise<ShiftTemplate | null>;
  }

  async getByType(ctx: TenantContext, shiftType: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { shift_type: shiftType },
    });
  }

  /**
   * Update a shift template by ID
   */
  async updateShift(
    ctx: TenantContext,
    shiftId: number,
    data: Partial<ShiftTemplate>
  ): Promise<ShiftTemplate | null> {
    await this.query(ctx)
      .where('id', shiftId)
      .update({
        ...data,
        updated_by: ctx.userId,
        updated_at: this.db.fn.now() as any,
      });
    return this.getById(ctx, shiftId);
  }

  /**
   * Soft-delete a shift template
   */
  async softDelete(ctx: TenantContext, shiftId: number): Promise<void> {
    await this.query(ctx)
      .where('id', shiftId)
      .update({
        deleted_at: this.db.fn.now() as any,
        updated_by: ctx.userId,
        status: 'inactive',
      });
  }

  /**
   * Toggle status active/inactive
   */
  async toggleStatus(
    ctx: TenantContext,
    shiftId: number,
    status: 'active' | 'inactive'
  ): Promise<ShiftTemplate | null> {
    await this.query(ctx)
      .where('id', shiftId)
      .update({ status, updated_by: ctx.userId, updated_at: this.db.fn.now() as any });
    return this.getById(ctx, shiftId);
  }

  /**
   * Get all shifts with employee assignment counts
   */
  async getShiftsWithCounts(ctx: TenantContext, options?: ListQueryOptions) {
    const { page = 1, pageSize = 50, search } = options || {};
    const offset = (page - 1) * pageSize;

    let baseQuery = this.db('shift_templates as st')
      .where('st.organization_id', ctx.organizationId)
      .whereNull('st.deleted_at')
      .leftJoin(
        this.db('employee_shift_assignments')
          .where('organization_id', ctx.organizationId)
          .where('is_current', true)
          .groupBy('shift_id')
          .select('shift_id')
          .count('* as employee_count')
          .as('esa'),
        'esa.shift_id',
        'st.id'
      )
      .select(
        'st.*',
        this.db.raw('COALESCE(esa.employee_count, 0) as employee_count')
      );

    if (search) {
      baseQuery = baseQuery.where((q) =>
        q
          .where('st.shift_name', 'like', `%${search}%`)
          .orWhere('st.shift_code', 'like', `%${search}%`)
      );
    }

    const countQuery = baseQuery.clone().clearSelect().count('* as total').first() as any;
    const [countRow, rows] = await Promise.all([
      countQuery,
      baseQuery.orderBy('st.created_at', 'desc').limit(pageSize).offset(offset),
    ]);

    return {
      items: rows,
      meta: {
        total: Number(countRow?.total || 0),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countRow?.total || 0) / pageSize),
        hasMore: page * pageSize < Number(countRow?.total || 0),
      },
    };
  }

  protected getSearchableFields(): string[] {
    return ['shift_name', 'shift_code', 'description'];
  }
}
