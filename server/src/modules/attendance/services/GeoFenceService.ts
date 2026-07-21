import { v4 as uuidv4 } from 'uuid';
import { GeofenceRepository, type AttendanceGeofence } from '../repositories/GeofenceRepository';
import { AttendanceLocationRepository, type AttendanceLocation } from '../repositories/AttendanceLocationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class GeoFenceService {
  private geofenceRepo: GeofenceRepository;
  private locationRepo: AttendanceLocationRepository;
  private auditService: AuditService;

  constructor() {
    this.geofenceRepo = new GeofenceRepository();
    this.locationRepo = new AttendanceLocationRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a geofence
   */
  async createGeofence(ctx: TenantContext, input: {
    locationId: number;
    geofenceName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isOfficeLocation?: boolean;
    allowsRemoteWork?: boolean;
  }): Promise<AttendanceGeofence> {
    const location = await this.locationRepo.getById(ctx, input.locationId);
    if (!location) {
      throw new NotFoundError('Location not found');
    }

    const geofence = await this.geofenceRepo.create(ctx, {
      uuid: uuidv4(),
      location_id: input.locationId,
      geofence_name: input.geofenceName,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters,
      is_office_location: input.isOfficeLocation || true,
      allows_remote_work: input.allowsRemoteWork || false,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'GEOFENCE',
      entityId: geofence.id,
      afterState: { geofenceName: input.geofenceName, radius: input.radiusMeters },
    });

    return geofence;
  }

  /**
   * Check if coordinates are within geofence
   */
  isWithinGeofence(
    lat: number,
    lon: number,
    geofenceLat: number,
    geofenceLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(lat, lon, geofenceLat, geofenceLon);
    return distance <= radiusMeters;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Validate check-in location
   */
  async validateCheckInLocation(
    ctx: TenantContext,
    employeeId: number,
    latitude: number,
    longitude: number,
    timestamp: string
  ): Promise<{ valid: boolean; message: string }> {
    // Get all office geofences
    const geofences = await this.geofenceRepo.getOfficeLocations(ctx);
    if (geofences.length === 0) {
      return { valid: true, message: 'No geofences configured' };
    }

    // Check if within any geofence
    for (const geofence of geofences) {
      if (this.isWithinGeofence(latitude, longitude, geofence.latitude, geofence.longitude, geofence.radius_meters)) {
        return { valid: true, message: `Within ${geofence.geofence_name}` };
      }
    }

    return { valid: false, message: 'Location is outside all configured geofences' };
  }

  /**
   * Get all geofences
   */
  async getAllGeofences(ctx: TenantContext, options?: ListQueryOptions) {
    return this.geofenceRepo.list(ctx, options);
  }

  /**
   * Get geofences by location
   */
  async getByLocation(ctx: TenantContext, locationId: number, options?: ListQueryOptions) {
    return this.geofenceRepo.getByLocationId(ctx, locationId, options);
  }

  /**
   * Create location
   */
  async createLocation(ctx: TenantContext, input: {
    locationName: string;
    locationCode: string;
    branchId?: number;
    address?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    isPrimary?: boolean;
  }): Promise<AttendanceLocation> {
    const isUnique = await this.locationRepo.isCodeUnique(ctx, input.locationCode);
    if (!isUnique) {
      throw new ValidationError(`Location code '${input.locationCode}' already exists`);
    }

    const location = await this.locationRepo.create(ctx, {
      uuid: uuidv4(),
      location_name: input.locationName,
      location_code: input.locationCode,
      branch_id: input.branchId || null,
      address: input.address || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      timezone: input.timezone || 'UTC',
      is_primary: input.isPrimary || false,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ATTENDANCE_LOCATION',
      entityId: location.id,
      afterState: { locationName: input.locationName, locationCode: input.locationCode },
    });

    return location;
  }

  /**
   * Get all locations
   */
  async getAllLocations(ctx: TenantContext, options?: ListQueryOptions) {
    return this.locationRepo.list(ctx, options);
  }

  /**
   * Get location by ID
   */
  async getLocation(ctx: TenantContext, locationId: number): Promise<AttendanceLocation | null> {
    return this.locationRepo.getById(ctx, locationId);
  }
}
