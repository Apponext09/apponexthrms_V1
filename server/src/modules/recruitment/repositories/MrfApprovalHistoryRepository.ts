import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface MrfApprovalHistory {
  id: number;
  uuid: string;
  organization_id: number;
  mrf_request_id: number;
  approver_id: number | null;
  action: 'approved' | 'rejected' | 'returned' | 'submitted';
  comment: string | null;
  acted_at: string;
  created_at: string;
  updated_at: string;
}

export class MrfApprovalHistoryRepository extends BaseRepository<MrfApprovalHistory> {
  constructor() {
    super('mrf_approval_history');
  }

  override async create(ctx: TenantContext, data: Partial<MrfApprovalHistory>): Promise<MrfApprovalHistory> {
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  protected getSearchableFields(): string[] {
    return [];
  }

  async getByMrfId(ctx: TenantContext, mrfRequestId: number): Promise<any[]> {
    return this.query(ctx)
      .leftJoin('users as approver_user', 'mrf_approval_history.approver_id', 'approver_user.id')
      .leftJoin('employees as approver_emp', 'approver_user.employee_id', 'approver_emp.id')
      .where('mrf_request_id', mrfRequestId)
      .select([
        'mrf_approval_history.*',
        this.db.raw("CONCAT(COALESCE(approver_emp.first_name, approver_user.first_name), ' ', COALESCE(approver_emp.last_name, approver_user.last_name, '')) as approver_name")
      ])
      .orderBy('acted_at', 'desc') as any;
  }

  async getLatestAction(ctx: TenantContext, mrfRequestId: number): Promise<any | null> {
    return this.query(ctx)
      .leftJoin('users as approver_user', 'mrf_approval_history.approver_id', 'approver_user.id')
      .leftJoin('employees as approver_emp', 'approver_user.employee_id', 'approver_emp.id')
      .where('mrf_request_id', mrfRequestId)
      .select([
        'mrf_approval_history.*',
        this.db.raw("CONCAT(COALESCE(approver_emp.first_name, approver_user.first_name), ' ', COALESCE(approver_emp.last_name, approver_user.last_name, '')) as approver_name")
      ])
      .orderBy('acted_at', 'desc')
      .first();
  }
}
