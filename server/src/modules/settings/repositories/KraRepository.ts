import { BaseRepository } from '../../../db/BaseRepository';

export interface KraForm {
  id: number;
  uuid: string;
  organization_id: number;
  title: string;
  description: string | null;
  is_active: 'Yes' | 'No';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class KraRepository extends BaseRepository<KraForm> {
  constructor() {
    super('kra_forms');
  }

  protected getSearchableFields(): string[] {
    return ['title', 'description'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'title', 'is_active', 'created_at', 'updated_at'];
  }
}
