import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface MrfTableSettings {
  id: number;
  uuid: string;
  organization_id: number;
  user_id: number;
  config_type: string;
  settings_json: any;
  created_at: string;
  updated_at: string;
}

export class MrfTableSettingsRepository extends BaseRepository<MrfTableSettings> {
  constructor() {
    super('mrf_table_settings');
  }

  override async create(ctx: TenantContext, data: Partial<MrfTableSettings>): Promise<MrfTableSettings> {
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  protected getSearchableFields(): string[] {
    return [];
  }

  async getByUserAndType(
    ctx: TenantContext,
    userId: number,
    configType: string
  ): Promise<MrfTableSettings | null> {
    return this.query(ctx)
      .where('user_id', userId)
      .where('config_type', configType)
      .first();
  }

  async upsert(
    ctx: TenantContext,
    userId: number,
    configType: string,
    settingsJson: any
  ): Promise<MrfTableSettings> {
    const existing = await this.getByUserAndType(ctx, userId, configType);

    if (existing) {
      await this.update(ctx, existing.id, {
        settings_json: JSON.stringify(settingsJson),
      } as any);
      return { ...existing, settings_json: settingsJson };
    }

    const created = await this.create(ctx, {
      user_id: userId,
      config_type: configType,
      settings_json: JSON.stringify(settingsJson),
    } as any);

    return created;
  }
}
