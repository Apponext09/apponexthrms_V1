import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ShiftRotation {
  id: number;
  uuid: string;
  organization_id: number;
  rotation_name: string;
  rotation_pattern: number[]; // array of shift_ids
  rotation_duration_days: number;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ShiftRotationRepository extends BaseRepository<ShiftRotation> {
  constructor() {
    super('shift_rotations');
  }

  async getByName(ctx: TenantContext, name: string): Promise<ShiftRotation | null> {
    return this.query(ctx).where('rotation_name', name).first() as Promise<ShiftRotation | null>;
  }

  protected getSearchableFields(): string[] {
    return ['rotation_name', 'description'];
  }
}
