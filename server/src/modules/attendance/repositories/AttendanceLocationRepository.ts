import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface AttendanceLocation {
  id: number;
  uuid: string;
  organization_id: number;
  location_name: string;
  location_code: string;
  branch_id: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_primary: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendanceLocationRepository extends BaseRepository<AttendanceLocation> {
  constructor() {
    super('attendance_locations');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<AttendanceLocation | null> {
    return this.query(ctx).where('location_code', code).first() as Promise<AttendanceLocation | null>;
  }

  async getPrimaryLocation(ctx: TenantContext): Promise<AttendanceLocation | null> {
    return this.query(ctx).where('is_primary', true).first() as Promise<AttendanceLocation | null>;
  }

  async getByBranch(ctx: TenantContext, branchId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { branch_id: branchId },
    });
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('location_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  protected getSearchableFields(): string[] {
    return ['location_name', 'location_code', 'address'];
  }
}
