import { getKnex } from '../../db/knex';
import type { TenantContext } from '../../db/types';

export interface AdminDashboardStats {
  companyInfo: {
    id: number | null;
    name: string;
    code?: string;
    isParent: boolean;
    location?: string;
    status?: string;
  };
  kpis: {
    totalHeadcount: number;
    activeDepartments: number;
    officeLocations: number;
    reportingOfficers: number;
    openJobs: number;
    monthlyPayrollCost: number;
    pendingApprovals: number;
    newHires: number;
    onLeaveToday: number;
  };
  growthTrend: Array<{
    month: string;
    employees: number;
  }>;
  departmentBreakdown: Array<{
    id: number;
    name: string;
    count: number;
    percentage: number;
  }>;
  recentEmployees: Array<{
    id: number;
    firstName: string;
    lastName: string;
    employeeCode: string;
    status: string;
    avatarUrl?: string;
    departmentName?: string;
  }>;
  attendanceAnalytics: {
    today: {
      present: number;
      late: number;
      halfDay: number;
      wfh: number;
      onLeave: number;
      absent: number;
      totalHeadcount: number;
      attendanceRate: number;
    };
    weeklyTrend: Array<{
      day: string;
      date: string;
      present: number;
      late: number;
      absent: number;
    }>;
  };
  leaveAnalytics: {
    byType: Array<{
      leaveTypeId: number;
      name: string;
      code: string;
      color: string;
      approvedCount: number;
      pendingCount: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      applied: number;
      approved: number;
    }>;
  };
  payrollAnalytics: {
    monthlyTrend: Array<{
      month: string;
      grossSalary: number;
      netSalary: number;
      deductions: number;
    }>;
  };
  recruitmentAnalytics: {
    pipelineStages: Array<{
      stage: string;
      label: string;
      count: number;
    }>;
    openJobsByDept: Array<{
      departmentName: string;
      openCount: number;
    }>;
  };
  expenseAnalytics: {
    monthlyTrend: Array<{
      month: string;
      claimedAmount: number;
      approvedAmount: number;
    }>;
    byCategory: Array<{
      categoryName: string;
      totalAmount: number;
    }>;
  };
  workforceAnalytics: {
    byEmploymentType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    byGender: Array<{ gender: string; count: number }>;
  };
}

