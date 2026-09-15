import { EmployeeStatusRepository, type EmployeeStatusCreate, type EmployeeStatusUpdate } from '../repositories/EmployeeStatusRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { NotFoundError, ConflictError } from '../../../common/errors';
import crypto from 'crypto';

export class EmployeeStatusService {
  private repo: EmployeeStatusRepository;

  constructor() {
    this.repo = new EmployeeStatusRepository();
  }

  private mapToFrontendFields(data: any): any {
    if (!data) return data;
    return {
      id: String(data.id),
      uuid: data.uuid,
      name: data.name,
      probationStatus: Boolean(data.isProbationStatus ?? data.is_probation_status),
      probationPeriodUnit: data.probationPeriodUnit ?? data.probation_period_unit,
      probationPeriodValue: data.probationPeriodValue ?? data.probation_period_value,
      notifyOnCompletion: Boolean(data.notifyOnCompletion ?? data.notify_on_completion),
      confirmationStatus: Boolean(data.isConfirmationStatus ?? data.is_confirmation_status),
      resignationStatus: Boolean(data.isResignationStatus ?? data.is_resignation_status),
      inactiveOnStatusChange: Boolean(data.inactiveOnStatusChange ?? data.inactive_on_status_change),
      statusColor: data.statusColor ?? data.status_color,
      status: (data.status === 'active' || data.is_active === 1 || data.isActive === true) ? 'active' : 'inactive',
      isActive: data.status === 'active' || data.is_active === 1 || data.isActive === true,
      createdAt: data.createdAt ?? data.created_at,
      updatedAt: data.updatedAt ?? data.updated_at
    };
  }

  async listEmployeeStatuses(ctx: TenantContext, options: ListQueryOptions) {
    await this.repo.ensureTable();
    try {
      const res = await this.repo.list(ctx, options);
      // BaseRepository list returns { items, meta }
      if (res && res.items) {
        return {
          ...res,
          items: res.items.map((item: any) => this.mapToFrontendFields(item)),
          data: res.items.map((item: any) => this.mapToFrontendFields(item)) // Return data as well for compatibility
        };
      } else if (Array.isArray(res)) {
        const data = res.map(item => this.mapToFrontendFields(item));
        return { data, items: data };
      }
      return res;
    } catch (err) {
      console.error('[EmployeeStatusService.listEmployeeStatuses] Error:', err);
      return { data: [], items: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  async getEmployeeStatus(ctx: TenantContext, id: number | string) {
    await this.repo.ensureTable();
    const status = await this.repo.getById(ctx, id);
    if (!status) throw new NotFoundError('Employee Status not found');
    return this.mapToFrontendFields(status);
  }

  private mapToDbFields(data: any): EmployeeStatusCreate {
    const mapped: any = {
      name: data.name,
    };
    
    if (data.companyId !== undefined || data.company_id !== undefined) mapped.company_id = data.companyId ?? data.company_id;
    if (data.probationStatus !== undefined || data.is_probation_status !== undefined) mapped.is_probation_status = data.probationStatus ?? data.is_probation_status;
    if (data.probationPeriodValue !== undefined || data.probation_period_value !== undefined) mapped.probation_period_value = data.probationPeriodValue ?? data.probation_period_value;
    if (data.probationPeriodUnit !== undefined || data.probation_period_unit !== undefined) mapped.probation_period_unit = data.probationPeriodUnit ?? data.probation_period_unit;
    if (data.notifyOnCompletion !== undefined || data.notify_on_completion !== undefined) mapped.notify_on_completion = data.notifyOnCompletion ?? data.notify_on_completion;
    if (data.confirmationStatus !== undefined || data.is_confirmation_status !== undefined) mapped.is_confirmation_status = data.confirmationStatus ?? data.is_confirmation_status;
    if (data.resignationStatus !== undefined || data.is_resignation_status !== undefined) mapped.is_resignation_status = data.resignationStatus ?? data.is_resignation_status;
    if (data.inactiveOnStatusChange !== undefined || data.inactive_on_status_change !== undefined) mapped.inactive_on_status_change = data.inactiveOnStatusChange ?? data.inactive_on_status_change;
    if (data.statusColor !== undefined || data.status_color !== undefined) mapped.status_color = data.statusColor ?? data.status_color;
    
    if (data.isActive !== undefined) {
      mapped.status = data.isActive ? 'active' : 'inactive';
    } else if (data.status !== undefined) {
      mapped.status = data.status;
    }

    return mapped as EmployeeStatusCreate;
  }

  async createEmployeeStatus(ctx: TenantContext, data: any) {
    await this.repo.ensureTable();
    const isUnique = await this.repo.isNameUnique(ctx, data.name);
    if (!isUnique) throw new ConflictError(`Employee status '${data.name}' already exists`);

    const mappedData = this.mapToDbFields(data);
    const newRecord = await this.repo.create(ctx, { 
      ...mappedData, 
      uuid: crypto.randomUUID(),
      created_by: ctx.userId 
    });
    return this.mapToFrontendFields(newRecord);
  }

  async updateEmployeeStatus(ctx: TenantContext, id: number | string, data: any) {
    await this.repo.ensureTable();
    const existing = await this.repo.getById(ctx, id);
    if (!existing) throw new NotFoundError('Employee Status not found');

    if (data.name && data.name !== existing.name) {
      const isUnique = await this.repo.isNameUnique(ctx, data.name, existing.id);
      if (!isUnique) throw new ConflictError(`Employee status '${data.name}' already exists`);
    }

    const mappedData = this.mapToDbFields(data);
    const updatedData = { ...mappedData, updated_by: ctx.userId };
    const updatedRecord = await this.repo.update(ctx, id, updatedData);
    return this.mapToFrontendFields(updatedRecord);
  }

  async deleteEmployeeStatus(ctx: TenantContext, id: number | string) {
    await this.repo.ensureTable();
    await this.getEmployeeStatus(ctx, id);
    
    // We are performing a HARD DELETE from the database directly as requested by the user.
    await this.repo.hardDelete(ctx, id);

    return { success: true };
  }
}
