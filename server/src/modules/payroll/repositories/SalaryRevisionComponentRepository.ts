import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface SalaryRevisionComponent {
  id: number;
  uuid: string;
  organization_id: number;
  revision_id: number;
  component_id: number;
  old_value: number;
  new_value: number;
  created_at: string;
}

export class SalaryRevisionComponentRepository extends BaseRepository<SalaryRevisionComponent> {
  constructor() {
    super('salary_revision_components');
  }

  async getForRevision(ctx: TenantContext, revisionId: number): Promise<SalaryRevisionComponent[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, revision_id: revisionId });
  }
}

