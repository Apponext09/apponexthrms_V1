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

    const targetCompanyId = companyId || companyIdVal;

    // Fallback Location Resolution if company record doesn't specify address:
    if (!location && targetCompanyId) {
      // Check locations table for target company
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

    // 2. Query KPIs
    // Total Active Employees
    let empQuery = db('employees')
      .whereNull('deleted_at')
      .whereIn('status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);

    if (targetCompanyId) {
      empQuery = empQuery.where('company_id', targetCompanyId);
    } else {
      empQuery = empQuery.where('organization_id', organizationId);
    }
    const [empCountRow] = await empQuery.count('* as count');
    const totalHeadcount = Number(empCountRow?.count || 0);

    // Active Departments
    let deptQuery = db('departments').whereNull('deleted_at');
    if (targetCompanyId) {
      deptQuery = deptQuery.where('company_id', targetCompanyId);
    } else {
      deptQuery = deptQuery.where('organization_id', organizationId);
    }
    const [deptCountRow] = await deptQuery.count('* as count');
    const activeDepartments = Number(deptCountRow?.count || 0);

    // Office Locations / Branches (from locations or branches or company table)
    let locCount = 0;
    const hasBranchesTable = await db.schema.hasTable('branches');
    if (hasBranchesTable) {
      let branchQuery = db('branches').whereNull('deleted_at');
      if (targetCompanyId) {
        branchQuery = branchQuery.where('company_id', targetCompanyId);
      } else {
        branchQuery = branchQuery.where('organization_id', organizationId);
      }
      const [branchRow] = await branchQuery.count('* as count');
      locCount = Number(branchRow?.count || 0);
    }
    if (locCount === 0) {
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
    }
    if (locCount === 0) {
      // Fallback count of companies under this organization
      const [compRow] = await db('company')
        .where('organization_id', organizationId)
        .whereNull('deleted_at')
        .count('* as count');
      locCount = Number(compRow?.count || 0);
    }

    // Reporting Officers (distinct managers)
    let officerQuery = db('employees')
      .whereNull('deleted_at')
      .whereNotNull('reporting_manager_id');
    if (targetCompanyId) {
      officerQuery = officerQuery.where('company_id', targetCompanyId);
    } else {
      officerQuery = officerQuery.where('organization_id', organizationId);
    }
    const [officerRow] = await officerQuery.countDistinct('reporting_manager_id as count');
    const reportingOfficers = Number(officerRow?.count || 0);

    // Open Job Postings
    let openJobs = 0;
    try {
      const hasJobsTable = await db.schema.hasTable('jobs');
      if (hasJobsTable) {
        let openJobsQuery = db('jobs')
          .whereNull('deleted_at')
          .whereIn('status', ['published', 'active', 'open']);
        if (targetCompanyId) {
          const hasCompanyIdCol = await db.schema.hasColumn('jobs', 'company_id');
          if (hasCompanyIdCol) {
            openJobsQuery = openJobsQuery.where('company_id', targetCompanyId);
          } else {
            openJobsQuery = openJobsQuery.where('organization_id', organizationId);
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
          let payslipQuery = db('payslips').whereNull('deleted_at');
          if (targetCompanyId) {
            const hasCompanyId = await db.schema.hasColumn('payslips', 'company_id');
            if (hasCompanyId) payslipQuery = payslipQuery.where('company_id', targetCompanyId);
            else payslipQuery = payslipQuery.where('organization_id', organizationId);
          } else {
            payslipQuery = payslipQuery.where('organization_id', organizationId);
          }

          const hasNetSalary = await db.schema.hasColumn('payslips', 'net_salary');
          const hasGrossSalary = await db.schema.hasColumn('payslips', 'gross_salary');
          const colToSum = hasNetSalary ? 'net_salary' : (hasGrossSalary ? 'gross_salary' : null);

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

    // Calculate dates for last 6 months
    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // last day of month
      const monthLabel = monthNames[targetMonthDate.getMonth()];
      const cutoffIso = targetMonthDate.toISOString().slice(0, 10);

      let trendQuery = db('employees')
        .whereNull('deleted_at')
        .whereIn('status', ['active', 'probation', 'confirmed', 'onboarding', 'Active'])
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

    // 4. Department Breakdown with Employee Counts
    let deptBreakdownQuery = db('departments')
      .leftJoin('employees', function () {
        this.on('departments.id', '=', 'employees.current_department_id')
          .andOnNull('employees.deleted_at')
          .andOnIn('employees.status', ['active', 'probation', 'confirmed', 'onboarding', 'Active']);
      })
      .select('departments.id', 'departments.name')
      .count('employees.id as emp_count')
      .whereNull('departments.deleted_at')
      .groupBy('departments.id', 'departments.name');

    if (targetCompanyId) {
      deptBreakdownQuery = deptBreakdownQuery.where('departments.company_id', targetCompanyId);
    } else {
      deptBreakdownQuery = deptBreakdownQuery.where('departments.organization_id', organizationId);
    }

    const deptRows = await deptBreakdownQuery;

    const departmentBreakdown = deptRows
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

    // 5. Recent Employees
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

    const recentEmployees = (await recentQuery).map((emp: any) => ({
      id: Number(emp.id),
      firstName: emp.firstName || 'Employee',
      lastName: emp.lastName || '',
      employeeCode: emp.employeeCode || `EMP${emp.id}`,
      status: emp.status || 'active',
      avatarUrl: emp.avatarUrl || undefined,
      departmentName: emp.departmentName || 'General',
    }));

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
      },
      growthTrend,
      departmentBreakdown,
      recentEmployees,
    };
  }
}

