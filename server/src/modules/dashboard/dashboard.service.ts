import { getKnex } from '../../db/knex';
import type { TenantContext } from '../../db/types';
import { approvalRepository } from '../approvals/repositories/ApprovalRepository';

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
    employees: Array<{ id: number; name: string; employeeCode: string }>;
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
    periodSummary: Record<'today' | 'week' | 'month', {
      present: number;
      late: number;
      absent: number;
      onLeave: number;
      total: number;
      attendanceRate: number;
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
      monthKey: string;
      grossSalary: number;
      netSalary: number;
      deductions: number;
      source: 'payslip' | 'salary_structure';
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
    disbursementTrend: Array<{
      date: string;
      disbursedAmount: number;
    }>;
    byCategory: Array<{
      categoryName: string;
      totalAmount: number;
    }>;
  };
  upcomingEvents: {
    holidays: Array<{ id: number; name: string; date: string; type: string }>;
    birthdays: Array<{ id: number; name: string; date: string; upcomingDate: string }>;
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
    // Matches active open/published job postings
    let openJobs = 0;
    try {
      const hasJobsTable = await db.schema.hasTable('jobs');
      if (hasJobsTable) {
        let openJobsQuery = db('jobs')
          .whereNull('deleted_at')
          .whereIn('status', ['published', 'active', 'open', 'Published', 'Active', 'Open']);
        if (targetCompanyId) {
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
    let pendingApprovals = 0;
    try {
      const approvalStats = await approvalRepository.getDashboardStats(organizationId, {
        companyId: targetCompanyId || undefined,
      });
      pendingApprovals = Number(approvalStats.pending || 0) + Number(approvalStats.escalated || 0);
    } catch (err) {
      console.warn('[AdminDashboardService] pendingApprovals calculation error:', err);
      pendingApprovals = 0;
    }

    // ── New Hires This Month ──────────────────────────────────────────────────
    // Employees who actually joined this calendar month, excluding CEO/Admin user
    let newHires = 0;
    try {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

      let newHireQuery = db('employees')
        .whereNull('employees.deleted_at')
        .whereNotExists(function () {
          this.select('ceo_user.id')
            .from('users as ceo_user')
            .join('user_roles as ceo_user_role', 'ceo_user_role.user_id', 'ceo_user.id')
            .join('roles as ceo_role', 'ceo_role.id', 'ceo_user_role.role_id')
            .whereRaw('ceo_user.employee_id = employees.id')
            .whereIn('ceo_role.code', ['ceo', 'organization_admin', 'super_admin']);
        })
        .where(function () {
          this.where(function () {
            this.where('employees.date_of_joining', '>=', monthStart)
              .andWhere('employees.date_of_joining', '<', nextMonthStart);
          }).orWhere(function () {
            this.whereNull('employees.date_of_joining')
              .andWhere('employees.created_at', '>=', monthStart)
              .andWhere('employees.created_at', '<', nextMonthStart);
          });
        });

      if (targetCompanyId) {
        newHireQuery = newHireQuery.where('employees.company_id', targetCompanyId);
      } else {
        newHireQuery = newHireQuery.where('employees.organization_id', organizationId);
      }
      const [newHireRow] = await newHireQuery.count('* as count');
      newHires = Number(newHireRow?.count || 0);

      // If new hires calculation exceeds headcount due to dates, cap it to total active headcount
      if (totalHeadcount > 0 && newHires > totalHeadcount) {
        newHires = totalHeadcount;
      }
    } catch (err) {
      newHires = 0;
    }

    // ── On Leave Today (Approved leaves only) ─────────────────────────────────
    // Count distinct employees with an APPROVED leave application covering today
    let onLeaveToday = 0;
    const localNow = new Date();
    const todayStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
    try {
      const hasLadTable = await db.schema.hasTable('leave_application_dates');
      if (hasLadTable) {
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

    // ── Est. Monthly Payroll Cost ─────────────────────────────────────────────
    // Total monthly gross outlay across assigned salary structures, payroll runs,
    // employee compensation, or base salary fields.
    let monthlyPayrollCost = 0;
    try {
      // 1. Direct assigned salary structures
      const hasSalaryStructures = await db.schema.hasTable('salary_structures');
      if (hasSalaryStructures) {
        let structureOutlayQuery = db('salary_structures as ss')
          .join('employees as e', 'ss.employee_id', 'e.id')
          .whereNull('ss.deleted_at')
          .whereNull('e.deleted_at')
          .where(function () {
            this.where('ss.status', 'active').orWhere('ss.status', 'Active').orWhereNull('ss.status');
          })
          .whereIn('e.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);

        if (targetCompanyId) {
          structureOutlayQuery = structureOutlayQuery.where('e.company_id', targetCompanyId);
        } else {
          structureOutlayQuery = structureOutlayQuery.where('e.organization_id', organizationId);
        }

        const [structureOutlayRow] = await structureOutlayQuery.select(
          db.raw(
            'COALESCE(SUM(COALESCE(NULLIF(ss.gross_monthly, 0), NULLIF(ss.annual_ctc, 0) / 12, NULLIF(ss.net_take_home, 0), NULLIF(ss.basic_monthly, 0), 0)), 0) as total'
          )
        );
        monthlyPayrollCost = Number(structureOutlayRow?.total || 0);
      }

      // 2. Latest finalized / processed payroll run
      if (monthlyPayrollCost === 0) {
        const hasPayrollRuns = await db.schema.hasTable('payroll_runs');
        if (hasPayrollRuns) {
          let prQuery = db('payroll_runs')
            .whereNull('deleted_at')
            .whereNotIn('status', ['cancelled', 'deleted'])
            .orderBy('run_month', 'desc');
          if (targetCompanyId) prQuery = prQuery.where('company_id', targetCompanyId);
          else prQuery = prQuery.where('organization_id', organizationId);
          const latestRun = await prQuery.first();
          if (latestRun) {
            monthlyPayrollCost = Number(latestRun.total_gross_pay || latestRun.total_net_pay || latestRun.total_cost || 0);
          }
        }
      }

      // 3. Processed payroll run employee items
      if (monthlyPayrollCost === 0) {
        const hasPRE = await db.schema.hasTable('payroll_run_employees');
        if (hasPRE) {
          let preQuery = db('payroll_run_employees as pre')
            .join('payroll_runs as pr', 'pre.payroll_run_id', 'pr.id')
            .whereNull('pr.deleted_at')
            .whereNotIn('pr.status', ['cancelled', 'deleted']);
          if (targetCompanyId) preQuery = preQuery.where('pr.company_id', targetCompanyId);
          else preQuery = preQuery.where('pr.organization_id', organizationId);
          const [sumPre] = await preQuery.select(db.raw('COALESCE(SUM(COALESCE(NULLIF(pre.total_earnings, 0), pre.net_salary, 0)), 0) as total'));
          if (sumPre?.total) monthlyPayrollCost = Number(sumPre.total);
        }
      }

      // 4. Employee compensation table
      if (monthlyPayrollCost === 0) {
        const hasComp = await db.schema.hasTable('employee_compensation');
        if (hasComp) {
          let compQuery = db('employee_compensation as ec')
            .join('employees as e', 'ec.employee_id', 'e.id')
            .whereNull('ec.deleted_at')
            .whereNull('e.deleted_at');
          if (targetCompanyId) compQuery = compQuery.where('e.company_id', targetCompanyId);
          else compQuery = compQuery.where('e.organization_id', organizationId);
          const [sumComp] = await compQuery.sum('ec.base_salary as total');
          if (sumComp?.total) monthlyPayrollCost = Number(sumComp.total);
        }
      }

      // 5. Direct salary columns on employees table
      if (monthlyPayrollCost === 0) {
        const hasGrossSalary = await db.schema.hasColumn('employees', 'gross_salary');
        const hasAnnualCtc = await db.schema.hasColumn('employees', 'annual_ctc');
        const hasBasicSalary = await db.schema.hasColumn('employees', 'basic_salary');
        const hasSalary = await db.schema.hasColumn('employees', 'salary');

        const colExpressions = [
          hasGrossSalary ? 'NULLIF(e.gross_salary, 0)' : null,
          hasAnnualCtc ? 'NULLIF(e.annual_ctc, 0) / 12' : null,
          hasBasicSalary ? 'NULLIF(e.basic_salary, 0)' : null,
          hasSalary ? 'NULLIF(e.salary, 0)' : null,
        ].filter(Boolean);

        if (colExpressions.length > 0) {
          let empSalQuery = db('employees as e')
            .whereNull('e.deleted_at')
            .whereIn('e.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);
          if (targetCompanyId) empSalQuery = empSalQuery.where('e.company_id', targetCompanyId);
          else empSalQuery = empSalQuery.where('e.organization_id', organizationId);

          const [empSalRow] = await empSalQuery.select(
            db.raw(`COALESCE(SUM(COALESCE(${colExpressions.join(', ')}, 0)), 0) as total`)
          );
          if (empSalRow?.total) monthlyPayrollCost = Number(empSalRow.total);
        }
      }

      // 6. Payslips table fallback
      if (monthlyPayrollCost === 0) {
        const hasPayslips = await db.schema.hasTable('payslips');
        if (hasPayslips) {
          let payslipQuery = db('payslips').whereNull('deleted_at');
          if (targetCompanyId) {
            const hasCompanyId = await db.schema.hasColumn('payslips', 'company_id');
            if (hasCompanyId) payslipQuery = payslipQuery.where('company_id', targetCompanyId);
            else {
              payslipQuery = payslipQuery
                .join('employees as pe', 'payslips.employee_id', 'pe.id')
                .where('pe.company_id', targetCompanyId)
                .whereNull('pe.deleted_at');
            }
          } else {
            payslipQuery = payslipQuery.where('organization_id', organizationId);
          }
          const [payRow] = await payslipQuery.select(
            db.raw('COALESCE(SUM(COALESCE(NULLIF(gross_salary, 0), net_salary, 0)), 0) as total')
          );
          if (payRow?.total) monthlyPayrollCost = Number(payRow.total);
        }
      }
    } catch (err) {
      console.warn('[AdminDashboardService] monthlyPayrollCost calculation error:', err);
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
        const cutoffIso = `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, '0')}-${String(targetMonthDate.getDate()).padStart(2, '0')}`;

        let trendQuery = db('employees')
          .whereNull('employees.deleted_at')
          .whereNotExists(function () {
            this.select('ceo_user.id')
              .from('users as ceo_user')
              .join('user_roles as ceo_user_role', 'ceo_user_role.user_id', 'ceo_user.id')
              .join('roles as ceo_role', 'ceo_role.id', 'ceo_user_role.role_id')
              .whereRaw('ceo_user.employee_id = employees.id')
              .whereIn('ceo_role.code', ['ceo', 'organization_admin', 'super_admin']);
          })
          .where(function () {
            this.where('employees.date_of_joining', '<=', cutoffIso)
              .orWhere(function () {
                this.whereNull('employees.date_of_joining').andWhere('employees.created_at', '<=', `${cutoffIso} 23:59:59`);
              });
          });

        if (targetCompanyId) {
          trendQuery = trendQuery.where('employees.company_id', targetCompanyId);
        } else {
          trendQuery = trendQuery.where('employees.organization_id', organizationId);
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
    let departmentBreakdown: Array<{ id: number; name: string; count: number; percentage: number; employees: Array<{ id: number; name: string; employeeCode: string }> }> = [];
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

      let departmentEmployeesQuery = db('employees')
        .select('id', 'current_department_id as departmentId', 'first_name as firstName', 'last_name as lastName', 'employee_code as employeeCode')
        .whereNull('deleted_at')
        .where('status', 'active')
        .whereNotNull('current_department_id');
      if (targetCompanyId) departmentEmployeesQuery = departmentEmployeesQuery.where('company_id', targetCompanyId);
      else departmentEmployeesQuery = departmentEmployeesQuery.where('organization_id', organizationId);
      const departmentEmployees = await departmentEmployeesQuery.orderBy('first_name', 'asc');
      const employeesByDepartment = new Map<number, Array<{ id: number; name: string; employeeCode: string }>>();
      for (const employee of departmentEmployees) {
        const departmentId = Number(employee.departmentId ?? employee.current_department_id);
        const list = employeesByDepartment.get(departmentId) || [];
        list.push({
          id: Number(employee.id),
          name: `${employee.firstName || employee.first_name || 'Employee'} ${employee.lastName || employee.last_name || ''}`.trim(),
          employeeCode: employee.employeeCode || employee.employee_code || `EMP${employee.id}`,
        });
        employeesByDepartment.set(departmentId, list);
      }

      departmentBreakdown = (deptRows || [])
        .map((row: any) => {
          const employees = employeesByDepartment.get(Number(row.id)) || [];
          const count = employees.length;
          const percentage = totalHeadcount > 0 ? Math.round((count / totalHeadcount) * 100) : 0;
          return {
            id: Number(row.id),
            name: row.name || 'Unassigned',
            count,
            percentage,
            employees,
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
      periodSummary: {
        today: { present: 0, late: 0, absent: 0, onLeave: onLeaveToday, total: totalHeadcount, attendanceRate: 0 },
        week: { present: 0, late: 0, absent: 0, onLeave: 0, total: 0, attendanceRate: 0 },
        month: { present: 0, late: 0, absent: 0, onLeave: 0, total: 0, attendanceRate: 0 },
      },
    };

    try {
      const hasAttTable = await db.schema.hasTable('attendance_records');
      if (hasAttTable) {
        let attTodayQuery = db('attendance_records as ar')
          .join('employees as e', 'ar.employee_id', 'e.id')
          .whereNull('e.deleted_at')
          .where(function () {
            this.where('ar.check_in_date', todayStr)
              .orWhereRaw("DATE(ar.check_in_time) = ?", [todayStr])
              .orWhereRaw("DATE(ar.created_at) = ?", [todayStr]);
          });

        if (targetCompanyId) {
          attTodayQuery = attTodayQuery.where('e.company_id', targetCompanyId);
        } else {
          attTodayQuery = attTodayQuery.where('ar.organization_id', organizationId);
        }

        const todayRecords = await attTodayQuery.select(
          'ar.status',
          'ar.is_late'
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
        attendanceAnalytics.periodSummary.today = {
          present: presentCount + halfDayCount + wfhCount,
          late: lateCount,
          absent: absentCount,
          onLeave: onLeaveToday,
          total: totalHeadcount,
          attendanceRate: rate,
        };

        // 7-Day Attendance Trend
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyTrend: Array<{ day: string; date: string; present: number; late: number; absent: number }> = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const dayName = dayLabels[d.getDay()];

          let dayQ = db('attendance_records as ar')
            .join('employees as e', 'ar.employee_id', 'e.id')
            .whereNull('e.deleted_at')
            .where(function () {
              this.where('ar.check_in_date', dateStr)
                .orWhereRaw("DATE(ar.check_in_time) = ?", [dateStr]);
            });

          if (targetCompanyId) dayQ = dayQ.where('e.company_id', targetCompanyId);
          else dayQ = dayQ.where('ar.organization_id', organizationId);

          const dayRecs = await dayQ.select('ar.status', 'ar.is_late');
          let dayPresent = 0;
          let dayLate = 0;
          for (const rec of dayRecs) {
            const st = String(rec.status || '').toLowerCase();
            if (rec.isLate || rec.is_late || st === 'late') dayLate++;
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

        const summarizeAttendancePeriod = async (startDate: string, endDate: string) => {
          let periodQuery = db('attendance_records as ar')
            .join('employees as e', 'ar.employee_id', 'e.id')
            .where('ar.organization_id', organizationId)
            .whereNull('ar.deleted_at')
            .whereNull('e.deleted_at')
            .whereBetween('ar.check_in_date', [startDate, endDate]);
          if (targetCompanyId) periodQuery = periodQuery.where('e.company_id', targetCompanyId);
          else periodQuery = periodQuery.where('ar.organization_id', organizationId);

          const records = await periodQuery.select(
            'ar.employee_id', 'ar.status', 'ar.is_late',
            'ar.check_in_date as attendance_date'
          );
          const uniqueRecords = new Map<string, any>();
          for (const record of records) {
            const employeeId = record.employeeId ?? record.employee_id;
            const attendanceDate = record.attendanceDate ?? record.attendance_date;
            uniqueRecords.set(`${employeeId}:${String(attendanceDate).slice(0, 10)}`, record);
          }

          let present = 0;
          let late = 0;
          for (const record of uniqueRecords.values()) {
            const status = String(record.status || '').toLowerCase();
            if (record.isLate || record.is_late || status === 'late') late++;
            else if (status !== 'absent') present++;
          }

          let onLeave = 0;
          try {
            if (await db.schema.hasTable('leave_application_dates')) {
              let leaveQuery = db('leave_applications as la')
                .join('leave_application_dates as lad', 'lad.application_id', 'la.id')
                .join('employees as le', 'la.employee_id', 'le.id')
                .whereNull('la.deleted_at').where('la.status', 'approved')
                .where('la.organization_id', organizationId)
                .whereBetween('lad.leave_date', [startDate, endDate]);
              if (targetCompanyId) leaveQuery = leaveQuery.where('le.company_id', targetCompanyId);
              const leaveDates = await leaveQuery.select('la.employee_id', 'lad.leave_date');
              onLeave = new Set(leaveDates.map((row: any) => {
                const employeeId = row.employeeId ?? row.employee_id;
                const leaveDate = row.leaveDate ?? row.leave_date;
                return `${employeeId}:${String(leaveDate).slice(0, 10)}`;
              })).size;
            }
          } catch (leaveError) {
            console.warn('[AdminDashboardService] period leave aggregation error:', leaveError);
          }

          let workingDays = 0;
          const cursor = new Date(`${startDate}T00:00:00`);
          const end = new Date(`${endDate}T00:00:00`);
          while (cursor <= end) {
            if (cursor.getDay() !== 0 && cursor.getDay() !== 6) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
          }
          const total = totalHeadcount * workingDays;
          const absent = Math.max(0, total - present - late - onLeave);
          const attendanceRate = total > 0 ? Math.min(100, Math.round(((present + late) / total) * 100)) : 0;
          return { present, late, absent, onLeave, total, attendanceRate };
        };

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const toDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        attendanceAnalytics.periodSummary.week = await summarizeAttendancePeriod(toDateString(weekStart), todayStr);
        attendanceAnalytics.periodSummary.month = await summarizeAttendancePeriod(toDateString(monthStart), todayStr);
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
      monthlyTrend: [] as Array<{ month: string; monthKey: string; grossSalary: number; netSalary: number; deductions: number; source: 'payslip' | 'salary_structure' }>,
    };

    try {
      const hasPayslips = await db.schema.hasTable('payslips');
      const hasSalaryStructures = await db.schema.hasTable('salary_structures');
      for (let i = 11; i >= 0; i--) {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthIso = targetMonth.toISOString().slice(0, 7); // YYYY-MM
        const monthLabel = monthNames[targetMonth.getMonth()];

        let grossVal = 0;
        let netVal = 0;
        let dedVal = 0;
        let source: 'payslip' | 'salary_structure' = 'payslip';

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

        // If this is the current month and payroll has not yet been generated,
        // surface the exact active salary structure. This represents configured
        // compensation, not a historical or disbursed payroll amount.
        if (i === 0 && grossVal === 0 && netVal === 0 && dedVal === 0 && hasSalaryStructures) {
          let structureQuery = db('salary_structures as ss')
            .join('employees as e', 'ss.employee_id', 'e.id')
            .whereNull('ss.deleted_at')
            .whereNull('e.deleted_at')
            .where('ss.organization_id', organizationId)
            .where(function () {
              this.where('ss.status', 'active').orWhere('ss.status', 'Active').orWhereNull('ss.status');
            });

          if (targetCompanyId) structureQuery = structureQuery.where('e.company_id', targetCompanyId);

          const [structureTotals] = await structureQuery.select(
            db.raw('COALESCE(SUM(ss.gross_monthly), 0) as gross'),
            db.raw('COALESCE(SUM(ss.net_take_home), 0) as net'),
            db.raw('COALESCE(SUM(ss.total_deductions), 0) as deductions')
          );
          grossVal = Number(structureTotals?.gross || 0);
          netVal = Number(structureTotals?.net || 0);
          dedVal = Number(structureTotals?.deductions || 0);
          source = 'salary_structure';
        }

        // Only include an exact database record: a generated payslip, or the
        // current month's active salary structure. Never create estimated bars.
        if (grossVal > 0 || netVal > 0 || dedVal > 0) {
          payrollAnalytics.monthlyTrend.push({
            month: monthLabel,
            monthKey: monthIso,
            grossSalary: grossVal,
            netSalary: netVal,
            deductions: dedVal,
            source,
          });
        }
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
      disbursementTrend: [] as Array<{ date: string; disbursedAmount: number }>,
      byCategory: [] as Array<{ categoryName: string; totalAmount: number }>,
    };

    try {
      const hasExpenses = await db.schema.hasTable('expense_claims');
      if (hasExpenses) {
        const hasExpensePayments = await db.schema.hasTable('expense_payments');
        const hasExpenseDeletedAt = await db.schema.hasColumn('expense_claims', 'deleted_at');
        const hasExpenseRuns = await db.schema.hasTable('expense_approval_runs');
        const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
          .toISOString()
          .slice(0, 10);

        // expense_payments is the source of truth for money actually paid by
        // the workflow. Fall back to paid expense claims for older databases.
        let disbursementRows: any[] = [];
        if (hasExpensePayments) {
          let paymentQuery = db('expense_payments as ep')
            .where('ep.organization_id', organizationId)
            .where('ep.payment_date', '>=', trendStart);

          if (targetCompanyId && hasExpenseRuns) {
            paymentQuery = paymentQuery
              .join('expense_approval_runs as ear', 'ep.run_id', 'ear.id')
              .where(function () {
                this.where('ear.company_id', targetCompanyId).orWhereNull('ear.company_id');
              });
          }

          disbursementRows = await paymentQuery
            .select(
              db.raw("DATE_FORMAT(ep.payment_date, '%Y-%m-%d') as date"),
              db.raw('COALESCE(SUM(ep.amount), 0) as disbursedAmount')
            )
            .groupByRaw("DATE_FORMAT(ep.payment_date, '%Y-%m-%d')")
            .orderByRaw("DATE_FORMAT(ep.payment_date, '%Y-%m-%d') asc");
        } else {
          let claimQuery = db('expense_claims as ec')
            .where('ec.organization_id', organizationId)
            .whereIn('ec.status', ['paid', 'reimbursed'])
            .whereNotNull('ec.payment_date')
            .where('ec.payment_date', '>=', trendStart)
            .where('ec.paid_amount', '>', 0);
          if (hasExpenseDeletedAt) claimQuery = claimQuery.whereNull('ec.deleted_at');
          if (targetCompanyId) {
            claimQuery = claimQuery
              .join('employees as e', 'ec.employee_id', 'e.id')
              .where('e.company_id', targetCompanyId);
          }
          disbursementRows = await claimQuery
            .select(
              db.raw("DATE_FORMAT(ec.payment_date, '%Y-%m-%d') as date"),
              db.raw('COALESCE(SUM(ec.paid_amount), 0) as disbursedAmount')
            )
            .groupByRaw("DATE_FORMAT(ec.payment_date, '%Y-%m-%d')")
            .orderByRaw("DATE_FORMAT(ec.payment_date, '%Y-%m-%d') asc");
        }

        expenseAnalytics.disbursementTrend = (disbursementRows || []).map((row: any) => ({
          date: String(row.date).slice(0, 10),
          disbursedAmount: Number(row.disbursedAmount ?? row.disbursed_amount ?? 0),
        }));

        // Expenses by Category
        let catQ = db('expense_claims as ec')
          .leftJoin('expense_categories as c', 'ec.category_id', 'c.id')
          .where('ec.organization_id', organizationId)
          .select(
            db.raw("COALESCE(c.name, 'General Expense') as categoryName"),
            db.raw('COALESCE(SUM(ec.total_claimed_amount), 0) as totalAmount')
          )
          .groupBy('categoryName')
          .orderBy('totalAmount', 'desc')
          .limit(6);
        if (hasExpenseDeletedAt) catQ = catQ.whereNull('ec.deleted_at');

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
    let upcomingEvents = { holidays: [] as Array<{ id: number; name: string; date: string; type: string }>, birthdays: [] as Array<{ id: number; name: string; date: string; upcomingDate: string }> };
    try {
      const today = new Date(); const todayIso = today.toISOString().slice(0, 10);
      if (await db.schema.hasTable('holidays')) {
        let q = db('holidays').where('organization_id', organizationId).where('holiday_date', '>=', todayIso);
        if (await db.schema.hasColumn('holidays', 'deleted_at')) q = q.whereNull('deleted_at');
        upcomingEvents.holidays = (await q.orderBy('holiday_date').limit(6)).map((r: any) => ({ id: Number(r.id), name: r.holidayName || r.holiday_name || 'Holiday', date: String(r.holidayDate || r.holiday_date).slice(0, 10), type: r.holidayType || r.holiday_type || 'company' }));
      }
      if (await db.schema.hasColumn('employees', 'date_of_birth')) {
        let q = db('employees').whereNull('deleted_at').where('organization_id', organizationId).whereNotNull('date_of_birth'); if (targetCompanyId) q = q.where('company_id', targetCompanyId);
        const birthdayRows = await q.select(
          'id',
          'first_name',
          'last_name',
          db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as dateOfBirth")
        );
        upcomingEvents.birthdays = birthdayRows
          .map((r: any) => {
            const d = String(r.dateOfBirth || r.date_of_birth || '').slice(0, 10);
            const [, month, day] = d.split('-').map(Number);
            if (!month || !day) return null;
            const upcomingYear = today.getFullYear() + (month - 1 < today.getMonth() ? 1 : 0);
            return {
              id: Number(r.id),
              name: `${r.firstName || r.first_name || ''} ${r.lastName || r.last_name || ''}`.trim() || 'Employee',
              date: d,
              upcomingDate: `${upcomingYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            };
          })
          .filter((birthday): birthday is NonNullable<typeof birthday> => birthday !== null)
          .sort((a, b) => {
            const aMonthDay = a.date.slice(5, 10);
            const bMonthDay = b.date.slice(5, 10);
            return aMonthDay.localeCompare(bMonthDay) || a.name.localeCompare(b.name);
          });
      }
    } catch (e) { console.warn('[AdminDashboardService] upcoming events error:', e); }

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
      upcomingEvents,
      workforceAnalytics,
    };
  }
}
