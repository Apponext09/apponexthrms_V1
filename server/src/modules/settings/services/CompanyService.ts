import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { CompanyRepository } from '../repositories/CompanyRepository';
import type { TenantContext } from '../../../db/types';
import { ConflictError, NotFoundError } from '../../../common/errors/index';

export class CompanyService {
  private companyRepo: CompanyRepository;
  private auditService: AuditService;

  constructor() {
    this.companyRepo = new CompanyRepository();
    this.auditService = new AuditService();
  }

  /**
   * List companies with field-specific search and status filtering.
   * Supports searchField: 'all' | 'name' | 'code'
   * Supports status filter via filters.status
   */
  async listCompanies(ctx: TenantContext, options?: any) {
    return this.companyRepo.list(ctx, options);
  }

  /**
   * Get company by ID
   */
  async getCompany(ctx: TenantContext, id: number | string) {
    const company = await this.companyRepo.getById(ctx, id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return company;
  }

  /**
   * Create new company
   */
  async createCompany(ctx: TenantContext, data: {
    code: string;
    name: string;
    description?: string;
    status?: 'Active' | 'Inactive';
  }) {
    // Validate required fields
    if (!data.code || !data.name) {
      throw new Error('Company code and name are required');
    }

    // Check code uniqueness
    const isUnique = await this.companyRepo.isCodeUnique(ctx, data.code);
    if (!isUnique) {
      throw new ConflictError(`Company code '${data.code}' already exists`);
    }

    const company = await this.companyRepo.create(ctx, {
      uuid: uuidv4(),
      code: data.code,
      name: data.name,
      description: data.description || null,
      status: data.status || 'Active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'COMPANY',
      entityId: company.id,
      afterState: {
        name: company.name,
        code: company.code,
        status: company.status,
      },
    });

    return company;
  }

  /**
   * Update company
   */
  async updateCompany(ctx: TenantContext, id: number | string, data: {
    code?: string;
    name?: string;
    description?: string;
    status?: 'Active' | 'Inactive';
  }) {
    const company = await this.getCompany(ctx, id);

    // Check code uniqueness if code is being updated
    if (data.code && data.code !== company.code) {
      const isUnique = await this.companyRepo.isCodeUnique(ctx, data.code, company.id);
      if (!isUnique) {
        throw new ConflictError(`Company code '${data.code}' already exists`);
      }
    }

    const updated = await this.companyRepo.update(ctx, id, {
      name: data.name || undefined,
      code: data.code || undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status || undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'COMPANY',
      entityId: company.id,
      beforeState: { name: company.name, code: company.code, status: company.status },
      afterState: { name: updated.name, code: updated.code, status: updated.status },
    });

    return updated;
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(ctx: TenantContext, id: number | string) {
    const company = await this.getCompany(ctx, id);

    await this.companyRepo.delete(ctx, id);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'COMPANY',
      entityId: company.id,
      beforeState: { name: company.name, code: company.code },
    });
  }

  /**
   * Restore company
   */
  async restoreCompany(ctx: TenantContext, id: number | string) {
    const company = await this.companyRepo.restore(ctx, id);

    await this.auditService.log(ctx, {
      action: 'RESTORE',
      entityType: 'COMPANY',
      entityId: company.id,
      afterState: { name: company.name, code: company.code },
    });

    return company;
  }
}
