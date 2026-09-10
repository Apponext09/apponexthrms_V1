import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface BrandingSettings {
  id: number;
  uuid: string;
  organization_id: number;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  theme: 'light' | 'dark' | 'system';
  custom_css: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class BrandingSettingsRepository extends BaseRepository<BrandingSettings> {
  constructor() {
    super('branding_settings');
  }

  /**
   * Get branding settings for organization (1:1 relationship)
   */
  async getForOrganization(ctx: TenantContext): Promise<BrandingSettings | null> {
    return this.query(ctx).first() as Promise<BrandingSettings | null>;
  }

  /**
   * Check if branding settings exist for organization
   */
  async exists(ctx: TenantContext): Promise<boolean> {
    const result = await this.query(ctx).first();
    return !!result;
  }
}
