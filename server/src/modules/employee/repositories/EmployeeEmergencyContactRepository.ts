import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeEmergencyContact {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeEmergencyContactRepository extends BaseRepository<EmployeeEmergencyContact> {
  constructor() {
    super('employee_emergency_contacts');
  }

  /**
   * Get emergency contacts by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get primary emergency contact
   */
  async getPrimaryContact(ctx: TenantContext, employeeId: number): Promise<EmployeeEmergencyContact | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('is_primary', true)
      .first() as Promise<EmployeeEmergencyContact | null>;
  }

  protected getSearchableFields(): string[] {
    return ['name', 'relationship', 'phone', 'email'];
  }
}
