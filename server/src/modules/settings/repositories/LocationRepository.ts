import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Location {
  id: number;
  uuid: string;
  organization_id: number;
  // --- Core display fields ---
  name: string;           // kept for backward compat (auto-generated from location_name)
  code: string;           // kept for backward compat (auto-generated)
  location_name: string | null;
  office_type: string | null;
  // --- Address ---
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  postal_area: string | null;
  postal_code: string | null; // old field kept for backward compat
  // --- Contact ---
  location_mail: string | null;
  contact_name: string | null;
  contact_number: string | null;
  // --- Config ---
  default_currency_format: string | null;
  company_id: number | null;  // renamed from branch_id
  is_active: 'Yes' | 'No';   // stored as string to avoid bool issues
  // --- Meta ---
  status: 'active' | 'inactive'; // old field, kept for compat
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LocationRepository extends BaseRepository<Location> {
  constructor() {
    super('locations');
    this.companyScoped = true;
  }

  async list(ctx: TenantContext, options: any = {}, includeDeleted: any = undefined) {
    const filters = { ...(options.filters || {}) };
    const status = filters.status;
    delete filters.status;

    const modifiedOptions = {
      ...options,
      filters,
    };

    if (status === 'active') {
      modifiedOptions.customWhere = (q: any) => {
        q.where(function (this: any) {
          this.where('status', 'active').orWhere('is_active', 'Yes');
        }).where(function (this: any) {
          this.whereNot('status', 'inactive').whereNot('is_active', 'No');
        });
      };
    } else if (status === 'inactive') {
      modifiedOptions.customWhere = (q: any) => {
        q.where(function (this: any) {
          this.where('status', 'inactive').orWhere('is_active', 'No');
        });
      };
    }

    return super.list(ctx, modifiedOptions, includeDeleted);
  }

  /**
   * Get location by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Location | null> {
    return this.query(ctx).where('code', code).first() as Promise<Location | null>;
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
    return ['location_name', 'name', 'code', 'city', 'state', 'district', 'office_type'];
  }
}
