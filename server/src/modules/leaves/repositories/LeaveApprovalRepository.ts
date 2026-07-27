import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeaveApproval {
  id: number;
  uuid: string;
  organizationId: number;
  leaveApplicationId: number;
  approverId: number;
  approvalLevel: number;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  approvalDate: string;
  comments: string | null;
  rejectionReason: string | null;
  createdAt: string;
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
      .where('leave_application_id', applicationId)
      .orderBy('approval_level', 'asc') as Promise<LeaveApproval[]>;
  }

  /**
   * Get approval by level
   */
  async getByLevel(ctx: TenantContext, applicationId: number, level: number): Promise<LeaveApproval | null> {
    return this.query(ctx)
      .where('leave_application_id', applicationId)
      .where('approval_level', level)
      .first() as Promise<LeaveApproval | null>;
  }

  /**
   * Get pending approvals for user
   */
  async getPending(ctx: TenantContext, approverId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: {
        approver_id: approverId,
        status: 'pending',
      },
    });
  }
}
