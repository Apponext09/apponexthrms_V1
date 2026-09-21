import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { LocationRepository } from '../repositories/LocationRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';
import { getKnex } from '../../../db/knex';
import { assertMasterNotInUse } from '../utils/masterUsage';

/**
 * Auto-generate a location code from the location name.
 * e.g. "Airoli Office" → "AIROLI-OFFICE"
 */
function generateCodeFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

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

  /**
   * Fetch all companies for the Company accordion in the Location form.
   * TODO: Once a dedicated 'companies' table is created, query that table.
   * For now, returns organizations as companies (graceful fallback).
   */
  async listCompanies(ctx: TenantContext) {
    const db = getKnex();
    try {
      // Try companies table first (future)
      const hasCompaniesTable = await db.schema.hasTable('companies');
      if (hasCompaniesTable) {
        return db('companies')
          .where('organization_id', ctx.organizationId)
          .select('id', 'name', 'code')
          .orderBy('name', 'asc');
      }
    } catch (_) {
      // Table doesn't exist yet
    }

    // Fallback: return the organization itself as a company option
    try {
      const org = await db('organizations')
        .where('id', ctx.organizationId)
        .first('id', 'name');
      return org ? [{ id: org.id, name: org.name }] : [];
    } catch (_) {
      return [];
    }
  }

  async createLocation(ctx: TenantContext, data: Record<string, any>) {
    const locationName = data.locationName || data.location_name || data.name || 'New Location';
    const autoCode = generateCodeFromName(locationName);

    // Ensure code uniqueness — append a short suffix if conflict
    let code = autoCode;
    let attempt = 0;
    while (!(await this.locationRepo.isCodeUnique(ctx, code))) {
      attempt++;
      code = `${autoCode}-${attempt}`;
    }

    const db = getKnex();
    let validUserId = ctx.userId ? Number(ctx.userId) : null;
    if (!validUserId) {
      const firstUser = await db('users').where('organization_id', ctx.organizationId).first('id').catch(() => null);
      validUserId = firstUser ? Number(firstUser.id) : 1;
    }

    // Resolve company_id: check companies table, then branches, then trust the provided value
    let companyId: number | null = data.companyId ? parseInt(data.companyId, 10) : null;
    if (companyId) {
      const hasCompaniesTable = await db.schema.hasTable('companies').catch(() => false);
      if (hasCompaniesTable) {
        const compExists = await db('companies').where('id', companyId).first('id').catch(() => null);
        if (!compExists) {
          // Fallback: check branches table
          const branchExists = await db('branches').where('id', companyId).first('id').catch(() => null);
          if (!branchExists) {
            // Neither table confirms this ID; keep it anyway (trust frontend) unless it's completely invalid
            // Only null it out if it's not a valid positive integer
            if (isNaN(companyId) || companyId <= 0) companyId = null;
          }
        }
      } else {
        // No companies table — try branches only
        const branchExists = await db('branches').where('id', companyId).first('id').catch(() => null);
        if (!branchExists) {
          // Keep the ID as-is (trust frontend)
          if (isNaN(companyId) || companyId <= 0) companyId = null;
        }
      }
    }

    const location = await this.locationRepo.create(ctx, {
      uuid: uuidv4(),
      // Backward-compat fields
      name: locationName,
      code,
      status: data.isActive === 'No' ? 'inactive' : 'active',
      // New master fields
      location_name: locationName,
      office_type: data.officeType || null,
      address_line1: data.addressLine1 || null,
      address_line2: data.addressLine2 || null,
      city: data.city || null,
      district: data.district || null,
      state: data.state || null,
      country: data.country || null,
      zip_code: data.zipCode || null,
      postal_area: data.postalArea || null,
      postal_code: data.zipCode || null, // kept for compat
      default_currency_format: data.currencyFormat || null,
      location_mail: data.locationMail || null,
      contact_name: data.contactName || null,
      contact_number: data.contactNumber || null,
      company_id: companyId,
      is_active: data.isActive === 'No' ? 'No' : 'Yes',
      created_by: validUserId,
      updated_by: validUserId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'LOCATION',
      entityId: location.id,
      afterState: { name: location.name, code: location.code, office_type: location.office_type },
    });

    return location;
  }

  async updateLocation(ctx: TenantContext, id: number | string, data: Record<string, any>) {
    const location = await this.getLocation(ctx, id);

    const locationName = data.locationName || data.location_name;
    let newCode: string | undefined;

    if (locationName && locationName !== location.location_name) {
      const autoCode = generateCodeFromName(locationName);
      let code = autoCode;
      let attempt = 0;
      while (!(await this.locationRepo.isCodeUnique(ctx, code, location.id))) {
        attempt++;
        code = `${autoCode}-${attempt}`;
      }
      newCode = code;
    }

    const updated = await this.locationRepo.update(ctx, id, {
      ...(locationName ? { name: locationName, location_name: locationName } : {}),
      ...(newCode ? { code: newCode } : {}),
      ...(data.officeType !== undefined ? { office_type: data.officeType } : {}),
      ...(data.addressLine1 !== undefined ? { address_line1: data.addressLine1 } : {}),
      ...(data.addressLine2 !== undefined ? { address_line2: data.addressLine2 } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.district !== undefined ? { district: data.district } : {}),
      ...(data.state !== undefined ? { state: data.state } : {}),
      ...(data.country !== undefined ? { country: data.country } : {}),
      ...(data.zipCode !== undefined ? { zip_code: data.zipCode, postal_code: data.zipCode } : {}),
      ...(data.postalArea !== undefined ? { postal_area: data.postalArea } : {}),
      ...(data.currencyFormat !== undefined ? { default_currency_format: data.currencyFormat } : {}),
      ...(data.locationMail !== undefined ? { location_mail: data.locationMail } : {}),
      ...(data.contactName !== undefined ? { contact_name: data.contactName } : {}),
      ...(data.contactNumber !== undefined ? { contact_number: data.contactNumber } : {}),
      ...(data.companyId !== undefined ? {
        company_id: await (async () => {
          const cid = data.companyId ? parseInt(data.companyId, 10) : null;
          if (!cid || isNaN(cid) || cid <= 0) return null;
          const db = getKnex();
          const hasCompaniesTable = await db.schema.hasTable('companies').catch(() => false);
          if (hasCompaniesTable) {
            const compExists = await db('companies').where('id', cid).first('id').catch(() => null);
            if (compExists) return cid;
          }
          // Try branches fallback
          const branchExists = await db('branches').where('id', cid).first('id').catch(() => null);
          if (branchExists) return cid;
          // Trust the frontend-provided ID as-is
          return cid;
        })()
      } : {}),
      ...(data.isActive !== undefined ? {
        is_active: data.isActive === 'No' ? 'No' : 'Yes',
        status: data.isActive === 'No' ? 'inactive' : 'active',
      } : {}),
      updated_by: ctx.userId || 1,
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
    await assertMasterNotInUse(ctx.organizationId, id, 'location', [
      { table: 'employees', column: 'current_location_id', label: 'employee(s)' },
    ]);
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
