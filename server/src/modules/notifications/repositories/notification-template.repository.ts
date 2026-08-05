import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  template_name: string;
  subject: string;
  email_notification: string;
  is_active: 'Yes' | 'No';
  created_by?: number;
  updated_by?: number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at?: Date | string | null;
}

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplate> {
  constructor() {
    super('notification_templates');
  }

  /**
   * Get template by name
   */
  async getByName(ctx: TenantContext, templateName: string): Promise<NotificationTemplate | null> {
    return this.query(ctx).where('template_name', templateName).first() as Promise<
      NotificationTemplate | null
    >;
  }

  /**
   * Get active templates
   */
  async getActive(ctx: TenantContext): Promise<NotificationTemplate[]> {
    return this.query(ctx)
      .where('is_active', 'Yes')
      .orderBy('created_at', 'desc');
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['template_name', 'subject'];
  }
}
