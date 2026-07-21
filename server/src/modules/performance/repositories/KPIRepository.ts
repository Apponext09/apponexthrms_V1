import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface KPITemplate {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  description: string | null;
  role_based: boolean;
  department_based: boolean;
  measurement_type: string;
  target_value: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmployeeKPI {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  kpi_template_id: number;
  target_value: number;
  actual_value: number;
  achievement_percentage: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class KPITemplateRepository extends BaseRepository<KPITemplate> {
  constructor() {
    super('kpi_templates');
  }

  /**
   * Get templates by measurement type
   */
  async getByMeasurementType(ctx: TenantContext, type: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { measurement_type: type },
    });
  }

  /**
   * Get role-based templates
   */
  async getRoleBasedTemplates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { role_based: true },
    });
  }

  /**
   * Get department-based templates
   */
  async getDepartmentBasedTemplates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { department_based: true },
    });
  }
}

export class EmployeeKPIRepository extends BaseRepository<EmployeeKPI> {
  constructor() {
    super('employee_kpis');
  }

  /**
   * Get KPIs by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get KPIs by template
   */
  async getByTemplate(ctx: TenantContext, templateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { kpi_template_id: templateId },
    });
  }

  /**
   * Update achievement percentage
   */
  async updateAchievement(ctx: TenantContext, id: number, actual: number, target: number) {
    const percentage = (actual / target) * 100;
    return this.update(ctx, id, {
      actual_value: actual,
      achievement_percentage: Math.min(100, percentage),
    });
  }
}
