import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeLanguage {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  language_name: string;
  proficiency: 'read' | 'write' | 'speak';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeLanguageRepository extends BaseRepository<EmployeeLanguage> {
  constructor() {
    super('employee_languages');
  }

  /**
   * Get languages by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get employees speaking a language
   */
  async getEmployeesByLanguage(ctx: TenantContext, languageName: string) {
    return this.query(ctx)
      .where('language_name', languageName)
      .pluck('employee_id');
  }

  protected getSearchableFields(): string[] {
    return ['language_name'];
  }
}
