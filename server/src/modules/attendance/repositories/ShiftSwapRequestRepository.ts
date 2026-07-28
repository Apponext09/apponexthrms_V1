import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ShiftSwapRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  request_shift_date: string;
  requested_shift_id: number;
  swap_with_employee_id: number;
  swap_shift_date: string | null;
  swap_shift_id: number | null;
  reason: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftSwapRequestRepository extends BaseRepository<ShiftSwapRequest> {
  constructor() {
    super('shift_swap_requests');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'request_shift_date',
      sortOrder: 'desc',
    });
  }

  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'pending' },
      sortBy: 'created_at',
      sortOrder: 'asc',
    });
  }

  async getBySwapDate(
    ctx: TenantContext,
    employeeId: number,
    date: string
  ): Promise<ShiftSwapRequest | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('request_shift_date', date)
      .whereNot('status', 'rejected')
      .first() as Promise<ShiftSwapRequest | null>;
  }

  /**
   * Get all swap requests with requester + swap-with employee + shift details
   */
  async getAllWithJoins(
    ctx: TenantContext,
    options?: ListQueryOptions & { status?: string; search?: string; employeeId?: number }
  ) {
    const { page = 1, pageSize = 50, status, search, employeeId } = options || {};
    const offset = (page - 1) * pageSize;

    let query = this.db('shift_swap_requests as ssr')
      .where('ssr.organization_id', ctx.organizationId)
      .whereNull('ssr.deleted_at')
      // requester employee
      .join('employees as req', 'req.id', 'ssr.employee_id')
      // swap-with employee
      .join('employees as swp', 'swp.id', 'ssr.swap_with_employee_id')
      // requested shift
      .join('shift_templates as rst', 'rst.id', 'ssr.requested_shift_id')
      // swap shift (optional)
      .leftJoin('shift_templates as sst', 'sst.id', 'ssr.swap_shift_id')
      .select(
        'ssr.id',
        'ssr.uuid',
        'ssr.status',
        'ssr.request_shift_date',
        'ssr.swap_shift_date',
        'ssr.reason',
        'ssr.approval_date',
        'ssr.created_at',
        // requester
        'req.id as requester_id',
        'req.employee_code as requester_code',
        'req.first_name as requester_first_name',
        'req.last_name as requester_last_name',
        // swap-with
        'swp.id as swap_with_id',
        'swp.employee_code as swap_with_code',
        'swp.first_name as swap_with_first_name',
        'swp.last_name as swap_with_last_name',
        // shifts
        'rst.shift_name as requested_shift_name',
        'rst.shift_code as requested_shift_code',
        'rst.color as requested_shift_color',
        'sst.shift_name as swap_shift_name',
        'sst.shift_code as swap_shift_code'
      );

    if (status) {
      query = query.where('ssr.status', status);
    }
    if (employeeId) {
      query = query.where('ssr.employee_id', employeeId);
    }
    if (search) {
      query = query.where((q) =>
        q
          .where('req.first_name', 'like', `%${search}%`)
          .orWhere('req.last_name', 'like', `%${search}%`)
          .orWhere('rst.shift_name', 'like', `%${search}%`)
      );
    }

    const countResult = await query.clone().clearSelect().count('* as total').first() as any;
    const items = await query
      .orderBy('ssr.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      meta: {
        total: Number(countResult?.total || 0),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countResult?.total || 0) / pageSize),
        hasMore: page * pageSize < Number(countResult?.total || 0),
      },
    };
  }

  protected getSearchableFields(): string[] {
    return ['reason'];
  }
}
