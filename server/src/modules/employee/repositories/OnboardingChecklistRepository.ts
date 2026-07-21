import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface OnboardingChecklist {
  id: number;
  uuid: string;
  organization_id: number;
  checklist_name: string;
  description: string | null;
  applicable_to: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OnboardingChecklistRepository extends BaseRepository<OnboardingChecklist> {
  constructor() {
    super('onboarding_checklists');
  }

  /**
   * Get checklist by name
   */
  async getByName(ctx: TenantContext, name: string): Promise<OnboardingChecklist | null> {
    return this.query(ctx).where('checklist_name', name).first() as Promise<OnboardingChecklist | null>;
  }

  /**
   * Get checklists applicable to employment type
   */
  async getApplicableTo(ctx: TenantContext, employmentType: string, options?: ListQueryOptions) {
    const db = this.query(ctx);
    return db
      .whereRaw('JSON_CONTAINS(applicable_to, ?, "$")', [`"${employmentType}"`])
      .limit(options?.pageSize || 20)
      .select();
  }

  protected getSearchableFields(): string[] {
    return ['checklist_name', 'description'];
  }
}
