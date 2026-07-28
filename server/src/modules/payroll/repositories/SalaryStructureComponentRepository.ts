import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface SalaryStructureComponent {
  id: number;
  uuid: string;
  organization_id: number;
  structure_id: number;
  component_id?: number | null;
  sort_order?: number | null;
  employee_id?: number | null;
  annual_ctc?: number | null;
  basic_monthly?: number | null;
  hra_monthly?: number | null;
  special_allowance_monthly?: number | null;
  gross_monthly?: number | null;
  pf_deduction?: number | null;
  esi_deduction?: number | null;
  tds_deduction?: number | null;
  net_take_home?: number | null;
  grade_code?: string | null;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}


export class SalaryStructureComponentRepository extends BaseRepository<SalaryStructureComponent> {
  constructor() {
    super('salary_structure_components');
  }

  async getForStructure(ctx: TenantContext, structureId: number): Promise<SalaryStructureComponent[]> {
    return this.query(ctx)
      .where({ structure_id: structureId })
      .orderBy('sort_order', 'asc');
  }

  async deleteForStructure(ctx: TenantContext, structureId: number): Promise<void> {
    await this.query(ctx)
      .where({ structure_id: structureId })
      .del();
  }
}

