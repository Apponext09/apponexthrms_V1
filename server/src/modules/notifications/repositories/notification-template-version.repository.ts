import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface NotificationTemplateVersion {
  id: number;
  uuid: string;
  organization_id: number;
  template_id: number;
  version_number: number;
  body_text: string;
  body_html?: string;
  sms_text?: string;
  variables: string[];
  published_by?: number;
  published_at?: Date;
  created_at: Date;
}

export class NotificationTemplateVersionRepository extends BaseRepository<NotificationTemplateVersion> {
  constructor() {
    super('notification_template_versions');
  }

  /**
   * Get versions for template
   */
  async getByTemplateId(ctx: TenantContext, templateId: number): Promise<NotificationTemplateVersion[]> {
    return this.query(ctx).where('template_id', templateId).orderBy('version_number', 'desc');
  }

  /**
   * Get specific version
   */
  async getVersion(
    ctx: TenantContext,
    templateId: number,
    versionNumber: number
  ): Promise<NotificationTemplateVersion | null> {
    return this.query(ctx)
      .where('template_id', templateId)
      .where('version_number', versionNumber)
      .first() as Promise<NotificationTemplateVersion | null>;
  }

  /**
   * Get latest published version
   */
  async getLatestPublished(ctx: TenantContext, templateId: number): Promise<NotificationTemplateVersion | null> {
    return this.query(ctx)
      .where('template_id', templateId)
      .whereNotNull('published_at')
      .orderBy('version_number', 'desc')
      .first() as Promise<NotificationTemplateVersion | null>;
  }

  /**
   * Get searchable fields - empty for version table
   */
  protected getSearchableFields(): string[] {
    return [];
  }
}
