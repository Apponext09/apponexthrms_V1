import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface AttendanceGeofence {
  id: number;
  uuid: string;
  organization_id: number;
  location_id: number;
  geofence_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_office_location: boolean;
  allows_remote_work: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class GeofenceRepository extends BaseRepository<AttendanceGeofence> {
  constructor() {
    super('attendance_geofences');
  }

  async getByLocation(ctx: TenantContext, locationId: number): Promise<AttendanceGeofence[]> {
    return this.query(ctx).where('location_id', locationId);
  }

  async getOfficeLocations(ctx: TenantContext): Promise<AttendanceGeofence[]> {
    return this.query(ctx).where('is_office_location', true);
  }

  async getByName(ctx: TenantContext, name: string): Promise<AttendanceGeofence | null> {
    return this.query(ctx).where('geofence_name', name).first() as Promise<AttendanceGeofence | null>;
  }

  async getByLocationId(ctx: TenantContext, locationId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { location_id: locationId },
    });
  }

  protected getSearchableFields(): string[] {
    return ['geofence_name'];
  }
}
