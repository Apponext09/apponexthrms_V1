import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface Location {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  code: string;
  type: 'office' | 'work';
  branch_id: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
  timezone: string;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LocationRepository extends BaseRepository<Location> {
  constructor() {
    super('locations');
  }

  /**
   * Get location by code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Location | null> {
    return this.query(ctx).where('code', code).first() as Promise<Location | null>;
  }

  /**
   * Get locations by type
   */
  async getByType(ctx: TenantContext, type: 'office' | 'work') {
    return this.query(ctx).where('type', type);
  }

  /**
   * Get office locations
   */
  async getOfficeLocations(ctx: TenantContext) {
    return this.query(ctx).where('type', 'office');
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
    return ['name', 'code', 'city', 'type'];
  }
}
