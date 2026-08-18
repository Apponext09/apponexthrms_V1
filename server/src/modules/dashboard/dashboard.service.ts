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

    // 1. Resolve Company Information
    let companyName = 'Organization';
    let companyCode = '';
    let isParent = !companyId;
    let location = 'Headquarters';
    let companyIdVal: number | null = companyId || null;

    if (companyId) {
      const comp = await db('company')
        .where('company_id', companyId)
        .whereNull('deleted_at')
        .first();
      if (comp) {
        companyName = comp.name || companyName;
        companyCode = comp.code || '';
        isParent = Boolean((comp as any).isParent ?? comp.is_parent);
        location = [comp.city, comp.state, comp.country].filter(Boolean).join(', ') || 'Headquarters';
        companyIdVal = Number((comp as any).companyId || (comp as any).company_id || (comp as any).id);
      }
    } else {
      // Find parent company for org or org name
      const parentComp = await db('company')
        .where('organization_id', organizationId)
        .where((b) => b.where('is_parent', 1).orWhere('is_parent', true))
        .whereNull('deleted_at')
        .first();

      if (parentComp) {
        companyName = parentComp.name;
        companyCode = parentComp.code || '';
        companyIdVal = Number((parentComp as any).companyId || (parentComp as any).company_id || (parentComp as any).id);
        isParent = true;
        location = [parentComp.city, parentComp.state, parentComp.country].filter(Boolean).join(', ') || 'Headquarters';
      } else {
        const org = await db('organizations').where('id', organizationId).first();
        if (org) {
          companyName = org.name || companyName;
          companyCode = org.code || '';
        }
      }
    }

    const targetCompanyId = companyId || companyIdVal;

    // 2. Query KPIs
    // Total Employees
    let empQuery = db('employees').whereNull('deleted_at').where('status', '!=', 'terminated');
    if (targetCompanyId) {
      empQuery = empQuery.where((b) => {
        if (isParent) {
          b.where('company_id', targetCompanyId).orWhereNull('company_id');
        } else {
          b.where('company_id', targetCompanyId);
        }
      });
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

    // Office Locations (from locations or branches)
    let locCount = 0;
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
    } else {
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
          .andOn('employees.status', '!=', db.raw('?', ['terminated']));
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
      },
      growthTrend,
      departmentBreakdown,
      recentEmployees,
    };
  }
}
