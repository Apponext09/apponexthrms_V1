import { BaseRepository } from '../../../db/BaseRepository';

export interface NotificationTemplateItem {
  id: number;
  uuid: string;
  organization_id: number;
  template_name: string;
  subject: string;
  email_notification: string;
  is_active: 'Yes' | 'No';
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class NotificationTemplateSettingsRepository extends BaseRepository<NotificationTemplateItem> {
  constructor() {
    super('notification_templates');
  }

  protected getSearchableFields(): string[] {
    return ['template_name', 'subject'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'template_name', 'is_active', 'created_at', 'updated_at'];
  }
}
