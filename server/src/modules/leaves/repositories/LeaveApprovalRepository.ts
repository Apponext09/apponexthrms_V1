import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface LeaveApproval {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  approval_level: number;
  approver_user_id: number;
  approval_action: 'approve' | 'reject' | 'delegate';
  approval_date: string;
  approval_comments: string | null;
  created_at: string;
}

export class LeaveApprovalRepository extends BaseRepository<LeaveApproval> {
  constructor() {
    super('leave_approvals');
  }

  /**
   * Get approvals for application
   */
  async getForApplication(ctx: TenantContext, applicationId: number): Promise<LeaveApproval[]> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .orderBy('approval_level', 'asc') as Promise<LeaveApproval[]>;
  }

  /**
   * Get approval by level
   */
  async getByLevel(ctx: TenantContext, applicationId: number, level: number): Promise<LeaveApproval | null> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .where('approval_level', level)
      .first() as Promise<LeaveApproval | null>;
  }

  /**
   * Get approvals by user
   */
  async getByApprover(ctx: TenantContext, approverId: number): Promise<LeaveApproval[]> {
    return this.query(ctx)
      .where('approver_user_id', approverId)
      .orderBy('approval_date', 'desc') as Promise<LeaveApproval[]>;
  }
}
