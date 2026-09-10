import { BaseRepository } from '../../../db/BaseRepository';

export interface NotificationMergeCode {
  id: number;
  uuid: string;
  organization_id: number;
  module_name: string;
  sub_module_name: string;
  description: string | null;
  is_active: 'Yes' | 'No';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class MergeCodeRepository extends BaseRepository<NotificationMergeCode> {
  constructor() {
    super('notification_merge_codes');
    this.companyScoped = true;
  }

  protected getSearchableFields(): string[] {
    return ['module_name', 'sub_module_name', 'description'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'module_name', 'sub_module_name', 'is_active', 'created_at', 'updated_at'];
  }
}
