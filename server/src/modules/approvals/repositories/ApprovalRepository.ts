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

    const waRows = await query.select('status');

    // Stats from leave_applications
    const leaveQuery = this.db('leave_applications')
      .where('organization_id', organizationId)
      .whereNull('deleted_at');
    
    const leaveRows = await leaveQuery.select('status');

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let escalated = 0;

    for (const row of waRows) {
      const s = (row.status || '').toLowerCase();
      if (s.includes('pending') || s.includes('submitted')) pending++;
      else if (s.includes('approved')) approved++;
      else if (s.includes('rejected')) rejected++;
      else if (s.includes('escalated')) escalated++;
    }

    for (const row of leaveRows) {
      const s = (row.status || '').toLowerCase();
      if (s === 'submitted' || s === 'pending') pending++;
      else if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
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

    const result = rows.map((r: any) => ({
      role: r.approver_role || 'Employee',
      count: Number(r.count)
    }));

    // Add Leave Application count for Managers if there are pending leave applications
    try {
      const pendingLeaves = await this.db('leave_applications')
        .where('organization_id', organizationId)
        .whereNull('deleted_at')
        .whereIn('status', ['submitted', 'pending'])
        .count('* as count')
        .first();
      
      const leaveCount = Number(pendingLeaves?.count || 0);
      if (leaveCount > 0) {
        const managerIndex = result.findIndex(r => r.role === 'Manager');
        if (managerIndex >= 0) {
          result[managerIndex].count += leaveCount;
        } else {
          result.push({ role: 'Manager', count: leaveCount });
        }
      }
    } catch (err) {
      // Ignore fallback issues
    }

    return result;
  }

  async getRecentApprovals(organizationId: number, limit = 10) {
    const waRows = await this.db('workflow_approvals as wa')
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

    // Get recent from leave_applications
    let mappedLeaves: any[] = [];
    try {
      const leaveRows = await this.db('leave_applications as la')
        .where('la.organization_id', organizationId)
        .whereNull('la.deleted_at')
        .leftJoin('employees as e', 'la.employee_id', 'e.id')
        .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .select(
          'la.id',
          'la.uuid',
          'la.organization_id',
          'la.status',
          'la.created_at',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'lt.leave_name',
          'd.name as dept_name'
        )
        .orderBy('la.created_at', 'desc')
        .limit(limit);

      mappedLeaves = leaveRows.map((row: any) => {
        let s = 'Pending';
        if (row.status === 'approved') s = 'Approved';
        else if (row.status === 'rejected') s = 'Rejected';
        else if (row.status === 'cancelled' || row.status === 'withdrawn') s = 'Rejected';

        return {
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organizationId,
          moduleType: 'Leave',
          referenceId: row.id,
          applicantId: row.id,
          approverRole: 'Manager',
          status: s,
          firstName: row.firstName,
          lastName: row.lastName,
          avatarUrl: row.avatarUrl,
          email: row.email,
          details: {
            name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
            department: row.deptName || 'Engineering',
            type: row.leaveName || 'Leave',
            time: new Date(row.createdAt).toLocaleDateString()
          },
          createdAt: row.createdAt
        };
      });
    } catch (err) {
      // Ignore
    }

    const combined = [...waRows, ...mappedLeaves];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined.slice(0, limit);
  }
}

export const approvalRepository = new ApprovalRepository();
