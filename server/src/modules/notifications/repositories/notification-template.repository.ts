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
  is_published?: boolean;
  category?: string;
  channels?: string[];
  template_description?: string;
  subject_line?: string;
  body_text?: string;
  body_html?: string;
  sms_text?: string;
  whatsapp_template_name?: string;
  version_number?: number;
  variables?: any;
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
   * Get template by code
   */
  async getByCode(ctx: TenantContext, code: string): Promise<NotificationTemplate | null> {
    return this.query(ctx).where('template_name', code).first() as Promise<
      NotificationTemplate | null
    >;
  }
}
