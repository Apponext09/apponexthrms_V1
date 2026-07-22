import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface SalaryStructure {
  id: number;
  uuid: string;
  organization_id: number;
  structure_name: string;
  structure_code: string;
  description: string | null;
  applicable_to_designation_id: number | null;
  applicable_to_location_id: number | null;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SalaryStructureRepository extends BaseRepository<SalaryStructure> {
  constructor() {
    super('salary_structures');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<SalaryStructure | null> {
    return this.query(ctx)
      .where({ structure_code: code })
      .first();
  }

  async listActive(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    const listResult = await this.list(ctx, {
      ...options,
      filters: { status: 'active' }
    });
    return listResult.items;
  }

  async getForDesignation(ctx: TenantContext, designationId: number): Promise<SalaryStructure | null> {
    return this.query(ctx)
      .where({ applicable_to_designation_id: designationId, status: 'active' })
      .first();
  }

  async getForLocation(ctx: TenantContext, locationId: number): Promise<SalaryStructure | null> {
    return this.query(ctx)
      .where({ applicable_to_location_id: locationId, status: 'active' })
      .first();
  }
}

