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
    locationId?: number;
    geofenceName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    ipAddress?: string;
    isOfficeLocation?: boolean;
    allowsRemoteWork?: boolean;
  }): Promise<AttendanceGeofence> {
    let locId = input.locationId;
    if (!locId) {
      const locations = await this.locationRepo.list(ctx, { pageSize: 1 });
      if (locations.items && locations.items.length > 0) {
        locId = locations.items[0].id;
      } else {
        const newLoc = await this.createLocation(ctx, {
          locationName: input.geofenceName || 'Main Office',
          locationCode: `LOC-${Date.now().toString().slice(-6)}`,
          latitude: input.latitude,
          longitude: input.longitude,
          isPrimary: true,
        });
        locId = newLoc.id;
      }
    }

    const geofence = await this.geofenceRepo.create(ctx, {
      uuid: uuidv4(),
      location_id: locId,
      geofence_name: input.geofenceName,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radiusMeters,
      ip_address: input.ipAddress || null,
      is_office_location: input.isOfficeLocation ?? true,
      allows_remote_work: input.allowsRemoteWork ?? false,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'GEOFENCE',
      entityId: geofence.id,
      afterState: { geofenceName: input.geofenceName, radius: input.radiusMeters, ipAddress: input.ipAddress },
    });

    return geofence;
  }

  /**
   * Update an existing geofence
   */
  async updateGeofence(ctx: TenantContext, id: number, input: {
    geofenceName?: string;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    ipAddress?: string;
    isOfficeLocation?: boolean;
    allowsRemoteWork?: boolean;
  }): Promise<AttendanceGeofence> {
    const existing = await this.geofenceRepo.getById(ctx, id);
    if (!existing) {
      throw new NotFoundError('Geofence not found');
    }

    const updateData: any = {
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };

    if (input.geofenceName !== undefined) updateData.geofence_name = input.geofenceName;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.radiusMeters !== undefined) updateData.radius_meters = input.radiusMeters;
    if (input.ipAddress !== undefined) updateData.ip_address = input.ipAddress;
    if (input.isOfficeLocation !== undefined) updateData.is_office_location = input.isOfficeLocation;
    if (input.allowsRemoteWork !== undefined) updateData.allows_remote_work = input.allowsRemoteWork;

    const updated = await this.geofenceRepo.update(ctx, id, updateData);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'GEOFENCE',
      entityId: id,
      afterState: updateData,
    });

    return updated;
  }

  /**
   * Delete a geofence
   */
  async deleteGeofence(ctx: TenantContext, id: number): Promise<boolean> {
    const existing = await this.geofenceRepo.getById(ctx, id);
    if (!existing) {
      throw new NotFoundError('Geofence not found');
    }

    await this.geofenceRepo.delete(ctx, id);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'GEOFENCE',
      entityId: id,
    });

    return true;
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
  /**
   * Validate check-in location against 500m office geofence radius
   */
  async validateCheckInLocation(
    ctx: TenantContext,
    employeeId: number,
    latitude: number,
    longitude: number,
    timestamp: string
  ): Promise<{
    valid: boolean;
    message: string;
    distanceMeters: number;
    matchedOffice: { name: string; lat: number; lon: number; radiusMeters: number };
    radiusLimit: number;
    isWithin500m: boolean;
  }> {
    const configuredOffices = [
      { name: 'Arham IT Solution, Ahilyanagar', lat: 19.0948, lon: 74.7480, radiusMeters: 700 },
      { name: 'Kosqu Technolab, Navi Mumbai', lat: 19.0330, lon: 73.0297, radiusMeters: 700 },
    ];

    try {
      // Fetch any dynamic geofences configured in database
      const dbGeofences = await this.geofenceRepo.getOfficeLocations(ctx);
      if (dbGeofences && dbGeofences.length > 0) {
        for (const g of dbGeofences) {
          configuredOffices.push({
            name: g.geofence_name,
            lat: g.latitude,
            lon: g.longitude,
            radiusMeters: g.radius_meters || 700,
          });
        }
      }
    } catch (e) {
      console.warn('[GeoFenceService] dbGeofences fetch warning:', e);
    }

    let minDistance = Number.MAX_VALUE;
    let closestOffice = configuredOffices[0];

    for (const office of configuredOffices) {
      const dist = this.calculateDistance(latitude, longitude, office.lat, office.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closestOffice = office;
      }
    }

    const distanceMeters = Math.round(minDistance);
    const radiusLimit = closestOffice.radiusMeters || 700;
    const isWithinGeofence = distanceMeters <= radiusLimit;

    if (isWithinGeofence) {
      return {
        valid: true,
        isWithin500m: true,
        message: `Within ${radiusLimit}m geofence radius of ${closestOffice.name} (${distanceMeters}m away)`,
        distanceMeters,
        radiusLimit,
        matchedOffice: closestOffice,
      };
    } else {
      return {
        valid: false,
        isWithin500m: false,
        message: `Outside ${radiusLimit}m office geofence radius! Distance to ${closestOffice.name} is ${distanceMeters}m (limit is ${radiusLimit}m).`,
        distanceMeters,
        radiusLimit,
        matchedOffice: closestOffice,
      };
    }
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
