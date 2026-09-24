import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { DepartmentRepository } from '../repositories/DepartmentRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/index';
import type { DepartmentCreate, DepartmentUpdate } from '@apponexthrms/shared/validation/settings.schemas';

export class DepartmentService {
  private deptRepo: DepartmentRepository;
  private auditService: AuditService;

  constructor() {
    this.deptRepo = new DepartmentRepository();
    this.auditService = new AuditService();
  }

  async listDepartments(ctx: TenantContext, options?: any) {
    return this.deptRepo.list(ctx, options);
  }

  async getDepartment(ctx: TenantContext, id: number | string) {
    const dept = await this.deptRepo.getById(ctx, id);
    if (!dept) throw new NotFoundError('Department not found');
    return dept;
  }

  async createDepartment(ctx: TenantContext, data: DepartmentCreate) {
    // Check for circular hierarchy
    if (data.parentDepartmentId) {
      const parent = await this.deptRepo.getById(ctx, data.parentDepartmentId);
      if (!parent) throw new NotFoundError('Parent department not found');
    }

    const isUnique = await this.deptRepo.isCodeUnique(ctx, data.code);
    if (!isUnique) throw new ConflictError(`Department code '${data.code}' already exists`);

    const dept = await this.deptRepo.create(ctx, {
      uuid: uuidv4(),
      name: data.name,
      code: data.code,
      parent_department_id: data.parentDepartmentId || null,
      department_head_id: data.departmentHeadId || null,
      description: data.description || null,
      status: data.status || 'active',
      // Departments created while a company is selected belong to that company.
      // Parent-organization context deliberately remains organization-wide.
      company_id: ctx.companyId || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      afterState: { name: dept.name, code: dept.code },
    });

    return dept;
  }

  async updateDepartment(ctx: TenantContext, id: number | string, data: DepartmentUpdate) {
    const dept = await this.getDepartment(ctx, id);

    if (data.code && data.code !== dept.code) {
      const isUnique = await this.deptRepo.isCodeUnique(ctx, data.code, dept.id);
      if (!isUnique) throw new ConflictError(`Department code '${data.code}' already exists`);
    }

    // Validate parent department if changing
    if (data.parentDepartmentId !== undefined && data.parentDepartmentId && data.parentDepartmentId !== dept.parent_department_id) {
      if (data.parentDepartmentId === dept.id) {
        throw new ValidationError('Cannot set department as its own parent');
      }
      const parent = await this.deptRepo.getById(ctx, data.parentDepartmentId);
      if (!parent) throw new NotFoundError('Parent department not found');
    }

    const updated = await this.deptRepo.update(ctx, id, {
      name: data.name || undefined,
      code: data.code || undefined,
      parent_department_id: data.parentDepartmentId !== undefined ? data.parentDepartmentId : undefined,
      department_head_id: data.departmentHeadId !== undefined ? data.departmentHeadId : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status || undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      beforeState: { name: dept.name },
      afterState: { name: updated.name },
    });

    return updated;
  }

  async deleteDepartment(ctx: TenantContext, id: number | string) {
    const dept = await this.getDepartment(ctx, id);
    await this.deptRepo.delete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
    });
  }

  async restoreDepartment(ctx: TenantContext, id: number | string) {
    const dept = await this.deptRepo.restore(ctx, id);
    await this.auditService.log(ctx, {
      action: 'RESTORE',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
    });
    return dept;
  }

  /**
   * Get department hierarchy
   */
  async getHierarchy(ctx: TenantContext) {
    return this.deptRepo.getHierarchy(ctx);
  }
}
