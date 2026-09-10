import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface OrganizationSetting {
  id: number;
  uuid: string;
  organization_id: number;
  setting_key: string;
  setting_value: any;
  setting_type: string | null;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OrganizationSettingRepository extends BaseRepository<OrganizationSetting> {
  constructor() {
    super('organization_settings');
  }

  /**
   * Get setting by key
   */
  async getByKey(ctx: TenantContext, key: string): Promise<OrganizationSetting | null> {
    return this.query(ctx).where('setting_key', key).first() as Promise<OrganizationSetting | null>;
  }

  /**
   * Get setting value by key
   */
  async getValueByKey(ctx: TenantContext, key: string): Promise<any> {
    const setting = await this.getByKey(ctx, key);
    return setting?.setting_value || null;
  }

  /**
   * Get settings by type
   */
  async getByType(ctx: TenantContext, type: string) {
    return this.query(ctx).where('setting_type', type);
  }

  /**
   * Check if setting key exists
   */
  async keyExists(ctx: TenantContext, key: string): Promise<boolean> {
    const result = await this.query(ctx).where('setting_key', key).first();
    return !!result;
  }

  /**
   * Get all settings as key-value object
   */
  async getAllAsObject(ctx: TenantContext): Promise<Record<string, any>> {
    const settings = await this.query(ctx).select();
    return settings.reduce((acc: Record<string, any>, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['setting_key', 'description'];
  }
}
