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

    let empId = user?.employee_id || user?.employeeId || null;

    if (!empId && user?.email) {
      const empByEmail = await this.db('employees')
        .where('email', user.email)
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByEmail) empId = empByEmail.id;
    }

    if (!empId && (user as any)?.first_name) {
      const empByName = await this.db('employees')
        .where('first_name', (user as any).first_name)
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByName) empId = empByName.id;
    }

    return empId;
  }

  /**
   * Get team lead dashboard summary metrics
   */
  async getTeamDashboard(ctx: TenantContext) {
    const leadEmpId = await this.getEmployeeId(ctx);
    let teamMembers: any[] = [];

    if (leadEmpId) {
      teamMembers = await this.db('employees')
        .where('reporting_manager_id', leadEmpId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
    }

    if (teamMembers.length === 0) {
      teamMembers = await this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
    }

    const totalTeamMembers = teamMembers.length;
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
    let team: any[] = [];

    if (leadEmpId) {
      team = await this.db('employees')
        .where('reporting_manager_id', leadEmpId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select(
          'id',
          'first_name',
          'last_name',
          'email',
          'mobile',
          'phone',
          'employee_code',
          'status',
          'employment_type',
          'date_of_joining',
          'current_designation_id',
          'current_department_id'
        );
    }

    if (team.length === 0 && leadEmpId) {
      const selfEmp = await this.db('employees').where('id', leadEmpId).first();
      const selfDeptId = selfEmp?.current_department_id || selfEmp?.currentDepartmentId || selfEmp?.department_id || selfEmp?.departmentId;
      if (selfDeptId) {
        team = await this.db('employees')
          .where('organization_id', ctx.organizationId)
          .where('current_department_id', selfDeptId)
          .whereNot('id', leadEmpId)
          .whereNull('deleted_at')
          .select(
            'id',
            'first_name',
            'last_name',
            'email',
            'mobile',
            'phone',
            'employee_code',
            'status',
            'employment_type',
            'date_of_joining',
            'current_designation_id',
            'current_department_id'
          );
      }
    }

    if (team.length === 0) {
      let q = this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
      if (leadEmpId) {
        q = q.whereNot('id', leadEmpId);
      }
      team = await q.select(
        'id',
        'first_name',
        'last_name',
        'email',
        'mobile',
        'phone',
        'employee_code',
        'status',
        'employment_type',
        'date_of_joining',
        'current_designation_id',
        'current_department_id'
      );
    }

    // Fetch designations to resolve names
    const desigs = await this.db('designations')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');
    const desigMap = new Map(desigs.map((d: any) => [d.id, d.name]));

    const depts = await this.db('departments')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');
    const deptMap = new Map(depts.map((d: any) => [d.id, d.name]));

    return team.map((member: any) => {
      const fName = member.firstName || member.first_name || '';
      const lName = member.lastName || member.last_name || '';
      const desigId = member.currentDesignationId || member.current_designation_id;
      const deptId = member.currentDepartmentId || member.current_department_id;
      const desigName = desigMap.get(desigId) || (fName ? 'Department Specialist' : 'Specialist');
      const deptName = deptMap.get(deptId) || 'General';

      return {
        id: member.id,
        firstName: fName,
        lastName: lName,
        first_name: fName,
        last_name: lName,
        name: `${fName} ${lName}`.trim() || member.email || `Employee #${member.id}`,
        email: member.email,
        mobile: member.mobile || member.phone || '',
        phone: member.mobile || member.phone || '',
        employeeCode: member.employeeCode || member.employee_code || `EMP${String(member.id).padStart(3, '0')}`,
        employee_code: member.employeeCode || member.employee_code || `EMP${String(member.id).padStart(3, '0')}`,
        code: member.employeeCode || member.employee_code || `EMP${String(member.id).padStart(3, '0')}`,
        status: member.status || 'active',
        employmentType: member.employmentType || member.employment_type || 'Full-time',
        employment_type: member.employmentType || member.employment_type || 'Full-time',
        dateOfJoining: member.dateOfJoining || member.date_of_joining || '',
        date_of_joining: member.dateOfJoining || member.date_of_joining || '',
        designation: desigName,
        designation_name: desigName,
        department: deptName,
        department_name: deptName,
      };
    });
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
    const teamMap = new Map(team.map((m: any) => [m.id, `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim()]));

    // Query pending leave applications
    const leaves = await this.db('leave_applications')
      .whereIn('employee_id', teamMemberIds)
      .where('status', 'submitted')
      .where('organization_id', ctx.organizationId)
      .orderBy('application_start_date', 'asc');

    return leaves.map((l: any) => ({
      id: l.id,
      uuid: l.uuid,
      employeeId: l.employeeId || l.employee_id,
      employeeName: teamMap.get(l.employeeId || l.employee_id) || 'Team Member',
      startDate: l.applicationStartDate || l.application_start_date,
      endDate: l.applicationEndDate || l.application_end_date,
      totalDays: l.totalDays || l.total_days,
      reason: l.reasonDescription || l.reason_description,
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
