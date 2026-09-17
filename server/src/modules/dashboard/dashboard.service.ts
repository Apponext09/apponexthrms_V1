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

    // Fallback Location Resolution if company record doesn't specify address:
    if (!location && targetCompanyId) {
      // A switched company shows only its own location.
      const hasLocationsTable = await db.schema.hasTable('locations');
      if (hasLocationsTable) {
        const compLoc = await db('locations')
          .where('company_id', targetCompanyId)
          .whereNull('deleted_at')
          .first();
        if (compLoc) {
          location = buildLocationStr(compLoc) || compLoc.locationName || compLoc.name || '';
        }
      }
    }

    if (!location && organizationId) {
      // Check organization table
      const org = await db('organizations').where('id', organizationId).first();
      if (org) {
        if (!companyName || companyName === 'Organization') {
          companyName = org.name || companyName;
          companyCode = org.code || '';
        }
        location = org.location || buildLocationStr(org) || org.addressLine1 || org.address_line_1 || '';
      }
    }

    if (!location && organizationId) {
      // Check primary location record in locations table for the organization
      const hasLocationsTable = await db.schema.hasTable('locations');
      if (hasLocationsTable) {
        const orgLoc = await db('locations')
          .where('organization_id', organizationId)
          .whereNull('deleted_at')
          .first();
        if (orgLoc) {
          location = buildLocationStr(orgLoc) || orgLoc.locationName || orgLoc.name || '';
        }
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
        let fallbackEmp = db('employees').whereNull('deleted_at');
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
    // Source: workflow_approvals (any pending-like status) + leave_applications (submitted/pending).
    let pendingApprovals = 0;
    try {
      // workflow_approvals — any status that starts with 'Pending' or 'pending', or is 'submitted'
      let workflowApprovalQuery = db('workflow_approvals')
        .whereNull('deleted_at')
        .where(function () {
          this.where('status', 'like', 'Pending%')
            .orWhere('status', 'like', 'pending%')
            .orWhereIn('status', ['submitted', 'escalated']);
        });
      if (targetCompanyId) {
        // workflow_approvals has no company_id. Its applicant is the authoritative
        // company relationship, so scope via that employee instead.
        workflowApprovalQuery = workflowApprovalQuery
          .join('employees as workflow_applicant', 'workflow_approvals.applicant_id', 'workflow_applicant.id')
          .where('workflow_applicant.company_id', targetCompanyId)
          .whereNull('workflow_applicant.deleted_at');
      } else {
        workflowApprovalQuery = workflowApprovalQuery.where('workflow_approvals.organization_id', organizationId);
      }
      const [waRow] = await workflowApprovalQuery.count('* as count');
      pendingApprovals += Number(waRow?.count || 0);

      // leave_applications — submitted or any pending variant
      let laQuery = db('leave_applications')
        .whereNull('deleted_at')
        .whereIn('status', ['submitted', 'pending', 'pending_manager', 'pending_hr', 'pending_hr_override', 'escalated']);
      if (targetCompanyId) {
        laQuery = laQuery.where('company_id', targetCompanyId);
      } else {
        laQuery = laQuery.where('organization_id', organizationId);
      }
      const [laRow] = await laQuery.count('* as count');
      pendingApprovals += Number(laRow?.count || 0);
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

    // Estimated Monthly Payroll
    let monthlyPayrollCost = 0;
    try {
      const hasCompTable = await db.schema.hasTable('employee_compensation');
      if (hasCompTable) {
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
    };
  }
}

