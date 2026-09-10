import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface PayrollPolicy {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  is_default: boolean;
  pay_frequency: 'monthly' | 'biweekly' | 'weekly';
  salary_structure: any;
  deductions: any;
  compliance_settings: any;
  description: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollPolicyRepository extends BaseRepository<PayrollPolicy> {
  constructor() {
    super('payroll_policies');
  }

  /**
   * Get default payroll policy
   */
  async getDefault(ctx: TenantContext): Promise<PayrollPolicy | null> {
    return this.query(ctx).where('is_default', true).first() as Promise<PayrollPolicy | null>;
  }

  /**
   * Get policy by code
   */
  async getByCode(ctx: TenantContext, code: string): Promise<PayrollPolicy | null> {
    return this.query(ctx).where('code', code).first() as Promise<PayrollPolicy | null>;
  }

  /**
   * Get policies by pay frequency
   */
  async getByPayFrequency(ctx: TenantContext, payFrequency: 'monthly' | 'biweekly' | 'weekly') {
    return this.query(ctx).where('pay_frequency', payFrequency);
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['name', 'code'];
  }
}
