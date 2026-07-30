import { db } from '../../../db/knex';

export interface WorkflowApproval {
  id: number;
  uuid: string;
  organization_id: number;
  module_type: string;
  reference_id: number;
  applicant_id: number;
  approver_role: string | null;
  approver_id: number | null;
  status: string;
  details: any;
  created_at: string;
  updated_at: string;
}

export class ApprovalRepository {
  private get db() {
    return db;
  }

  async getDashboardStats(organizationId: number, options?: { approverRole?: string, approverId?: number }) {
    const query = this.db('workflow_approvals')
      .where('organization_id', organizationId)
      .whereNull('deleted_at');

    if (options?.approverRole) {
      query.where('approver_role', options.approverRole);
    }
    if (options?.approverId) {
      query.where('approver_id', options.approverId);
    }

    const rows = await query.select('status');
    
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let escalated = 0;

    for (const row of rows) {
      const s = (row.status || '').toLowerCase();
      if (s.includes('pending')) pending++;
      else if (s.includes('approved')) approved++;
      else if (s.includes('rejected')) rejected++;
      else if (s.includes('escalated')) escalated++;
    }

    return {
      pending,
      approved,
      rejected,
      escalated
    };
  }

  async getRoleBreakdown(organizationId: number) {
    const rows = await this.db('workflow_approvals')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .where('status', 'like', '%Pending%')
      .select('approver_role')
      .count('* as count')
      .groupBy('approver_role');

    return rows.map((r: any) => ({
      role: r.approver_role || 'Employee',
      count: Number(r.count)
    }));
  }

  async getRecentApprovals(organizationId: number, limit = 10) {
    const rows = await this.db('workflow_approvals as wa')
      .where('wa.organization_id', organizationId)
      .whereNull('wa.deleted_at')
      .leftJoin('employees as e', 'wa.applicant_id', 'e.id')
      .select(
        'wa.*',
        'e.first_name',
        'e.last_name',
        'e.avatar_url',
        'e.email'
      )
      .orderBy('wa.created_at', 'desc')
      .limit(limit);

    return rows;
  }
}

export const approvalRepository = new ApprovalRepository();
