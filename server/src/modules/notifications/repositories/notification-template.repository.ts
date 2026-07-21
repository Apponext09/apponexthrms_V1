import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  template_code: string;
  template_name: string;
  template_description?: string;
  category: 'leave_approval' | 'attendance' | 'asset' | 'workflow' | 'payroll' | 'announcement' | 'system';
  channels: string[]; // JSON array
  subject_line?: string;
  body_text: string;
  body_html?: string;
  sms_text?: string;
  whatsapp_template_name?: string;
  variables: string[]; // JSON array
  version_number: number;
  is_published: boolean;
  status: 'draft' | 'published' | 'archived';
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplate> {
  constructor() {
    super('notification_templates');
  }

  /**
   * Get template by code
   */
  async getByCode(ctx: TenantContext, templateCode: string): Promise<NotificationTemplate | null> {
    return this.query(ctx).where('template_code', templateCode).first() as Promise<
      NotificationTemplate | null
    >;
  }

  /**
   * List templates by category
   */
  async listByCategory(
    ctx: TenantContext,
    category: string,
    options: any = {}
  ): Promise<{ items: NotificationTemplate[]; meta: any }> {
    return this.list(ctx, { ...options, filters: { category } });
  }

  /**
   * Get published templates
   */
  async getPublished(ctx: TenantContext): Promise<NotificationTemplate[]> {
    return this.query(ctx)
      .where('is_published', true)
      .where('status', 'published')
      .orderBy('created_at', 'desc');
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['template_code', 'template_name', 'template_description'];
  }
}
