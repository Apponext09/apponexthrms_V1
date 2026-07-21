import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Branch {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  branch_head_id: number | null;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class BranchRepository extends BaseRepository<Branch> {
  constructor() {
    super('branches');
  }

  /**
   * Get branch by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Branch | null> {
    return this.query(ctx).where('code', code).first() as Promise<Branch | null>;
  }

  /**
   * Get primary branch
   */
  async getPrimaryBranch(ctx: TenantContext): Promise<Branch | null> {
    return this.query(ctx).where('is_primary', true).first() as Promise<Branch | null>;
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
    return ['name', 'code', 'city', 'email'];
  }
}
