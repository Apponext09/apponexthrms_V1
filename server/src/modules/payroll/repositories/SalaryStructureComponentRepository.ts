import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface SalaryStructureComponent {
  id: number;
  uuid: string;
  organization_id: number;
  structure_id: number;
  component_id: number;
  sort_order: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export class SalaryStructureComponentRepository extends BaseRepository<SalaryStructureComponent> {
  constructor() {
    super('salary_structure_components');
  }

  async getForStructure(ctx: TenantContext, structureId: number): Promise<SalaryStructureComponent[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, structure_id: structureId })
      .orderBy('sort_order', 'asc');
  }

  async deleteForStructure(ctx: TenantContext, structureId: number): Promise<void> {
    await this.db()
      .where({ organization_id: ctx.organizationId, structure_id: structureId })
      .delete();
  }
}

