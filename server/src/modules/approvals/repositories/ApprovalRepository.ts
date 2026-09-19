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

export interface ApprovalDashboardOptions {
  companyId?: number;
  approverRole?: string;
  approverId?: number;
}

export class ApprovalRepository {
  private get db() {
    return db;
  }

  async getDashboardStats(organizationId: number, options?: ApprovalDashboardOptions) {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let escalated = 0;

    const companyId = options?.companyId;

    const categorizeStatus = (statusStr: string | null | undefined) => {
      if (!statusStr) return;
      const s = String(statusStr).trim().toLowerCase();
      if (s.includes('escalat')) {
        escalated++;
      } else if (
        s === 'approved' ||
        s === 'paid' ||
        s === 'fulfilled' ||
        s === 'recovered' ||
        s.startsWith('approved')
      ) {
        approved++;
      } else if (
        s === 'rejected' ||
        s === 'cancelled' ||
        s === 'withdrawn' ||
        s === 'declined' ||
        s.startsWith('rejected')
      ) {
        rejected++;
      } else if (
        s === 'pending' ||
        s === 'submitted' ||
        s === 'in_progress' ||
        s === 'under_review' ||
        s.startsWith('pending')
      ) {
        pending++;
      }
    };

    // 1. Leave Applications
    try {
      let q = this.db('leave_applications as la')
        .where('la.organization_id', organizationId)
        .whereNull('la.deleted_at');
      if (companyId) {
        q = q.join('employees as e', 'la.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }
      const rows = await q.select('la.id', 'la.status');
      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {
      console.error('Error fetching leave application stats:', err);
    }

    // 2. Attendance Regularizations
    try {
      let q = this.db('attendance_regularizations as ar')
        .where('ar.organization_id', organizationId)
        .whereNull('ar.deleted_at');
      if (companyId) {
        q = q.join('employees as e', 'ar.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }
      const rows = await q.select('ar.id', 'ar.status');
      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {}

    // 3. Workflow Approvals (Only count records not already covered in leave_applications or attendance_regularizations)
    try {
      let q = this.db('workflow_approvals as wa')
        .where('wa.organization_id', organizationId)
        .whereNull('wa.deleted_at');

      if (options?.approverRole) {
        q = q.where('wa.approver_role', options.approverRole);
      }
      if (options?.approverId) {
        q = q.where('wa.approver_id', options.approverId);
      }
      if (companyId) {
        q = q.join('employees as e', 'wa.applicant_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }

      const rows = await q
        .whereNotIn('wa.module_type', ['Leave', 'leave', 'leaves', 'Attendance', 'attendance', 'Regularization', 'regularization'])
        .select('wa.status');

      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {
      console.error('Error fetching workflow approvals stats:', err);
    }

    // 4. Expense Claims
    try {
      let q = this.db('expense_claims as ec')
        .where('ec.organization_id', organizationId)
        .whereNull('ec.deleted_at');
      if (companyId) {
        q = q.join('employees as e', 'ec.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }
      const rows = await q.select('ec.id', 'ec.status');
      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {}

    // 5. Salary Advances
    try {
      let q = this.db('salary_advances as sa')
        .where('sa.organization_id', organizationId)
        .whereNull('sa.deleted_at');
      if (companyId) {
        q = q.join('employees as e', 'sa.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }
      const rows = await q.select('sa.id', 'sa.status');
      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {}

    // 6. Comp-off Requests
    try {
      let q = this.db('comp_off_requests as cor')
        .where('cor.organization_id', organizationId)
        .whereNull('cor.deleted_at');
      if (companyId) {
        q = q.join('employees as e', 'cor.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }
      const rows = await q.select('cor.id', 'cor.status');
      for (const row of rows) {
        categorizeStatus(row.status);
      }
    } catch (err) {}

    return {
      pending,
      approved,
      rejected,
      escalated,
    };
  }

  async getRoleBreakdown(organizationId: number, options?: ApprovalDashboardOptions) {
    const companyId = options?.companyId;
    const roleCounts: Record<string, number> = {
      Manager: 0,
      HR: 0,
      'Team Lead': 0,
      Finance: 0,
    };

    // 1. Pending Leave Applications (Waiting for Manager / Team Lead / HR)
    try {
      let q = this.db('leave_applications as la')
        .where('la.organization_id', organizationId)
        .whereNull('la.deleted_at')
        .whereIn('la.status', ['submitted', 'pending', 'pending_manager', 'pending_hr', 'pending_team_lead']);

      if (companyId) {
        q = q.join('employees as e', 'la.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }

      const rows = await q.select('la.status');
      for (const row of rows) {
        const s = (row.status || '').toLowerCase();
        if (s.includes('team_lead')) {
          roleCounts['Team Lead'] = (roleCounts['Team Lead'] || 0) + 1;
        } else if (s.includes('hr')) {
          roleCounts['HR'] = (roleCounts['HR'] || 0) + 1;
        } else {
          roleCounts['Manager'] = (roleCounts['Manager'] || 0) + 1;
        }
      }
    } catch (err) {}

    // 2. Pending Attendance Regularizations
    try {
      let q = this.db('attendance_regularizations as ar')
        .where('ar.organization_id', organizationId)
        .whereNull('ar.deleted_at')
        .where(function () {
          this.where('ar.status', 'like', 'pending%')
            .orWhere('ar.status', 'submitted');
        });

      if (companyId) {
        q = q.join('employees as e', 'ar.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }

      const rows = await q.select('ar.status');
      for (const row of rows) {
        const s = (row.status || '').toLowerCase();
        if (s.includes('hr')) {
          roleCounts['HR'] = (roleCounts['HR'] || 0) + 1;
        } else if (s.includes('team_lead')) {
          roleCounts['Team Lead'] = (roleCounts['Team Lead'] || 0) + 1;
        } else {
          roleCounts['Manager'] = (roleCounts['Manager'] || 0) + 1;
        }
      }
    } catch (err) {}

    // 3. Pending Workflow Approvals
    try {
      let q = this.db('workflow_approvals as wa')
        .where('wa.organization_id', organizationId)
        .whereNull('wa.deleted_at')
        .where(function () {
          this.where('wa.status', 'like', 'Pending%')
            .orWhere('wa.status', 'like', 'pending%')
            .orWhere('wa.status', 'submitted');
        })
        .whereNotIn('wa.module_type', ['Leave', 'leave', 'leaves', 'Attendance', 'attendance']);

      if (companyId) {
        q = q.join('employees as e', 'wa.applicant_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }

      const rows = await q.select('wa.approver_role');
      for (const row of rows) {
        const r = row.approver_role || 'Manager';
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      }
    } catch (err) {}

    // 4. Pending Expense Claims
    try {
      let q = this.db('expense_claims as ec')
        .where('ec.organization_id', organizationId)
        .whereNull('ec.deleted_at')
        .whereIn('ec.status', ['submitted', 'pending', 'pending_manager', 'pending_finance', 'pending_hr']);

      if (companyId) {
        q = q.join('employees as e', 'ec.employee_id', 'e.id')
          .where('e.company_id', companyId)
          .whereNull('e.deleted_at');
      }

      const rows = await q.select('ec.status', 'ec.current_approver_role');
      for (const row of rows) {
        const role = row.current_approver_role;
        if (role) {
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        } else {
          const s = (row.status || '').toLowerCase();
          if (s.includes('finance')) {
            roleCounts['Finance'] = (roleCounts['Finance'] || 0) + 1;
          } else if (s.includes('hr')) {
            roleCounts['HR'] = (roleCounts['HR'] || 0) + 1;
          } else {
            roleCounts['Manager'] = (roleCounts['Manager'] || 0) + 1;
          }
        }
      }
    } catch (err) {}

    // Format output
    return Object.entries(roleCounts)
      .map(([role, count]) => ({
        role,
        count,
      }))
      .filter((item) => item.count > 0);
  }

  async getRecentApprovals(organizationId: number, limit = 50, options?: ApprovalDashboardOptions) {
    const companyId = options?.companyId;
    const combined: any[] = [];
    const seenKeys = new Set<string>();

    // 1. Leave Applications
    try {
      let q = this.db('leave_applications as la')
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
          'la.application_start_date',
          'la.application_end_date',
          'la.total_days',
          'la.reason_description',
          'la.created_at',
          'la.employee_id',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'lt.leave_name',
          'd.name as dept_name'
        )
        .orderBy('la.created_at', 'desc')
        .limit(limit);

      if (companyId) {
        q = q.where('e.company_id', companyId).whereNull('e.deleted_at');
      }

      const rows = await q;
      for (const row of rows) {
        const key = `leave:${row.id}`;
        seenKeys.add(key);

        let s = 'Pending';
        const rawStatus = (row.status || '').toLowerCase();
        if (rawStatus === 'approved') s = 'Approved';
        else if (['rejected', 'cancelled', 'withdrawn', 'declined'].includes(rawStatus)) s = 'Rejected';
        else if (rawStatus.includes('escalat')) s = 'Escalated';

        combined.push({
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organization_id,
          moduleType: 'Leave',
          referenceId: row.id,
          applicantId: row.employee_id,
          approverRole: 'Manager',
          status: s,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          email: row.email,
          details: {
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee',
            department: row.dept_name || 'General',
            role: 'Employee',
            type: row.leave_name ? `${row.leave_name} (${row.total_days || 1} day)` : 'Leave Application',
            time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
            reason: row.reason_description || '',
          },
          createdAt: row.created_at,
        });
      }
    } catch (err) {
      console.error('Error fetching recent leave approvals:', err);
    }

    // 2. Attendance Regularizations
    try {
      let q = this.db('attendance_regularizations as ar')
        .where('ar.organization_id', organizationId)
        .whereNull('ar.deleted_at')
        .leftJoin('employees as e', 'ar.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .select(
          'ar.id',
          'ar.uuid',
          'ar.organization_id',
          'ar.status',
          'ar.regularization_type',
          'ar.request_date',
          'ar.reason_description',
          'ar.created_at',
          'ar.employee_id',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'd.name as dept_name'
        )
        .orderBy('ar.created_at', 'desc')
        .limit(limit);

      if (companyId) {
        q = q.where('e.company_id', companyId).whereNull('e.deleted_at');
      }

      const rows = await q;
      for (const row of rows) {
        const key = `attendance:${row.id}`;
        seenKeys.add(key);

        let s = 'Pending';
        const rawStatus = (row.status || '').toLowerCase();
        if (rawStatus === 'approved') s = 'Approved';
        else if (['rejected', 'cancelled', 'declined'].includes(rawStatus)) s = 'Rejected';
        else if (rawStatus.includes('escalat')) s = 'Escalated';

        const regTypeLabel = row.regularization_type
          ? String(row.regularization_type).replace(/_/g, ' ')
          : 'Regularization';

        combined.push({
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organization_id,
          moduleType: 'Attendance',
          referenceId: row.id,
          applicantId: row.employee_id,
          approverRole: 'Manager',
          status: s,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          email: row.email,
          details: {
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee',
            department: row.dept_name || 'General',
            role: 'Employee',
            type: `Attendance: ${regTypeLabel}`,
            time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
            reason: row.reason_description || '',
          },
          createdAt: row.created_at,
        });
      }
    } catch (err) {}

    // 3. Workflow Approvals
    try {
      let q = this.db('workflow_approvals as wa')
        .where('wa.organization_id', organizationId)
        .whereNull('wa.deleted_at')
        .leftJoin('employees as e', 'wa.applicant_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .select(
          'wa.*',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'd.name as dept_name'
        )
        .orderBy('wa.created_at', 'desc')
        .limit(limit);

      if (companyId) {
        q = q.where('e.company_id', companyId).whereNull('e.deleted_at');
      }

      const rows = await q;
      for (const row of rows) {
        const mod = (row.module_type || '').toLowerCase();
        const key = `${mod}:${row.reference_id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        let s = 'Pending';
        const rawStatus = (row.status || '').toLowerCase();
        if (rawStatus.startsWith('approved')) s = 'Approved';
        else if (rawStatus.startsWith('rejected') || rawStatus === 'cancelled') s = 'Rejected';
        else if (rawStatus.includes('escalat')) s = 'Escalated';

        let parsedDetails: any = {};
        try {
          if (typeof row.details === 'string') parsedDetails = JSON.parse(row.details);
          else if (typeof row.details === 'object' && row.details !== null) parsedDetails = row.details;
        } catch (e) {}

        combined.push({
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organization_id,
          moduleType: row.module_type || 'Workflow',
          referenceId: row.reference_id,
          applicantId: row.applicant_id,
          approverRole: row.approver_role || 'Manager',
          status: s,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          email: row.email,
          details: {
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee',
            department: row.dept_name || parsedDetails.department || 'General',
            role: row.approver_role || 'Employee',
            type: parsedDetails.type || row.module_type || 'Approval Request',
            time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
            ...parsedDetails,
          },
          createdAt: row.created_at,
        });
      }
    } catch (err) {}

    // 4. Expense Claims
    try {
      let q = this.db('expense_claims as ec')
        .where('ec.organization_id', organizationId)
        .whereNull('ec.deleted_at')
        .leftJoin('employees as e', 'ec.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .select(
          'ec.id',
          'ec.uuid',
          'ec.organization_id',
          'ec.status',
          'ec.claim_number',
          'ec.total_claimed_amount',
          'ec.title',
          'ec.created_at',
          'ec.employee_id',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'd.name as dept_name'
        )
        .orderBy('ec.created_at', 'desc')
        .limit(limit);

      if (companyId) {
        q = q.where('e.company_id', companyId).whereNull('e.deleted_at');
      }

      const rows = await q;
      for (const row of rows) {
        const key = `expense:${row.id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        let s = 'Pending';
        const rawStatus = (row.status || '').toLowerCase();
        if (['approved', 'paid'].includes(rawStatus)) s = 'Approved';
        else if (['rejected', 'cancelled'].includes(rawStatus)) s = 'Rejected';
        else if (rawStatus.includes('escalat')) s = 'Escalated';

        combined.push({
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organization_id,
          moduleType: 'Expense',
          referenceId: row.id,
          applicantId: row.employee_id,
          approverRole: 'Finance',
          status: s,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          email: row.email,
          details: {
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee',
            department: row.dept_name || 'Finance',
            role: 'Employee',
            type: row.title ? `Expense: ${row.title} (₹${row.total_claimed_amount || 0})` : 'Expense Claim',
            time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
          },
          createdAt: row.created_at,
        });
      }
    } catch (err) {}

    // 5. Salary Advances
    try {
      let q = this.db('salary_advances as sa')
        .where('sa.organization_id', organizationId)
        .whereNull('sa.deleted_at')
        .leftJoin('employees as e', 'sa.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .select(
          'sa.id',
          'sa.uuid',
          'sa.organization_id',
          'sa.status',
          'sa.advance_amount',
          'sa.reason',
          'sa.created_at',
          'sa.employee_id',
          'e.first_name',
          'e.last_name',
          'e.avatar_url',
          'e.email',
          'd.name as dept_name'
        )
        .orderBy('sa.created_at', 'desc')
        .limit(limit);

      if (companyId) {
        q = q.where('e.company_id', companyId).whereNull('e.deleted_at');
      }

      const rows = await q;
      for (const row of rows) {
        const key = `salary_advance:${row.id}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        let s = 'Pending';
        const rawStatus = (row.status || '').toLowerCase();
        if (['approved', 'recovered'].includes(rawStatus)) s = 'Approved';
        else if (['rejected', 'cancelled'].includes(rawStatus)) s = 'Rejected';

        combined.push({
          id: row.id,
          uuid: row.uuid,
          organizationId: row.organization_id,
          moduleType: 'Salary Advance',
          referenceId: row.id,
          applicantId: row.employee_id,
          approverRole: 'HR',
          status: s,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
          email: row.email,
          details: {
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Employee',
            department: row.dept_name || 'General',
            role: 'Employee',
            type: `Advance: ₹${row.advance_amount || 0}`,
            time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
            reason: row.reason || '',
          },
          createdAt: row.created_at,
        });
      }
    } catch (err) {}

    // Sort by created_at desc
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined.slice(0, limit);
  }
}

export const approvalRepository = new ApprovalRepository();

