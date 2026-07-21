import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeSkill {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  skill_name: string;
  proficiency: 'beginner' | 'intermediate' | 'expert';
  years_of_experience: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeSkillRepository extends BaseRepository<EmployeeSkill> {
  constructor() {
    super('employee_skills');
  }

  /**
   * Get skills by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get skill by name and employee
   */
  async getBySkillName(ctx: TenantContext, employeeId: number, skillName: string): Promise<EmployeeSkill | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('skill_name', skillName)
      .first() as Promise<EmployeeSkill | null>;
  }

  /**
   * Get employees with specific skill
   */
  async getEmployeesBySkill(ctx: TenantContext, skillName: string, proficiency?: string) {
    let query = this.query(ctx).where('skill_name', skillName);
    if (proficiency) {
      query = query.where('proficiency', proficiency);
    }
    return query.select();
  }

  protected getSearchableFields(): string[] {
    return ['skill_name'];
  }
}
