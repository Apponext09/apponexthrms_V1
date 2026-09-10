import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeCertification {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  certification_name: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date: string | null;
  certificate_url: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeCertificationRepository extends BaseRepository<EmployeeCertification> {
  constructor() {
    super('employee_certifications');
  }

  /**
   * Get certifications by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get expired certifications
   */
  async getExpired(ctx: TenantContext, options?: ListQueryOptions) {
    const db = this.query(ctx);
    return db
      .whereNotNull('expiry_date')
      .where('expiry_date', '<', new Date().toISOString())
      .limit(options?.pageSize || 20);
  }

  /**
   * Get expiring soon certifications (within 30 days)
   */
  async getExpiringSoon(ctx: TenantContext, days: number = 30) {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const db = this.query(ctx);
    return db
      .whereNotNull('expiry_date')
      .where('expiry_date', '<=', futureDate.toISOString())
      .where('expiry_date', '>', new Date().toISOString())
      .select();
  }

  protected getSearchableFields(): string[] {
    return ['certification_name', 'issuing_organization'];
  }
}