export class AdminDashboardService {
  async getMyStats(ctx: TenantContext) {
    const db = getKnex();
    const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first();
    let employeeId = Number(user?.employeeId || user?.employee_id || ctx.employeeId || 0);
    if (!employeeId && user?.email) employeeId = Number((await db('employees').where({ organization_id: ctx.organizationId, email: user.email }).first())?.id || 0);
    if (!employeeId) return { attendanceDays: 0, leaveDays: 0, payslipCount: 0, expenseAmount: 0, pendingExpenses: 0, activeTasks: 0, startDate: null, endDate: null };
    const employee = await db('employees').where({ id: employeeId, organization_id: ctx.organizationId }).first();
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10);
    const count = async (table: string, apply: (q: any) => any) => {
      if (!(await db.schema.hasTable(table))) return 0;
      const row = await apply(db(table)).count('id as total').first(); return Number(row?.total || 0);
    };
    const sum = async (table: string, column: string, apply: (q: any) => any) => {
      if (!(await db.schema.hasTable(table)) || !(await db.schema.hasColumn(table, column))) return 0;
      const row = await apply(db(table)).sum(`${column} as total`).first(); return Number(row?.total || 0);
    };
    const [attendanceDays, leaveDays, payslipCount, expenseAmount, pendingExpenses, activeTasks] = await Promise.all([
      count('attendance_records', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).where('check_in_date', '>=', monthStart).whereIn('status', ['present', 'work_from_home'])),
      count('leave_applications', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).whereIn('status', ['approved', 'submitted', 'pending'])),
      count('payslips', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).whereNull('deleted_at')),
      sum('expense_claims', 'amount', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).whereNull('deleted_at')),
      count('expense_claims', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).whereIn('status', ['submitted', 'pending', 'pending_manager', 'pending_finance']).whereNull('deleted_at')),
      count('employee_tasks', q => q.where({ organization_id: ctx.organizationId, employee_id: employeeId }).whereIn('status', ['open', 'in_progress', 'active']).whereNull('deleted_at')),
    ]);
    return { attendanceDays, leaveDays, payslipCount, expenseAmount, pendingExpenses, activeTasks, startDate: employee?.dateOfJoining || employee?.date_of_joining || null, endDate: employee?.probationEndDate || employee?.probation_end_date || employee?.contract_end_date || null };
  }

  async getAdminStats(ctx: TenantContext): Promise<AdminDashboardStats> {
    const db = getKnex();
    const { organizationId, companyId } = ctx;

    // Helper to format location object/string
    const buildLocationStr = (c: any): string => {
      if (!c) return '';
      if (typeof c === 'string') return c;
      const parts = [
        c.city || c.addressLine1 || c.address_line_1 || c.address_line_2,
        c.state,
        c.country,
      ].filter(Boolean);
      return parts.join(', ');
    };

    // 1. Resolve Company Information
    let companyName = 'Organization';
    let companyCode = '';
    let isParent = !companyId;
    let location = '';
    let companyIdVal: number | null = companyId || null;

    let targetCompRow: any = null;
    if (companyId) {
      targetCompRow = await db('company')
        .where('company_id', companyId)
        .whereNull('deleted_at')
        .first();
      if (targetCompRow) {
        companyName = targetCompRow.name || companyName;
        companyCode = targetCompRow.code || '';
        isParent = Boolean(targetCompRow.isParent ?? targetCompRow.is_parent);
        location = buildLocationStr(targetCompRow);
        companyIdVal = Number(targetCompRow.companyId || targetCompRow.company_id || targetCompRow.id);
      }
    } else {
      // Find parent company for org or org name
      const parentComp = await db('company')
        .where('organization_id', organizationId)
        .where((b) => b.where('is_parent', 1).orWhere('is_parent', true))
        .whereNull('deleted_at')
        .first();

      if (parentComp) {
        targetCompRow = parentComp;
        companyName = parentComp.name;
        companyCode = parentComp.code || '';
        companyIdVal = Number(parentComp.companyId || parentComp.company_id || parentComp.id);
        isParent = true;
        location = buildLocationStr(parentComp);
      }
    }

    // `companyIdVal` identifies the parent company for display purposes only.
    // It must not scope organization-mode statistics; in that mode every KPI and
    // location must use organization_id.  Scope by company only after an explicit
    // company switch has supplied ctx.companyId.
    const targetCompanyId = companyId || null;

    // Dashboard header location belongs to the organization itself. A company
    // address or a Location Master record must not override organizations.location.
    if (organizationId) {
      const org = await db('organizations').where('id', organizationId).first();
      if (org) {
        if (!companyName || companyName === 'Organization') {
          companyName = org.name || companyName;
          companyCode = org.code || '';
        }
        location = org.location || buildLocationStr(org) || org.addressLine1 || org.address_line_1 || location;
      }
    }

    if (!location) {
      location = 'Not Specified';
    }

    // Total Employees excludes the CEO / organization administrator account.
    let totalHeadcount = 0;
    try {
      let empQuery = db('employees')
        .whereNull('employees.deleted_at')
        // Dashboard headcount is active workforce only. Notice, exited,
        // inactive, alumni, onboarding and candidate records are not staff
        // currently counted by the Total Employees KPI.
        .where('employees.status', 'active')
        .whereNotExists(function () {
          this.select('ceo_user.id')
            .from('users as ceo_user')
            .join('user_roles as ceo_user_role', 'ceo_user_role.user_id', 'ceo_user.id')
            .join('roles as ceo_role', 'ceo_role.id', 'ceo_user_role.role_id')
            .whereRaw('ceo_user.employee_id = employees.id')
            .whereIn('ceo_role.code', ['ceo', 'organization_admin', 'super_admin']);
        });

      if (targetCompanyId) {
        empQuery = empQuery.where('employees.company_id', targetCompanyId);
      } else {
        empQuery = empQuery.where('employees.organization_id', organizationId);
      }
      const [empCountRow] = await empQuery.count('* as count');
      totalHeadcount = Number(empCountRow?.count || 0);
    } catch (e) {
      console.warn('[AdminDashboardService] empQuery error fallback:', e);
      try {
        let fallbackEmp = db('employees')
          .whereNull('deleted_at')
          .where('status', 'active');
        if (targetCompanyId) {
          fallbackEmp = fallbackEmp.where('company_id', targetCompanyId);
        } else {
          fallbackEmp = fallbackEmp.where('organization_id', organizationId);
        }
        const [empRow] = await fallbackEmp.count('* as count');
        totalHeadcount = Number(empRow?.count || 0);
      } catch {
        totalHeadcount = 0;
      }
    }

    // Active departments only.
    let activeDepartments = 0;
    try {
      let deptQuery = db('departments')
        .whereNull('deleted_at')
        .where(function () {
          this.where('status', 'active').orWhere('status', 'Active').orWhereNull('status');
        });
      if (targetCompanyId) {
        const cIdNum = Number(targetCompanyId);
        const cIdStr = String(targetCompanyId);
        deptQuery = deptQuery.where((builder) => {
          builder.where('departments.company_id', cIdNum)
            .orWhereRaw("JSON_CONTAINS(departments.company_ids, ?)", [JSON.stringify(cIdNum)])
            .orWhereRaw("JSON_CONTAINS(departments.company_ids, ?)", [JSON.stringify(cIdStr)])
            .orWhereNull('departments.company_id');
        });
      } else {
        deptQuery = deptQuery.where('organization_id', organizationId);
      }
      const [deptCountRow] = await deptQuery.count('* as count');
      activeDepartments = Number(deptCountRow?.count || 0);
    } catch (e) {
      console.warn('[AdminDashboardService] deptQuery error:', e);
      activeDepartments = 0;
    }

    // Office locations.
    let locCount = 0;
    try {
      const hasLocationsTable = await db.schema.hasTable('locations');
      if (hasLocationsTable) {
        let locQuery = db('locations').whereNull('deleted_at');
        if (targetCompanyId) {
          locQuery = locQuery.where('company_id', targetCompanyId);
        } else {
          locQuery = locQuery.where('organization_id', organizationId);
        }
        const [locRow] = await locQuery.count('* as count');
        locCount = Number(locRow?.count || 0);
      }
    } catch (e) {
      locCount = 0;
    }

    // Reporting Officers (distinct managers)
    let reportingOfficers = 0;
    try {
      let officerQuery = db('employees')
        .whereNull('deleted_at')
        .whereNotNull('reporting_manager_id');
      if (targetCompanyId) {
        officerQuery = officerQuery.where('company_id', targetCompanyId);
      } else {
        officerQuery = officerQuery.where('organization_id', organizationId);
      }
      const [officerRow] = await officerQuery.countDistinct('reporting_manager_id as count');
      reportingOfficers = Number(officerRow?.count || 0);
    } catch (e) {
      reportingOfficers = 0;
    }

    // ── Open Job Postings ─────────────────────────────────────────────────────
    // Matches the "Open Positions" KPI on /recruitment/jobs:
    // COUNT jobs WHERE status = 'published' (active open postings only).
    let openJobs = 0;
    try {
      const hasJobsTable = await db.schema.hasTable('jobs');
      if (hasJobsTable) {
        let openJobsQuery = db('jobs')
          .whereNull('deleted_at')
          .where('status', 'published'); // only 'published' = open on the jobs page
        if (targetCompanyId) {
          // Older job records are tied to a company through their location rather
          // than a direct company_id column.
          const hasJobCompanyId = await db.schema.hasColumn('jobs', 'company_id');
          if (hasJobCompanyId) {
            openJobsQuery = openJobsQuery.where('company_id', targetCompanyId);
          } else {
            openJobsQuery = openJobsQuery.whereIn(
              'location_id',
              db('locations').where('company_id', targetCompanyId).select('id')
            );
          }
        } else {
          openJobsQuery = openJobsQuery.where('organization_id', organizationId);
        }
        const [openJobsRow] = await openJobsQuery.count('* as count');
        openJobs = Number(openJobsRow?.count || 0);
      }
    } catch (err) {
      openJobs = 0;
    }

    // ── Pending Approvals (Approval Inbox total) ──────────────────────────────
    // Matches the Approval Inbox count on /approvals/dashboard.
    let pendingApprovals = 0;
    try {
      // 1. leave_applications — submitted or any pending variant
      let laQuery = db('leave_applications as la')
        .whereNull('la.deleted_at')
        .whereIn('la.status', ['submitted', 'pending', 'pending_manager', 'pending_hr', 'pending_hr_override', 'pending_team_lead', 'escalated']);
      if (targetCompanyId) {
        laQuery = laQuery
          .join('employees as e', 'la.employee_id', 'e.id')
          .where('e.company_id', targetCompanyId)
          .whereNull('e.deleted_at');
      } else {
        laQuery = laQuery.where('la.organization_id', organizationId);
      }
      const [laRow] = await laQuery.count('* as count');
      pendingApprovals += Number(laRow?.count || 0);

      // 2. attendance_regularizations
      try {
        let arQuery = db('attendance_regularizations as ar')
          .whereNull('ar.deleted_at')
          .where(function () {
            this.where('ar.status', 'like', 'pending%')
              .orWhere('ar.status', 'submitted');
          });
        if (targetCompanyId) {
          arQuery = arQuery
            .join('employees as e', 'ar.employee_id', 'e.id')
            .where('e.company_id', targetCompanyId)
            .whereNull('e.deleted_at');
        } else {
          arQuery = arQuery.where('ar.organization_id', organizationId);
        }
        const [arRow] = await arQuery.count('* as count');
        pendingApprovals += Number(arRow?.count || 0);
      } catch (e) {}

      // 3. workflow_approvals — non-duplicate modules
      let workflowApprovalQuery = db('workflow_approvals as wa')
        .whereNull('wa.deleted_at')
        .where(function () {
          this.where('wa.status', 'like', 'Pending%')
            .orWhere('wa.status', 'like', 'pending%')
            .orWhereIn('wa.status', ['submitted', 'escalated']);
        })
        .whereNotIn('wa.module_type', ['Leave', 'leave', 'leaves', 'Attendance', 'attendance']);

      if (targetCompanyId) {
        workflowApprovalQuery = workflowApprovalQuery
          .join('employees as workflow_applicant', 'wa.applicant_id', 'workflow_applicant.id')
          .where('workflow_applicant.company_id', targetCompanyId)
          .whereNull('workflow_applicant.deleted_at');
      } else {
        workflowApprovalQuery = workflowApprovalQuery.where('wa.organization_id', organizationId);
      }
      const [waRow] = await workflowApprovalQuery.count('* as count');
      pendingApprovals += Number(waRow?.count || 0);

      // 4. expense_claims
      try {
        let ecQuery = db('expense_claims as ec')
          .whereNull('ec.deleted_at')
          .whereIn('ec.status', ['submitted', 'pending', 'pending_manager', 'pending_finance', 'pending_hr']);
        if (targetCompanyId) {
          ecQuery = ecQuery
            .join('employees as e', 'ec.employee_id', 'e.id')
            .where('e.company_id', targetCompanyId)
            .whereNull('e.deleted_at');
        } else {
          ecQuery = ecQuery.where('ec.organization_id', organizationId);
        }
        const [ecRow] = await ecQuery.count('* as count');
        pendingApprovals += Number(ecRow?.count || 0);
      } catch (e) {}
    } catch (err) {
      pendingApprovals = 0;
    }

    // New hires are employees who actually joined this calendar month, not offers.
    let newHires = 0;
    try {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
      let newHireQuery = db('employees')
          .whereNull('deleted_at')
          .where('date_of_joining', '>=', monthStart)
          .where('date_of_joining', '<', nextMonthStart);
      newHireQuery = targetCompanyId
        ? newHireQuery.where('company_id', targetCompanyId)
        : newHireQuery.where('organization_id', organizationId);
      const [newHireRow] = await newHireQuery.count('* as count');
      newHires = Number(newHireRow?.count || 0);
    } catch (err) {
      newHires = 0;
    }

    // ── On Leave Today (Approved leaves only) ─────────────────────────────────
    // Count distinct employees with an APPROVED leave application that covers today.
    // Status must be exactly 'approved' — no other statuses.
    let onLeaveToday = 0;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const hasLadTable = await db.schema.hasTable('leave_application_dates');
      if (hasLadTable) {
        // Precise: join leave_application_dates to get exact per-day granularity
        let ladQuery = db('leave_applications as la')
          .join('leave_application_dates as lad', 'lad.application_id', 'la.id')
          .whereNull('la.deleted_at')
          .where('la.status', 'approved')
          .where('lad.leave_date', todayStr);
        if (targetCompanyId) {
          ladQuery = ladQuery.where('la.company_id', targetCompanyId);
        } else {
          ladQuery = ladQuery.where('la.organization_id', organizationId);
        }
        const [ladRow] = await ladQuery.countDistinct('la.employee_id as count');
        onLeaveToday = Number(ladRow?.count || 0);
      } else {
        // Fallback for the current leave schema: application_start_date <= today
        // <= application_end_date, approved only.
        let ltQuery = db('leave_applications')
          .whereNull('deleted_at')
          .where('status', 'approved')
          .where('application_start_date', '<=', todayStr)
          .where('application_end_date', '>=', todayStr);
        if (targetCompanyId) {
          ltQuery = ltQuery.where('company_id', targetCompanyId);
        } else {
          ltQuery = ltQuery.where('organization_id', organizationId);
        }
        const [ltRow] = await ltQuery.countDistinct('employee_id as count');
        onLeaveToday = Number(ltRow?.count || 0);
      }
    } catch (err) {
      onLeaveToday = 0;
    }

    // Total monthly gross outlay. Assigned salary structures are the payroll
    // source of truth; retain legacy compensation/payslip sources as fallbacks.
    let monthlyPayrollCost = 0;
    try {
      const hasSalaryStructures = await db.schema.hasTable('salary_structures');
      const hasStructureGross = hasSalaryStructures && await db.schema.hasColumn('salary_structures', 'gross_monthly');
      const hasStructureCtc = hasSalaryStructures && await db.schema.hasColumn('salary_structures', 'annual_ctc');

      if (hasStructureGross || hasStructureCtc) {
        let structureOutlayQuery = db('salary_structures as ss')
          .join('employees as e', 'ss.employee_id', 'e.id')
          .whereNull('ss.deleted_at')
          .whereNull('e.deleted_at')
          .whereIn('e.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);
        if (targetCompanyId) {
          structureOutlayQuery = structureOutlayQuery.where('e.company_id', targetCompanyId);
        } else {
          structureOutlayQuery = structureOutlayQuery.where('e.organization_id', organizationId);
        }
        const grossExpression = hasStructureGross && hasStructureCtc
          ? 'COALESCE(NULLIF(ss.gross_monthly, 0), ss.annual_ctc / 12, 0)'
          : hasStructureGross ? 'COALESCE(ss.gross_monthly, 0)' : 'COALESCE(ss.annual_ctc / 12, 0)';
        const structureOutlayRow = await structureOutlayQuery
          .select(db.raw(`COALESCE(SUM(${grossExpression}), 0) as total`))
          .first() as { total?: number | string } | undefined;
        monthlyPayrollCost = Number(structureOutlayRow?.total || 0);
      }

      const hasGrossSalary = await db.schema.hasColumn('employees', 'gross_salary');
      const hasAnnualCtc = await db.schema.hasColumn('employees', 'annual_ctc');

      if (monthlyPayrollCost === 0 && (hasGrossSalary || hasAnnualCtc)) {
        let grossOutlayQuery = db('employees as e')
          .whereNull('e.deleted_at')
          .whereIn('e.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);

        if (targetCompanyId) {
          grossOutlayQuery = grossOutlayQuery.where('e.company_id', targetCompanyId);
        } else {
          grossOutlayQuery = grossOutlayQuery.where('e.organization_id', organizationId);
        }

        const grossExpression = hasGrossSalary && hasAnnualCtc
          ? 'COALESCE(NULLIF(e.gross_salary, 0), e.annual_ctc / 12, 0)'
          : hasGrossSalary
            ? 'COALESCE(e.gross_salary, 0)'
            : 'COALESCE(e.annual_ctc / 12, 0)';
        const grossOutlayRow = await grossOutlayQuery
          .select(db.raw(`COALESCE(SUM(${grossExpression}), 0) as total`))
          .first() as { total?: number | string } | undefined;
        monthlyPayrollCost = Number(grossOutlayRow?.total || 0);
      }

      const hasCompTable = await db.schema.hasTable('employee_compensation');
      if (monthlyPayrollCost === 0 && hasCompTable) {
        let compQuery = db('employee_compensation as ec')
          .join('employees as e', 'ec.employee_id', 'e.id')
          .whereNull('ec.deleted_at')
          .whereNull('e.deleted_at')
          .whereIn('e.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);

        if (targetCompanyId) {
          compQuery = compQuery.where('e.company_id', targetCompanyId);
        } else {
          compQuery = compQuery.where('e.organization_id', organizationId);
        }

        const [sumRow] = await compQuery.sum('ec.base_salary as total');
        monthlyPayrollCost = Number(sumRow?.total || 0);
      }

      if (monthlyPayrollCost === 0) {
        const hasPayslips = await db.schema.hasTable('payslips');
        if (hasPayslips) {
          const now = new Date();
          const currentPayrollMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
            .toISOString()
            .slice(0, 10);
          let payslipQuery = db('payslips')
            .whereNull('deleted_at')
            .where('payslip_month', currentPayrollMonth);
          if (targetCompanyId) {
            const hasCompanyId = await db.schema.hasColumn('payslips', 'company_id');
            if (hasCompanyId) {
              payslipQuery = payslipQuery.where('company_id', targetCompanyId);
            } else {
              // Legacy payslips are scoped through the employee relationship.
              payslipQuery = payslipQuery
                .join('employees as payslip_employee', 'payslips.employee_id', 'payslip_employee.id')
                .where('payslip_employee.company_id', targetCompanyId)
                .whereNull('payslip_employee.deleted_at');
            }
          } else {
            payslipQuery = payslipQuery.where('organization_id', organizationId);
          }

          const hasGrossSalary = await db.schema.hasColumn('payslips', 'gross_salary');
          const hasNetSalary = await db.schema.hasColumn('payslips', 'net_salary');
          const colToSum = hasGrossSalary ? 'gross_salary' : (hasNetSalary ? 'net_salary' : null);

          if (colToSum) {
            const [payRow] = await payslipQuery.sum(`${colToSum} as total`);
            if (payRow?.total) {
              monthlyPayrollCost = Number(payRow.total);
            }
          }
        }
      }
    } catch (err) {
      monthlyPayrollCost = 0;
    }

    // 3. Headcount Growth Trend (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const growthTrend: Array<{ month: string; employees: number }> = [];

    try {
      for (let i = 5; i >= 0; i--) {
        const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // last day of month
        const monthLabel = monthNames[targetMonthDate.getMonth()];
        const cutoffIso = targetMonthDate.toISOString().slice(0, 10);

        let trendQuery = db('employees')
          .where(function () {
            this.whereNull('deleted_at').orWhere('deleted_at', '>', targetMonthDate);
          })
          .where(function () {
            this.where('date_of_joining', '<=', cutoffIso)
              .orWhere(function () {
                this.whereNull('date_of_joining').andWhere('created_at', '<=', targetMonthDate);
              });
          });

        if (targetCompanyId) {
          trendQuery = trendQuery.where('company_id', targetCompanyId);
        } else {
          trendQuery = trendQuery.where('organization_id', organizationId);
        }

        const [trendRow] = await trendQuery.count('* as count');
        growthTrend.push({
          month: monthLabel,
          employees: Number(trendRow?.count || 0),
        });
      }
    } catch (e) {
      console.warn('[AdminDashboardService] growthTrend error:', e);
      for (let i = 5; i >= 0; i--) {
        const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        growthTrend.push({
          month: monthNames[targetMonthDate.getMonth()],
          employees: 0,
        });
      }
    }

    // 4. Department Breakdown with Employee Counts
    let departmentBreakdown: Array<{ id: number; name: string; count: number; percentage: number }> = [];
    try {
      let deptBreakdownQuery = db('departments')
        .leftJoin('employees', function () {
          this.on('departments.id', '=', 'employees.current_department_id')
            .andOnNull('employees.deleted_at');
        })
        .select('departments.id', 'departments.name')
        .count('employees.id as emp_count')
        .whereNull('departments.deleted_at')
        .groupBy('departments.id', 'departments.name');

      if (targetCompanyId) {
        const cIdNum = Number(targetCompanyId);
        const cIdStr = String(targetCompanyId);
        deptBreakdownQuery = deptBreakdownQuery.where((builder) => {
          builder.where('departments.company_id', cIdNum)
            .orWhereRaw("JSON_CONTAINS(departments.company_ids, ?)", [JSON.stringify(cIdNum)])
            .orWhereRaw("JSON_CONTAINS(departments.company_ids, ?)", [JSON.stringify(cIdStr)])
            .orWhereNull('departments.company_id');
        });
      } else {
        deptBreakdownQuery = deptBreakdownQuery.where('departments.organization_id', organizationId);
      }

      const deptRows = await deptBreakdownQuery;

      departmentBreakdown = (deptRows || [])
        .map((row: any) => {
          const count = Number(row.emp_count || 0);
          const percentage = totalHeadcount > 0 ? Math.round((count / totalHeadcount) * 100) : 0;
          return {
            id: Number(row.id),
            name: row.name || 'Unassigned',
            count,
            percentage,
          };
        })
        .sort((a: any, b: any) => b.count - a.count);
    } catch (e) {
      console.warn('[AdminDashboardService] deptBreakdown error:', e);
      departmentBreakdown = [];
    }

    // 5. Recent Employees
    let recentEmployees: Array<{ id: number; firstName: string; lastName: string; employeeCode: string; status: string; avatarUrl?: string; departmentName?: string }> = [];
    try {
      let recentQuery = db('employees')
        .leftJoin('departments', 'employees.current_department_id', 'departments.id')
        .select(
          'employees.id',
          'employees.first_name as firstName',
          'employees.last_name as lastName',
          'employees.employee_code as employeeCode',
          'employees.status',
          'employees.avatar_url as avatarUrl',
          'departments.name as departmentName'
        )
        .whereNull('employees.deleted_at')
        .orderBy('employees.created_at', 'desc')
        .limit(5);

      if (targetCompanyId) {
        recentQuery = recentQuery.where('employees.company_id', targetCompanyId);
      } else {
        recentQuery = recentQuery.where('employees.organization_id', organizationId);
      }

      recentEmployees = (await recentQuery).map((emp: any) => ({
        id: Number(emp.id),
        firstName: emp.firstName || 'Employee',
        lastName: emp.lastName || '',
        employeeCode: emp.employeeCode || `EMP${emp.id}`,
        status: emp.status || 'active',
        avatarUrl: emp.avatarUrl || undefined,
        departmentName: emp.departmentName || 'General',
      }));
    } catch (e) {
      console.warn('[AdminDashboardService] recentEmployees error:', e);
      recentEmployees = [];
    }

    // ── 6. REAL ATTENDANCE ANALYTICS ──────────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    let attendanceAnalytics = {
      today: {
        present: 0,
        late: 0,
        halfDay: 0,
        wfh: 0,
        onLeave: onLeaveToday,
        absent: 0,
        totalHeadcount,
        attendanceRate: 0,
      },
      weeklyTrend: [] as Array<{ day: string; date: string; present: number; late: number; absent: number }>,
    };

    try {
      const hasAttTable = await db.schema.hasTable('attendance_records');
      if (hasAttTable) {
        let attTodayQuery = db('attendance_records as ar')
          .join('employees as e', 'ar.employee_id', 'e.id')
          .whereNull('e.deleted_at')
          .where('ar.check_in_date', todayStr);

        if (targetCompanyId) {
          attTodayQuery = attTodayQuery.where('e.company_id', targetCompanyId);
        } else {
          attTodayQuery = attTodayQuery.where('ar.organization_id', organizationId);
        }

        const todayRecords = await attTodayQuery.select(
          'ar.status',
          'ar.is_late',
          'ar.is_half_day'
        );

        let presentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let wfhCount = 0;

        for (const r of todayRecords) {
          const st = String(r.status || '').toLowerCase();
          const isLate = Boolean(r.is_late || r.isLate || st === 'late');
          const isHalf = Boolean(r.is_half_day || r.isHalfDay || st.includes('half'));
          const isWfh = st.includes('wfh') || st.includes('home') || st.includes('remote');

          if (isHalf) halfDayCount++;
          else if (isLate) lateCount++;
          else if (isWfh) wfhCount++;
          else presentCount++;
        }

        const accountedCount = presentCount + lateCount + halfDayCount + wfhCount + onLeaveToday;
        const absentCount = Math.max(0, totalHeadcount - accountedCount);
        const presentTotal = presentCount + lateCount + halfDayCount + wfhCount;
        const rate = totalHeadcount > 0 ? Math.min(100, Math.round((presentTotal / totalHeadcount) * 100)) : 0;

        attendanceAnalytics.today = {
          present: presentCount,
          late: lateCount,
          halfDay: halfDayCount,
          wfh: wfhCount,
          onLeave: onLeaveToday,
          absent: absentCount,
          totalHeadcount,
          attendanceRate: rate,
        };

        // 7-Day Attendance Trend
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyTrend: Array<{ day: string; date: string; present: number; late: number; absent: number }> = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const dayName = dayLabels[d.getDay()];

          let dayQ = db('attendance_records as ar')
            .join('employees as e', 'ar.employee_id', 'e.id')
            .whereNull('e.deleted_at')
            .where('ar.check_in_date', dateStr);

          if (targetCompanyId) dayQ = dayQ.where('e.company_id', targetCompanyId);
          else dayQ = dayQ.where('ar.organization_id', organizationId);

          const dayRecs = await dayQ.select('ar.status', 'ar.is_late');
          let dayPresent = 0;
          let dayLate = 0;
          for (const rec of dayRecs) {
            const st = String(rec.status || '').toLowerCase();
            if (rec.is_late || st === 'late') dayLate++;
            else if (st !== 'absent') dayPresent++;
          }
          const dayAbsent = Math.max(0, totalHeadcount - (dayPresent + dayLate));

          weeklyTrend.push({
            day: dayName,
            date: dateStr,
            present: dayPresent,
            late: dayLate,
            absent: dayAbsent,
          });
        }
        attendanceAnalytics.weeklyTrend = weeklyTrend;
      }
    } catch (e) {
      console.warn('[AdminDashboardService] attendanceAnalytics error:', e);
    }

    // ── 7. REAL LEAVE ANALYTICS ───────────────────────────────────────────────
    let leaveAnalytics = {
      byType: [] as Array<{ leaveTypeId: number; name: string; code: string; color: string; approvedCount: number; pendingCount: number }>,
      monthlyTrend: [] as Array<{ month: string; applied: number; approved: number }>,
    };

    try {
      const hasLtTable = await db.schema.hasTable('leave_types');
      const hasLaTable = await db.schema.hasTable('leave_applications');

      if (hasLtTable && hasLaTable) {
        let ltQuery = db('leave_types as lt')
          .leftJoin('leave_applications as la', function () {
            this.on('lt.id', '=', 'la.leave_type_id').andOnNull('la.deleted_at');
          })
          .select(
            'lt.id',
            'lt.name',
            'lt.code',
            'lt.color',
            db.raw("COUNT(CASE WHEN la.status = 'approved' THEN 1 END) as approved_count"),
            db.raw("COUNT(CASE WHEN la.status IN ('submitted', 'pending', 'pending_manager', 'pending_hr') THEN 1 END) as pending_count")
          )
          .whereNull('lt.deleted_at')
          .where('lt.organization_id', organizationId)
          .groupBy('lt.id', 'lt.name', 'lt.code', 'lt.color');

        const ltRows = await ltQuery;
        leaveAnalytics.byType = (ltRows || []).map((row: any) => ({
          leaveTypeId: Number(row.id),
          name: row.name || 'Leave',
          code: row.code || 'LV',
          color: row.color || '#6366f1',
          approvedCount: Number(row.approved_count || 0),
          pendingCount: Number(row.pending_count || 0),
        }));

        // 6-Month Leave Applications Trend
        const leaveMonthlyTrend: Array<{ month: string; applied: number; approved: number }> = [];
        for (let i = 5; i >= 0; i--) {
          const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const monthStartIso = targetMonth.toISOString().slice(0, 10);
          const monthEndIso = nextMonth.toISOString().slice(0, 10);
          const monthLabel = monthNames[targetMonth.getMonth()];

          let laTrendQ = db('leave_applications as la')
            .whereNull('la.deleted_at')
            .where('la.created_at', '>=', monthStartIso)
            .where('la.created_at', '<', monthEndIso)
            .where('la.organization_id', organizationId);

          if (targetCompanyId) {
            laTrendQ = laTrendQ
              .join('employees as e', 'la.employee_id', 'e.id')
              .where('e.company_id', targetCompanyId);
          }

          const [appliedRow]: any = await laTrendQ.clone().count('* as count');
          const [approvedRow]: any = await laTrendQ.clone().where('la.status', 'approved').count('* as count');

          leaveMonthlyTrend.push({
            month: monthLabel,
            applied: Number(appliedRow?.count || 0),
            approved: Number(approvedRow?.count || 0),
          });
        }
        leaveAnalytics.monthlyTrend = leaveMonthlyTrend;
      }
    } catch (e) {
      console.warn('[AdminDashboardService] leaveAnalytics error:', e);
    }

    // ── 8. REAL PAYROLL ANALYTICS ─────────────────────────────────────────────
    let payrollAnalytics = {
      monthlyTrend: [] as Array<{ month: string; grossSalary: number; netSalary: number; deductions: number }>,
    };

    try {
      const hasPayslips = await db.schema.hasTable('payslips');
      for (let i = 5; i >= 0; i--) {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthIso = targetMonth.toISOString().slice(0, 7); // YYYY-MM
        const monthLabel = monthNames[targetMonth.getMonth()];

        let grossVal = 0;
        let netVal = 0;
        let dedVal = 0;

        if (hasPayslips) {
          let payQ = db('payslips')
            .whereNull('deleted_at')
            .where('payslip_month', 'like', `${monthIso}%`);

          if (targetCompanyId) {
            const hasCompanyId = await db.schema.hasColumn('payslips', 'company_id');
            if (hasCompanyId) payQ = payQ.where('company_id', targetCompanyId);
            else {
              payQ = payQ
                .join('employees as e', 'payslips.employee_id', 'e.id')
                .where('e.company_id', targetCompanyId);
            }
          } else {
            payQ = payQ.where('organization_id', organizationId);
          }

          const [sumPay] = (await payQ.select(
            db.raw('COALESCE(SUM(gross_salary), 0) as gross'),
            db.raw('COALESCE(SUM(net_salary), 0) as net'),
            db.raw('COALESCE(SUM(total_deductions), 0) as deductions')
          )) as Array<{ gross?: number | string; net?: number | string; deductions?: number | string }>;

          grossVal = Number(sumPay?.gross || 0);
          netVal = Number(sumPay?.net || 0);
          dedVal = Number(sumPay?.deductions || 0);
        }

        // If no generated payslip exists for this month, calculate from active employee compensation baseline
        if (grossVal === 0 && monthlyPayrollCost > 0) {
          const monthEmpCount = growthTrend[5 - i]?.employees || totalHeadcount;
          const ratio = totalHeadcount > 0 ? Math.min(1, monthEmpCount / totalHeadcount) : 1;
          grossVal = Math.round(monthlyPayrollCost * ratio);
          dedVal = Math.round(grossVal * 0.1);
          netVal = grossVal - dedVal;
        }

        payrollAnalytics.monthlyTrend.push({
          month: monthLabel,
          grossSalary: grossVal,
          netSalary: netVal,
          deductions: dedVal,
        });
      }
    } catch (e) {
      console.warn('[AdminDashboardService] payrollAnalytics error:', e);
    }

    // ── 9. REAL RECRUITMENT ANALYTICS ─────────────────────────────────────────
    let recruitmentAnalytics = {
      pipelineStages: [] as Array<{ stage: string; label: string; count: number }>,
      openJobsByDept: [] as Array<{ departmentName: string; openCount: number }>,
    };

    try {
      const stageMap: Record<string, number> = {
        applied: 0,
        screening: 0,
        interview: 0,
        offered: 0,
        hired: 0,
        rejected: 0,
      };

      // 1. Check applications table
      const hasApps = await db.schema.hasTable('applications');
      if (hasApps) {
        let appQ = db('applications')
          .whereNull('deleted_at')
          .where('organization_id', organizationId)
          .select('application_status')
          .count('* as count')
          .groupBy('application_status');

        const appRows = await appQ;
        for (const row of appRows) {
          let st = String(row.application_status || '').toLowerCase();
          if (st === 'offer') st = 'offered';
          if (stageMap[st] !== undefined) {
            stageMap[st] += Number(row.count || 0);
          } else {
            stageMap.applied += Number(row.count || 0);
          }
        }
      }

      // 2. Also check candidates table if candidates exist without applications
      const hasCandidates = await db.schema.hasTable('candidates');
      if (hasCandidates) {
        const [candTotal]: any = await db('candidates')
          .whereNull('deleted_at')
          .where('organization_id', organizationId)
          .count('* as count');
        const totalCands = Number(candTotal?.count || 0);
        const totalApps = Object.values(stageMap).reduce((a, b) => a + b, 0);
        if (totalCands > totalApps) {
          stageMap.applied += (totalCands - totalApps);
        }
      }

      const stagesConfig = [
        { stage: 'applied', label: 'Applied' },
        { stage: 'screening', label: 'Screening' },
        { stage: 'interview', label: 'Interview' },
        { stage: 'offered', label: 'Offered' },
        { stage: 'hired', label: 'Hired' },
        { stage: 'rejected', label: 'Rejected' },
      ];

      recruitmentAnalytics.pipelineStages = stagesConfig.map((s) => ({
        stage: s.stage,
        label: s.label,
        count: stageMap[s.stage] || 0,
      }));

      // Open jobs by department
      const hasJobs = await db.schema.hasTable('jobs');
      if (hasJobs) {
        let jobDeptQ = db('jobs as j')
          .leftJoin('departments as d', 'j.department_id', 'd.id')
          .whereNull('j.deleted_at')
          .where('j.status', 'published')
          .where('j.organization_id', organizationId)
          .select(db.raw("COALESCE(d.name, 'General') as departmentName"))
          .count('j.id as count')
          .groupBy(db.raw("COALESCE(d.name, 'General')"));

        const jobDeptRows = await jobDeptQ;
        recruitmentAnalytics.openJobsByDept = (jobDeptRows || []).map((row: any) => ({
          departmentName: row.departmentName || 'General',
          openCount: Number(row.count || 0),
        }));
      }
    } catch (e) {
      console.warn('[AdminDashboardService] recruitmentAnalytics error:', e);
    }

    // ── 10. REAL EXPENSE ANALYTICS ────────────────────────────────────────────
    let expenseAnalytics = {
      monthlyTrend: [] as Array<{ month: string; claimedAmount: number; approvedAmount: number }>,
      byCategory: [] as Array<{ categoryName: string; totalAmount: number }>,
    };

    try {
      const hasExpenses = await db.schema.hasTable('expense_claims');
      if (hasExpenses) {
        // 6-Month Expense Trends
        for (let i = 5; i >= 0; i--) {
          const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const monthStartIso = targetMonth.toISOString().slice(0, 10);
          const monthEndIso = nextMonth.toISOString().slice(0, 10);
          const monthLabel = monthNames[targetMonth.getMonth()];

          let expQ = db('expense_claims as ec')
            .whereNull('ec.deleted_at')
            .where('ec.created_at', '>=', monthStartIso)
            .where('ec.created_at', '<', monthEndIso)
            .where('ec.organization_id', organizationId);

          if (targetCompanyId) {
            expQ = expQ
              .join('employees as e', 'ec.employee_id', 'e.id')
              .where('e.company_id', targetCompanyId);
          }

          const [expRow]: any = await expQ.select(
            db.raw('COALESCE(SUM(total_claimed_amount), COALESCE(SUM(amount), 0)) as claimed'),
            db.raw("COALESCE(SUM(CASE WHEN ec.status IN ('approved', 'paid', 'settled') THEN COALESCE(total_approved_amount, amount) ELSE 0 END), 0) as approved")
          );

          expenseAnalytics.monthlyTrend.push({
            month: monthLabel,
            claimedAmount: Number(expRow?.claimed || 0),
            approvedAmount: Number(expRow?.approved || 0),
          });
        }

        // Expenses by Category
        let catQ = db('expense_claims as ec')
          .leftJoin('expense_categories as c', 'ec.category_id', 'c.id')
          .whereNull('ec.deleted_at')
          .where('ec.organization_id', organizationId)
          .select(
            db.raw("COALESCE(c.name, 'General Expense') as categoryName"),
            db.raw('COALESCE(SUM(ec.total_claimed_amount), COALESCE(SUM(ec.amount), 0)) as totalAmount')
          )
          .groupBy('categoryName')
          .orderBy('totalAmount', 'desc')
          .limit(6);

        if (targetCompanyId) {
          catQ = catQ
            .join('employees as e', 'ec.employee_id', 'e.id')
            .where('e.company_id', targetCompanyId);
        }

        const catRows = await catQ;
        expenseAnalytics.byCategory = (catRows || []).map((r: any) => ({
          categoryName: r.categoryName || 'General',
          totalAmount: Number(r.totalAmount || 0),
        }));
      }
    } catch (e) {
      console.warn('[AdminDashboardService] expenseAnalytics error:', e);
    }

    // ── 11. REAL WORKFORCE ANALYTICS ──────────────────────────────────────────
    let workforceAnalytics = {
      byEmploymentType: [] as Array<{ type: string; count: number }>,
      byStatus: [] as Array<{ status: string; count: number }>,
      byGender: [] as Array<{ gender: string; count: number }>,
    };

    try {
      let empBase = db('employees')
        .whereNull('deleted_at')
        .where('organization_id', organizationId);

      if (targetCompanyId) empBase = empBase.where('company_id', targetCompanyId);

      // Employment Types
      const hasEmpTypeCol = await db.schema.hasColumn('employees', 'employment_type');
      if (hasEmpTypeCol) {
        const typeRows = await empBase.clone()
          .select(db.raw("COALESCE(employment_type, 'Full-time') as type"))
          .count('* as count')
          .groupBy('type');
        workforceAnalytics.byEmploymentType = (typeRows || []).map((r: any) => ({
          type: String(r.type || 'Full-time').replace(/_/g, ' '),
          count: Number(r.count || 0),
        }));
      }

      // Statuses
      const statusRows = await empBase.clone()
        .select(db.raw("COALESCE(status, 'active') as status"))
        .count('* as count')
        .groupBy('status');
      workforceAnalytics.byStatus = (statusRows || []).map((r: any) => ({
        status: String(r.status || 'active').replace(/_/g, ' '),
        count: Number(r.count || 0),
      }));

      // Gender
      const hasGenderCol = await db.schema.hasColumn('employees', 'gender');
      if (hasGenderCol) {
        const genderRows = await empBase.clone()
          .select(db.raw("COALESCE(gender, 'Not Specified') as gender"))
          .count('* as count')
          .groupBy('gender');
        workforceAnalytics.byGender = (genderRows || []).map((r: any) => ({
          gender: String(r.gender || 'Not Specified'),
          count: Number(r.count || 0),
        }));
      }
    } catch (e) {
      console.warn('[AdminDashboardService] workforceAnalytics error:', e);
    }

    return {
      companyInfo: {
        id: companyIdVal,
        name: companyName,
        code: companyCode,
        isParent,
        location,
      },
      kpis: {
        totalHeadcount,
        activeDepartments,
        officeLocations: locCount,
        reportingOfficers,
        openJobs,
        monthlyPayrollCost,
        pendingApprovals,
        newHires,
        onLeaveToday,
      },
      growthTrend,
      departmentBreakdown,
      recentEmployees,
      attendanceAnalytics,
      leaveAnalytics,
      payrollAnalytics,
      recruitmentAnalytics,
      expenseAnalytics,
      workforceAnalytics,
    };
  }
}
