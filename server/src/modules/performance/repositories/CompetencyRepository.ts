import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface CompetencyFramework {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  description: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Competency {
  id: number;
  uuid: string;
  organization_id: number;
  framework_id: number;
  name: string;
  description: string | null;
  proficiency_levels: any | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmployeeCompetency {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  competency_id: number;
  current_level: number | null;
  target_level: number | null;
  gap_analysis: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CompetencyFrameworkRepository extends BaseRepository<CompetencyFramework> {
  constructor() {
    super('competency_frameworks');
  }

  /**
   * Get active frameworks
   */
  async getActive(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'active' },
    });
  }
}

export class CompetencyRepository extends BaseRepository<Competency> {
  constructor() {
    super('competencies');
  }

  /**
   * Get competencies by framework
   */
  async getByFramework(ctx: TenantContext, frameworkId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { framework_id: frameworkId },
    });
  }
}

export class EmployeeCompetencyRepository extends BaseRepository<EmployeeCompetency> {
  constructor() {
    super('employee_competencies');
  }

  /**
   * Get competencies for an employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get employee competencies by competency
   */
  async getByCompetency(ctx: TenantContext, competencyId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { competency_id: competencyId },
    });
  }

  /**
   * Get competencies with gaps
   */
  async getWithGaps(ctx: TenantContext, employeeId: number) {
    const competencies = await this.getForEmployee(ctx, employeeId);
    return competencies.items.filter((c) => c.target_level && c.current_level && c.current_level < c.target_level);
  }
}
