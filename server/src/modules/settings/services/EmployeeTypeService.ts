import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { EmployeeTypeRepository } from '../repositories/EmployeeTypeRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';

export interface EmployeeTypeCreate {
  name: string;
  status?: 'active' | 'inactive';
}

export interface EmployeeTypeUpdate {
  name?: string;
  status?: 'active' | 'inactive';
}

export class EmployeeTypeService {
  private employeeTypeRepo: EmployeeTypeRepository;
  private auditService: AuditService;

  constructor() {
    this.employeeTypeRepo = new EmployeeTypeRepository();
    this.auditService = new AuditService();
  }

  async listEmployeeTypes(ctx: TenantContext, options?: any) {
    await this.employeeTypeRepo.ensureTable();
    try {
      return await this.employeeTypeRepo.list(ctx, options);
    } catch (err) {
      console.error('[EmployeeTypeService.listEmployeeTypes] Error:', err);
      return { data: [], items: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  async getEmployeeType(ctx: TenantContext, id: number | string) {
    await this.employeeTypeRepo.ensureTable();
    const employeeType = await this.employeeTypeRepo.getById(ctx, id);
    if (!employeeType) throw new NotFoundError('Employee Type not found');
    return employeeType;
  }

  async createEmployeeType(ctx: TenantContext, data: EmployeeTypeCreate) {
    await this.employeeTypeRepo.ensureTable();
    const name = data.name.trim();
    const isUnique = await this.employeeTypeRepo.isNameUnique(ctx, name);
    if (!isUnique) {
      throw new ConflictError(`Employee type '${name}' already exists`);
    }

    const employeeType = await this.employeeTypeRepo.create(ctx, {
      uuid: uuidv4(),
      name,
      status: data.status || 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE_TYPE',
      entityId: employeeType.id,
      afterState: { name: employeeType.name },
    });

    return employeeType;
  }

  async updateEmployeeType(ctx: TenantContext, id: number | string, data: EmployeeTypeUpdate) {
    const employeeType = await this.getEmployeeType(ctx, id);

    let newName: string | undefined = undefined;
    if (data.name && data.name.trim() && data.name.trim() !== employeeType.name) {
      newName = data.name.trim();
      const isUnique = await this.employeeTypeRepo.isNameUnique(ctx, newName, employeeType.id);
      if (!isUnique) throw new ConflictError(`Employee type '${newName}' already exists`);
    }

    const updated = await this.employeeTypeRepo.update(ctx, id, {
      name: newName || undefined,
      status: data.status || undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'EMPLOYEE_TYPE',
      entityId: employeeType.id,
      beforeState: { name: employeeType.name },
      afterState: { name: updated.name },
    });

    return updated;
  }

  async deleteEmployeeType(ctx: TenantContext, id: number | string) {
    const employeeType = await this.getEmployeeType(ctx, id);
    await this.employeeTypeRepo.hardDelete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'EMPLOYEE_TYPE',
      entityId: employeeType.id,
    });
  }
}
