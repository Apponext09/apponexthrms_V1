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
  /**
   * Validate check-in/out location against employee's assigned geofence locations and radius limits (e.g. 500m, 300m)
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
    matchedOffice: { id?: number; name: string; lat: number; lon: number; radiusMeters: number };
    radiusLimit: number;
    isWithin500m: boolean;
    geofenceId?: number;
    locationId?: number;
    locationName?: string;
  }> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // 1. Fetch employee's assigned attendance location access records from DB
    const empMappings = await db('employee_attendance_locations')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId);

    // 2. Fetch active geofences configured by admin for organization
    const activeGeofences = await db('attendance_geofences')
      .leftJoin('attendance_locations', 'attendance_geofences.location_id', 'attendance_locations.id')
      .where('attendance_geofences.organization_id', ctx.organizationId)
      .whereNull('attendance_geofences.deleted_at')
      .select(
        'attendance_geofences.*',
        'attendance_locations.location_name'
      );

    // Check if WFH/Remote punch or field punch is explicitly allowed for this employee
    const allowRemote = empMappings.length > 0 ? Boolean(empMappings[0].allowRemotePunch ?? empMappings[0].allow_remote_punch) : false;
    const allowField = empMappings.length > 0 ? Boolean(empMappings[0].allowFieldPunch ?? empMappings[0].allow_field_punch) : false;

    // Filter permitted geofences for this specific employee
    let targetGeofences = activeGeofences;
    if (empMappings.length > 0) {
      const assignedGeoIds = empMappings.map((m: any) => Number(m.geofenceId || m.geofence_id));
      const filtered = activeGeofences.filter((g: any) => assignedGeoIds.includes(Number(g.id)));
      if (filtered.length > 0) {
        targetGeofences = filtered;
      }
    }

    if (targetGeofences.length === 0) {
      if (allowRemote || allowField) {
        return {
          valid: true,
          isWithin500m: true,
          message: 'Remote / Field punch enabled for employee.',
          distanceMeters: 0,
          radiusLimit: 0,
          locationName: 'Remote / Field Location',
          matchedOffice: { name: 'Remote / Field Location', lat: latitude, lon: longitude, radiusMeters: 0 },
        };
      }

      return {
        valid: false,
        isWithin500m: false,
        message: 'No active office geofence locations assigned to employee.',
        distanceMeters: 99999,
        radiusLimit: 0,
        matchedOffice: { name: 'None', lat: 0, lon: 0, radiusMeters: 0 },
      };
    }

    // Find closest permitted geofence
    let minDistance = Number.MAX_VALUE;
    let closestGeofence = targetGeofences[0];

    for (const geo of targetGeofences) {
      const geoLat = Number(geo.latitude);
      const geoLon = Number(geo.longitude);
      const dist = this.calculateDistance(latitude, longitude, geoLat, geoLon);
      if (dist < minDistance) {
        minDistance = dist;
        closestGeofence = geo;
      }
    }

    const distanceMeters = Math.round(minDistance);
    const radiusLimit = Number(closestGeofence.radiusMeters || closestGeofence.radius_meters || 500);
    const isWithinRadius = distanceMeters <= radiusLimit;

    const locName = closestGeofence.geofenceName || closestGeofence.geofence_name || closestGeofence.locationName || closestGeofence.location_name || `Office Branch ${closestGeofence.id}`;
    const locId = Number(closestGeofence.locationId || closestGeofence.location_id || closestGeofence.id);
    const geoId = Number(closestGeofence.id);

    if (isWithinRadius) {
      return {
        valid: true,
        isWithin500m: true,
        message: `Within ${radiusLimit}m geofence radius of ${locName} (${distanceMeters}m away)`,
        distanceMeters,
        radiusLimit,
        geofenceId: geoId,
        locationId: locId,
        locationName: locName,
        matchedOffice: {
          id: geoId,
          name: locName,
          lat: Number(closestGeofence.latitude),
          lon: Number(closestGeofence.longitude),
          radiusMeters: radiusLimit,
        },
      };
    } else if (allowRemote || allowField) {
      return {
        valid: true,
        isWithin500m: false,
        message: `Field/Remote punch permitted (${distanceMeters}m from nearest branch ${locName})`,
        distanceMeters,
        radiusLimit,
        geofenceId: geoId,
        locationId: locId,
        locationName: `${locName} (Remote)`,
        matchedOffice: {
          id: geoId,
          name: `${locName} (Remote)`,
          lat: Number(closestGeofence.latitude),
          lon: Number(closestGeofence.longitude),
          radiusMeters: radiusLimit,
        },
      };
    } else {
      return {
        valid: false,
        isWithin500m: false,
        message: `Outside permitted ${radiusLimit}m geofence radius! Distance to ${locName} is ${distanceMeters}m (limit is ${radiusLimit}m).`,
        distanceMeters,
        radiusLimit,
        geofenceId: geoId,
        locationId: locId,
        locationName: locName,
        matchedOffice: {
          id: geoId,
          name: locName,
          lat: Number(closestGeofence.latitude),
          lon: Number(closestGeofence.longitude),
          radiusMeters: radiusLimit,
        },
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

  /**
   * Get employee attendance location mapping list from DB
   */
  async getEmployeeLocationAccessList(ctx: TenantContext) {
    const { db } = await import('../../../db/knex');

    // 1. Fetch real geofences/locations configured by admin
    const geofences = await db('attendance_geofences')
      .leftJoin('attendance_locations', 'attendance_geofences.location_id', 'attendance_locations.id')
      .where('attendance_geofences.organization_id', ctx.organizationId)
      .whereNull('attendance_geofences.deleted_at')
      .select(
        'attendance_geofences.*',
        'attendance_locations.location_name',
        'attendance_locations.location_code'
      );

    // 2. Fetch employees with department & designation & reporting manager
    const employees = await db('employees')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .leftJoin('designations', 'employees.current_designation_id', 'designations.id')
      .leftJoin('employees as mgr', 'employees.reporting_manager_id', 'mgr.id')
      .leftJoin('users', 'employees.email', 'users.email')
      .where('employees.organization_id', ctx.organizationId)
      .whereNull('employees.deleted_at')
      .select(
        'employees.id',
        'employees.employee_code',
        'employees.first_name',
        'employees.last_name',
        'employees.email',
        'employees.avatar_url',
        'users.avatar_url as user_avatar_url',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'employees.current_location_id',
        'departments.name as department_name',
        'designations.name as designation_name',
        'mgr.first_name as mgr_first_name',
        'mgr.last_name as mgr_last_name'
      );

    // 3. Fetch employee attendance location mappings
    const mappings = await db('employee_attendance_locations')
      .where('organization_id', ctx.organizationId);

    // Map employee to assigned geofences
    const employeeMap = employees.map((emp: any) => {
      const empId = emp.id;
      const empMappings = mappings.filter((m: any) => Number(m.employeeId || m.employee_id) === Number(empId));
      const assignedLocationIds = empMappings.map((m: any) => String(m.geofenceId || m.geofence_id));
      const primaryMapping = empMappings.find((m: any) => m.isPrimary || m.is_primary) || empMappings[0];

      const firstGeoId = geofences.length > 0 ? String(geofences[0].id) : '1';
      const primaryLocId = primaryMapping
        ? String(primaryMapping.geofenceId || primaryMapping.geofence_id)
        : (emp.currentLocationId || emp.current_location_id ? String(emp.currentLocationId || emp.current_location_id) : firstGeoId);

      // Fallback: if no custom mappings assigned yet, default to first available admin geofence
      const finalAssignedLocIds = assignedLocationIds.length > 0
        ? assignedLocationIds
        : (geofences.length > 0 ? [primaryLocId] : []);

      const allowRemote = empMappings.length > 0 ? Boolean(empMappings[0].allowRemotePunch ?? empMappings[0].allow_remote_punch) : true;
      const allowField = empMappings.length > 0 ? Boolean(empMappings[0].allowFieldPunch ?? empMappings[0].allow_field_punch) : false;
      const notes = empMappings.length > 0 ? (empMappings[0].notes || '') : '';

      const rawFn = emp.firstName || emp.first_name || emp.userFirstName || emp.user_first_name;
      const rawLn = emp.lastName || emp.last_name || emp.userLastName || emp.user_last_name;
      const fn = rawFn || (emp.email ? emp.email.split('@')[0] : `Employee ${empId}`);
      const ln = rawLn || '';
      const avatar = emp.avatarUrl || emp.avatar_url || emp.userAvatarUrl || emp.user_avatar_url || undefined;
      const mgrFn = emp.mgrFirstName || emp.mgr_first_name;
      const mgrLn = emp.mgrLastName || emp.mgr_last_name;
      const mgrName = mgrFn
        ? `${mgrFn} ${mgrLn || ''}`.trim()
        : 'Department Head';
      const deptName = emp.departmentName || emp.department_name || 'General';
      const desigName = emp.designationName || emp.designation_name || 'Employee';
      const code = emp.employeeCode || emp.employee_code || `EMP-${empId}`;

      return {
        id: String(empId),
        employeeId: String(empId),
        employeeCode: code,
        firstName: fn,
        lastName: ln,
        email: emp.email || '',
        avatarUrl: avatar,
        department: deptName,
        designation: desigName,
        reportingManager: mgrName,
        primaryLocationId: primaryLocId,
        assignedLocationIds: finalAssignedLocIds,
        allowRemotePunch: allowRemote,
        allowFieldPunch: allowField,
        notes: notes || undefined,
        updatedAt: empMappings.length > 0 ? (empMappings[0].updatedAt || empMappings[0].updated_at) : new Date().toISOString(),
      };
    });

    // Formatted geofence locations for frontend dropdowns (Real location names!)
    const formattedAdminLocations = geofences.map((g: any) => {
      const radius = g.radiusMeters || g.radius_meters || 500;
      const realName = g.geofenceName || g.geofence_name || g.locationName || g.location_name || `Location ${g.id}`;
      const realCode = g.locationCode || g.location_code || `LOC-${g.id}`;
      const isOffice = Boolean(g.isOfficeLocation || g.is_office_location);
      return {
        id: String(g.id),
        name: realName,
        code: realCode,
        city: isOffice ? 'Office Branch' : 'Client Site',
        address: `Geofence Radius: ${radius}m${g.ipAddress || g.ip_address ? ` • IP: ${g.ipAddress || g.ip_address}` : ''}`,
        latitude: Number(g.latitude || 0),
        longitude: Number(g.longitude || 0),
        radiusMeters: Number(radius),
        type: isOffice ? 'head_office' : 'client_site',
        isActive: true,
        ipAddress: g.ipAddress || g.ip_address || undefined,
      };
    });

    return {
      employees: employeeMap,
      adminLocations: formattedAdminLocations,
    };
  }

  /**
   * Assign permitted attendance geofences to an employee
   */
  async assignEmployeeLocations(ctx: TenantContext, input: {
    employeeId: number;
    assignedLocationIds: string[];
    primaryLocationId?: string;
    allowRemotePunch?: boolean;
    allowFieldPunch?: boolean;
    notes?: string;
  }) {
    const { db } = await import('../../../db/knex');
    const { employeeId, assignedLocationIds, primaryLocationId, allowRemotePunch, allowFieldPunch, notes } = input;

    await db.transaction(async (trx) => {
      // Remove existing mapping for this employee
      await trx('employee_attendance_locations')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .delete();

      // Insert new mappings
      const rowsToInsert = assignedLocationIds.map((geoId) => ({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        geofence_id: Number(geoId),
        is_primary: String(geoId) === String(primaryLocationId || assignedLocationIds[0]),
        allow_remote_punch: allowRemotePunch ?? false,
        allow_field_punch: allowFieldPunch ?? false,
        notes: notes || null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      if (rowsToInsert.length > 0) {
        await trx('employee_attendance_locations').insert(rowsToInsert);
      }
    });

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE_ATTENDANCE_LOCATION',
      entityId: employeeId,
      afterState: input,
    });

    return { success: true };
  }

  /**
   * Bulk assign permitted attendance geofences to multiple employees
   */
  async bulkAssignEmployeeLocations(ctx: TenantContext, input: {
    employeeIds: string[];
    assignedLocationIds: string[];
    overwriteMode?: boolean;
  }) {
    const { db } = await import('../../../db/knex');
    const { employeeIds, assignedLocationIds, overwriteMode } = input;

    for (const empIdStr of employeeIds) {
      const empId = Number(empIdStr);
      if (!empId) continue;

      let finalGeoIds = assignedLocationIds;
      if (!overwriteMode) {
        const existing = await db('employee_attendance_locations')
          .where('organization_id', ctx.organizationId)
          .where('employee_id', empId)
          .select('geofence_id');
        const existingGeoIds = existing.map((r: any) => String(r.geofence_id));
        finalGeoIds = Array.from(new Set([...existingGeoIds, ...assignedLocationIds]));
      }

      await this.assignEmployeeLocations(ctx, {
        employeeId: empId,
        assignedLocationIds: finalGeoIds,
      });
    }

    return { success: true };
  }

  /**
   * Get permitted punch locations for the logged-in employee (Strictly assigned by HR!)
   */
  async getMyPermittedLocations(ctx: TenantContext, employeeId: number) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // 1. Query employee_attendance_locations for this employee
    const mappings = await db('employee_attendance_locations')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId);

    // 2. Query active geofences configured by admin
    const geofences = await db('attendance_geofences')
      .leftJoin('attendance_locations', 'attendance_geofences.location_id', 'attendance_locations.id')
      .where('attendance_geofences.organization_id', ctx.organizationId)
      .whereNull('attendance_geofences.deleted_at')
      .select(
        'attendance_geofences.*',
        'attendance_locations.location_name',
        'attendance_locations.location_code'
      );

    const allowRemote = mappings.length > 0 ? Boolean(mappings[0].allowRemotePunch ?? mappings[0].allow_remote_punch) : false;
    const allowField = mappings.length > 0 ? Boolean(mappings[0].allowFieldPunch ?? mappings[0].allow_field_punch) : false;

    // Filter permitted geofences for this employee
    let permitted = [];
    if (mappings.length > 0) {
      const assignedGeoIds = mappings.map((m: any) => Number(m.geofenceId || m.geofence_id));
      permitted = geofences.filter((g: any) => {
        const geoId = Number(g.id);
        const locId = Number(g.location_id || g.locationId);
        return assignedGeoIds.includes(geoId) || assignedGeoIds.includes(locId);
      });
    }

    // Fallback: If HR hasn't explicitly assigned any locations yet, default ONLY to primary office location
    if (permitted.length === 0) {
      const empRow = await db('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', employeeId)
        .first();

      const empLocId = empRow ? (empRow.current_location_id || empRow.currentLocationId) : null;
      if (empLocId) {
        permitted = geofences.filter((g: any) => Number(g.id) === Number(empLocId) || Number(g.location_id) === Number(empLocId));
      }

      if (permitted.length === 0 && geofences.length > 0) {
        const primaryOffice = geofences.find((g: any) => Boolean(g.is_office_location || g.isOfficeLocation)) || geofences[0];
        permitted = [primaryOffice];
      }
    }

    const locations = permitted.map((g: any) => {
      const radius = g.radiusMeters || g.radius_meters || 500;
      const realName = g.geofenceName || g.geofence_name || g.locationName || g.location_name || `Location ${g.id}`;
      const realCode = g.locationCode || g.location_code || `LOC-${g.id}`;
      const isPrimary = mappings.some((m: any) => Number(m.geofenceId || m.geofence_id) === Number(g.id) && Boolean(m.isPrimary || m.is_primary));

      return {
        id: String(g.id),
        locationId: Number(g.locationId || g.location_id || g.id),
        name: realName,
        code: realCode,
        radiusMeters: Number(radius),
        latitude: Number(g.latitude),
        longitude: Number(g.longitude),
        isPrimary,
        isOffice: Boolean(g.isOfficeLocation || g.is_office_location),
      };
    });

    return {
      locations,
      allowRemote,
      allowField,
    };
  }
}
