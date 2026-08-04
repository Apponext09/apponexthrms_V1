import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Company {
  company_id: number;
  uuid: string;
  organization_id: number;
  code: string;
  name: string;
  employer_name?: string | null;
  class_of_establishment?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  country?: string | null;
  zip_code?: string | null;
  state?: string | null;
  city?: string | null;
  pan_tin?: string | null;
  contact_number?: string | null;
  email?: string | null;
  logo?: string | null;
  company_stamp?: string | null;
  signature?: string | null;
  is_active_toggle?: boolean | number;
  active_users_toggle?: boolean | number;
  login_page_logo_toggle?: boolean | number;
  description?: string | null;
  status: 'Active' | 'Inactive';
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super('company');
  }

  /**
   * Get company by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Company | null> {
    return this.query(ctx).where('code', code).first() as Promise<Company | null>;
  }

  /**
   * Check if code exists within organization
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('code', code);
    if (excludeId) {
      query = query.whereNot('company_id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get searchable fields for list() method.
   */
  protected getSearchableFields(): string[] {
    return ['name', 'code', 'city', 'state', 'zip_code', 'contact_number', 'email'];
  }

  /**
   * Allowed sort columns
   */
  protected getAllowedSortColumns(): string[] {
    return ['company_id', 'code', 'name', 'status', 'created_at', 'updated_at'];
  }
}
