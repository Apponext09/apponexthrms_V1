import { BaseRepository } from '../../../db/BaseRepository';

export interface Break {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  break_type: 'Manual' | 'Auto';
  biometric_device: string | null;
  max_allow_time: string;
  is_active: 'Yes' | 'No';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class BreakRepository extends BaseRepository<Break> {
  constructor() {
    super('breaks');
    this.companyScoped = false;
  }

  protected getSearchableFields(): string[] {
    return ['name', 'break_type', 'biometric_device'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'name', 'break_type', 'is_active', 'created_at', 'updated_at'];
  }
}
