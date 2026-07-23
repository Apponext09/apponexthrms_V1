import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export class TeamLeadService {
  private db = getKnex();

  /**
   * Helper to resolve team lead's employee ID from user context
   */
  private async getEmployeeId(ctx: TenantContext): Promise<number | null> {
    const user = await this.db('users')
      .where('id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .first();
    return user?.employee_id || user?.employeeId || null;
  }

  /**
   * Get team lead dashboard summary metrics
   */
  async getTeamDashboard(ctx: TenantContext) {
    const leadEmpId = await this.getEmployeeId(ctx);
    if (!leadEmpId) {
      return {
        totalTeamMembers: 0,
        activeToday: 0,
        onLeave: 0,
        pendingApprovals: 0,
        teamAttendanceRate: 100,
      };
    }

    // Get direct reports
    const teamMembers = await this.db('employees')
      .where('reporting_manager_id', leadEmpId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

    const totalTeamMembers = teamMembers.length;
    if (totalTeamMembers === 0) {
      return {
        totalTeamMembers: 0,
        activeToday: 0,
        onLeave: 0,
        pendingApprovals: 0,
        teamAttendanceRate: 100,
      };
    }

    const teamMemberIds = teamMembers.map((m) => m.id);
    const todayStr = new Date().toISOString().split('T')[0];

    // Get today's attendance records
    const attendanceRecords = await this.db('attendance_records')
      .whereIn('employee_id', teamMemberIds)
      .where('check_in_date', todayStr)
      .where('organization_id', ctx.organizationId);

    const activeToday = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'work_from_home').length;
    const onLeave = attendanceRecords.filter((r) => r.status === 'on_leave').length;

    // Get pending leave application count
    const pendingCountResult = await this.db('leave_applications')
      .whereIn('employee_id', teamMemberIds)
      .where('status', 'submitted')
      .where('organization_id', ctx.organizationId)
      .count('id as total')
      .first();

    const pendingApprovals = Number((pendingCountResult as any)?.total || 0);
    const teamAttendanceRate = totalTeamMembers > 0 ? Math.round((activeToday / totalTeamMembers) * 100) : 100;

    return {
      totalTeamMembers,
      activeToday,
      onLeave,
      pendingApprovals,
      teamAttendanceRate,
    };
  }

  /**
   * List of direct reports
   */
  async getTeamMembers(ctx: TenantContext) {
    const leadEmpId = await this.getEmployeeId(ctx);
    if (!leadEmpId) return [];

    const team = await this.db('employees')
      .where('reporting_manager_id', leadEmpId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select('id', 'first_name', 'last_name', 'email', 'mobile', 'status', 'employment_type', 'date_of_joining', 'current_designation_id');

    // Fetch designations to resolve names
    const desigs = await this.db('designations')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');

    const desigMap = new Map(desigs.map((d) => [d.id, d.name]));

    return team.map((member) => ({
      id: member.id,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      mobile: member.mobile,
      status: member.status,
      employmentType: member.employment_type,
      dateOfJoining: member.date_of_joining,
      designation: desigMap.get(member.current_designation_id) || 'Team Member',
    }));
  }

  /**
   * List of pending approvals for direct reports
   */
  async getPendingApprovals(ctx: TenantContext) {
    const leadEmpId = await this.getEmployeeId(ctx);
    if (!leadEmpId) return [];

    const team = await this.db('employees')
      .where('reporting_manager_id', leadEmpId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select('id', 'first_name', 'last_name');

    if (team.length === 0) return [];

    const teamMemberIds = team.map((m) => m.id);
    const teamMap = new Map(team.map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

    // Query pending leave applications
    const leaves = await this.db('leave_applications')
      .whereIn('employee_id', teamMemberIds)
      .where('status', 'submitted')
      .where('organization_id', ctx.organizationId)
      .orderBy('application_start_date', 'asc');

    return leaves.map((l) => ({
      id: l.id,
      uuid: l.uuid,
      employeeId: l.employee_id,
      employeeName: teamMap.get(l.employee_id) || 'Team Member',
      startDate: l.application_start_date,
      endDate: l.application_end_date,
      totalDays: l.total_days,
      reason: l.reason_description,
      status: l.status,
    }));
  }

  /**
   * Action on leave application (approve/reject)
   */
  async decideApproval(ctx: TenantContext, approvalId: number, status: 'approved' | 'rejected', comment?: string) {
    const leadEmpId = await this.getEmployeeId(ctx);
    if (!leadEmpId) {
      throw new Error('Action unauthorized');
    }

    const application = await this.db('leave_applications')
      .where('id', approvalId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!application) {
      throw new Error('Leave application not found');
    }

    // Verify applicant reports to this team lead
    const employee = await this.db('employees')
      .where('id', application.employee_id)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!employee || employee.reporting_manager_id !== leadEmpId) {
      throw new Error('Action unauthorized: applicant does not report to you');
    }

    await this.db('leave_applications')
      .where('id', approvalId)
      .update({
        status,
        approved_by: leadEmpId,
        approval_date: new Date(),
        rejection_reason: status === 'rejected' ? comment || 'Rejected by Team Lead' : null,
        updated_at: new Date(),
      });

    return {
      success: true,
      message: `Leave application ${status} successfully.`,
    };
  }
}
