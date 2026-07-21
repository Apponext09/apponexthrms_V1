import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Employee {
  id: number;
  uuid: string;
  organization_id: number;
  employee_code: string;
  status: 'candidate' | 'onboarding' | 'probation' | 'active' | 'notice' | 'exit' | 'alumni';
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_group: string | null;
  nationality: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  passport_number: string | null;
  current_designation_id: number | null;
  current_department_id: number | null;
  current_branch_id: number | null;
  current_location_id: number | null;
  reporting_manager_id: number | null;
  cost_center_id: number | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  date_of_joining: string;
  date_of_confirmation: string | null;
  probation_end_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor() {
    super('employees');
  }

  /**
   * Get employee by employee code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Employee | null> {
    return this.query(ctx).where('employee_code', code).first() as Promise<Employee | null>;
  }

  /**
   * Check if employee code is unique
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('employee_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get employees by department
   */
  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { current_department_id: departmentId },
    });
  }

  /**
   * Get employees by manager (direct reports)
   */
  async getDirectReports(ctx: TenantContext, managerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { reporting_manager_id: managerId },
    });
  }

  /**
   * Get employees by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get employee with all related information
   */
  async getWithDetails(ctx: TenantContext, id: number | string): Promise<Employee | null> {
    return this.getById(ctx, id);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['employee_code', 'first_name', 'last_name', 'email', 'mobile', 'pan_number'];
  }

  /**
   * Get allowed columns for sorting
   */
  protected getAllowedSortColumns(): string[] {
    return [
      'id',
      'employee_code',
      'first_name',
      'last_name',
      'email',
      'status',
      'employment_type',
      'date_of_joining',
      'date_of_confirmation',
      'probation_end_date',
      'created_at',
      'updated_at',
      'organization_id',
    ];
  }
}
