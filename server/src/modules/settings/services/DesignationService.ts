import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { DesignationRepository } from '../repositories/DesignationRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';

export interface DesignationCreate {
  name: string;
  code: string;
  description?: string;
  status?: 'active' | 'inactive';
  mapped_companies?: string[];
  mapped_locations?: string[];
  mapped_departments?: string[];
  mapped_shifts?: string[];
  mapped_grades?: string[];
}

export interface DesignationUpdate {
  name?: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive';
  mapped_companies?: string[];
  mapped_locations?: string[];
  mapped_departments?: string[];
  mapped_shifts?: string[];
  mapped_grades?: string[];
}

function generateCodeFromName(name: string): string {
  if (!name) return `DES-${Date.now().toString().slice(-6)}`;
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export class DesignationService {
  private designationRepo: DesignationRepository;
  private auditService: AuditService;

  constructor() {
    this.designationRepo = new DesignationRepository();
    this.auditService = new AuditService();
  }

  async listDesignations(ctx: TenantContext, options?: any) {
    return this.designationRepo.list(ctx, options);
  }

  async getDesignation(ctx: TenantContext, id: number | string) {
    const designation = await this.designationRepo.getById(ctx, id);
    if (!designation) throw new NotFoundError('Designation not found');
    return designation;
  }

  async createDesignation(ctx: TenantContext, data: DesignationCreate) {
    let code = (data.code && data.code.trim()) ? data.code.trim().toUpperCase() : generateCodeFromName(data.name);

    let isUnique = await this.designationRepo.isCodeUnique(ctx, code);
    if (!isUnique) {
      code = `${code}-${Date.now().toString().slice(-4)}`;
    }

    const designation = await this.designationRepo.create(ctx, {
      uuid: uuidv4(),
      name: data.name,
      code,
      description: data.description || null,
      status: data.status || 'active',
      mapped_companies: data.mapped_companies ? JSON.stringify(data.mapped_companies) : null,
      mapped_locations: data.mapped_locations ? JSON.stringify(data.mapped_locations) : null,
      mapped_departments: data.mapped_departments ? JSON.stringify(data.mapped_departments) : null,
      mapped_shifts: data.mapped_shifts ? JSON.stringify(data.mapped_shifts) : null,
      mapped_grades: data.mapped_grades ? JSON.stringify(data.mapped_grades) : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'DESIGNATION',
      entityId: designation.id,
      afterState: { name: designation.name, code: designation.code },
    });

    return designation;
  }

  async updateDesignation(ctx: TenantContext, id: number | string, data: DesignationUpdate) {
    const designation = await this.getDesignation(ctx, id);

    let newCode: string | undefined = undefined;
    if (data.code && data.code.trim() && data.code.trim() !== designation.code) {
      newCode = data.code.trim().toUpperCase();
      const isUnique = await this.designationRepo.isCodeUnique(ctx, newCode, designation.id);
      if (!isUnique) throw new ConflictError(`Designation code '${newCode}' already exists`);
    }

    const updated = await this.designationRepo.update(ctx, id, {
      name: data.name || undefined,
      code: newCode,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status || undefined,
      mapped_companies: data.mapped_companies ? JSON.stringify(data.mapped_companies) : undefined,
      mapped_locations: data.mapped_locations ? JSON.stringify(data.mapped_locations) : undefined,
      mapped_departments: data.mapped_departments ? JSON.stringify(data.mapped_departments) : undefined,
      mapped_shifts: data.mapped_shifts ? JSON.stringify(data.mapped_shifts) : undefined,
      mapped_grades: data.mapped_grades ? JSON.stringify(data.mapped_grades) : undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'DESIGNATION',
      entityId: designation.id,
      beforeState: { name: designation.name },
      afterState: { name: updated.name },
    });

    return updated;
  }

  async deleteDesignation(ctx: TenantContext, id: number | string) {
    const designation = await this.getDesignation(ctx, id);
    await this.designationRepo.delete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'DESIGNATION',
      entityId: designation.id,
    });
  }
}
