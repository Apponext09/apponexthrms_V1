import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface EmailTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  template_type: 'offer_letter' | 'welcome_email' | 'leave_approval' | 'attendance_alert' | 'custom';
  template_name: string;
  subject: string;
  body_html: string;
  placeholders: string[] | null;
  is_default: boolean;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmailTemplateRepository extends BaseRepository<EmailTemplate> {
  constructor() {
    super('email_templates');
  }

  /**
   * Get template by type and default flag
   */
  async getByTypeAndDefault(ctx: TenantContext, type: string): Promise<EmailTemplate | null> {
    return this.query(ctx)
      .where('template_type', type)
      .where('is_default', true)
      .first() as Promise<EmailTemplate | null>;
  }

  /**
   * Get templates by type
   */
  async getByType(ctx: TenantContext, type: string) {
    return this.query(ctx).where('template_type', type);
  }

  /**
   * Get default templates
   */
  async getDefaults(ctx: TenantContext) {
    return this.query(ctx).where('is_default', true);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['template_name', 'subject', 'template_type'];
  }
}
