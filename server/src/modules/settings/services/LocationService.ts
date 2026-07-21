import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { LocationRepository } from '../repositories/LocationRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';
import type { LocationCreate, LocationUpdate } from '@apponexthrms/shared/validation/settings.schemas';

export class LocationService {
  private locationRepo: LocationRepository;
  private auditService: AuditService;

  constructor() {
    this.locationRepo = new LocationRepository();
    this.auditService = new AuditService();
  }

  async listLocations(ctx: TenantContext, options?: any) {
    return this.locationRepo.list(ctx, options);
  }

  async getLocation(ctx: TenantContext, id: number | string) {
    const location = await this.locationRepo.getById(ctx, id);
    if (!location) throw new NotFoundError('Location not found');
    return location;
  }

  async createLocation(ctx: TenantContext, data: LocationCreate) {
    const isUnique = await this.locationRepo.isCodeUnique(ctx, data.code);
    if (!isUnique) throw new ConflictError(`Location code '${data.code}' already exists`);

    const location = await this.locationRepo.create(ctx, {
      uuid: uuidv4(),
      name: data.name,
      code: data.code,
      type: data.type || 'office',
      branch_id: data.branchId || null,
      address_line1: data.addressLine1 || null,
      address_line2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postal_code: data.postalCode || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      geofence_radius_m: data.geofenceRadiusM || null,
      timezone: data.timezone || 'UTC',
      status: data.status || 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'LOCATION',
      entityId: location.id,
      afterState: { name: location.name, code: location.code },
    });

    return location;
  }

  async updateLocation(ctx: TenantContext, id: number | string, data: LocationUpdate) {
    const location = await this.getLocation(ctx, id);

    if (data.code && data.code !== location.code) {
      const isUnique = await this.locationRepo.isCodeUnique(ctx, data.code, location.id);
      if (!isUnique) throw new ConflictError(`Location code '${data.code}' already exists`);
    }

    const updated = await this.locationRepo.update(ctx, id, {
      name: data.name || undefined,
      code: data.code || undefined,
      type: data.type || undefined,
      branch_id: data.branchId !== undefined ? data.branchId : undefined,
      address_line1: data.addressLine1 !== undefined ? data.addressLine1 : undefined,
      address_line2: data.addressLine2 !== undefined ? data.addressLine2 : undefined,
      city: data.city !== undefined ? data.city : undefined,
      state: data.state !== undefined ? data.state : undefined,
      country: data.country !== undefined ? data.country : undefined,
      postal_code: data.postalCode !== undefined ? data.postalCode : undefined,
      latitude: data.latitude !== undefined ? data.latitude : undefined,
      longitude: data.longitude !== undefined ? data.longitude : undefined,
      geofence_radius_m: data.geofenceRadiusM !== undefined ? data.geofenceRadiusM : undefined,
      timezone: data.timezone || undefined,
      status: data.status || undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'LOCATION',
      entityId: location.id,
      beforeState: { name: location.name },
      afterState: { name: updated.name },
    });

    return updated;
  }

  async deleteLocation(ctx: TenantContext, id: number | string) {
    const location = await this.getLocation(ctx, id);
    await this.locationRepo.delete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'LOCATION',
      entityId: location.id,
      beforeState: { name: location.name },
    });
  }

  async restoreLocation(ctx: TenantContext, id: number | string) {
    const location = await this.locationRepo.restore(ctx, id);
    await this.auditService.log(ctx, {
      action: 'RESTORE',
      entityType: 'LOCATION',
      entityId: location.id,
      afterState: { name: location.name },
    });
    return location;
  }
}
