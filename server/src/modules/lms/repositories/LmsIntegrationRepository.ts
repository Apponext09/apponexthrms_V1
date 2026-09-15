import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface LmsIntegrationSettingRow {
  id: number;
  organization_id: number;
  company_id: number | null;
  platform: string;
  is_enabled: boolean;
  config_json: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

class LmsIntegrationRepository {
  private get db() {
    return getKnex();
  }

  private baseQuery(ctx: TenantContext) {
    const q = this.db('lms_integration_settings').where(
      'lms_integration_settings.organization_id',
      ctx.organizationId
    );
    if (ctx.companyId) {
      q.where((b) =>
        b
          .where('lms_integration_settings.company_id', ctx.companyId!)
          .orWhereNull('lms_integration_settings.company_id')
      );
    }
    return q;
  }

  /**
   * Knex's postProcessResponse hook converts all snake_case columns → camelCase.
   * This normalise() method reads BOTH variants (camelCase from Knex hook +
   * snake_case fallback) and returns a consistent interface shape so the rest
   * of the service layer works correctly regardless of Knex version behaviour.
   */
  private normalise(raw: any): LmsIntegrationSettingRow {
    return {
      id: raw.id,
      organization_id: raw.organizationId ?? raw.organization_id,
      company_id: raw.companyId ?? raw.company_id ?? null,
      platform: raw.platform,
      // MySQL tinyint(1) returns 0/1 (number), not false/true (boolean).
      // Knex postProcessResponse may also return it as isEnabled=1 (camelCase but still number).
      // Boolean() converts 0→false, 1→true correctly.
      is_enabled: Boolean(raw.isEnabled ?? raw.is_enabled ?? 0),
      config_json: raw.configJson ?? raw.config_json ?? null,
      last_synced_at: raw.lastSyncedAt ?? raw.last_synced_at ?? null,
      created_at: raw.createdAt ?? raw.created_at ?? '',
      updated_at: raw.updatedAt ?? raw.updated_at ?? '',
    };
  }

  /**
   * Fetch all integration settings for the current company context.
   */
  async getAllSettings(ctx: TenantContext): Promise<LmsIntegrationSettingRow[]> {
    const rows = await this.baseQuery(ctx).orderBy('platform');
    return (rows as any[]).map((r) => this.normalise(r));
  }

  /**
   * Fetch a single platform's settings.
   */
  async getSetting(
    ctx: TenantContext,
    platform: string
  ): Promise<LmsIntegrationSettingRow | null> {
    const row = await this.baseQuery(ctx).where('platform', platform).first();
    return row ? this.normalise(row) : null;
  }

  /**
   * Upsert a platform setting row.
   * Uses explicit snake_case keys for INSERT/UPDATE payloads so Knex
   * maps them to the correct physical column names.
   */
  async upsertSetting(
    ctx: TenantContext,
    platform: string,
    data: {
      is_enabled?: boolean;
      config_json?: string | null;
    }
  ): Promise<LmsIntegrationSettingRow> {
    const existing = await this.getSetting(ctx, platform);

    if (existing) {
      const updatePayload: any = { updated_at: this.db.fn.now() };
      if (data.is_enabled !== undefined) updatePayload.is_enabled = data.is_enabled;
      if (data.config_json !== undefined) updatePayload.config_json = data.config_json;

      await this.db('lms_integration_settings')
        .where('id', existing.id)
        .update(updatePayload);
      return (await this.getSetting(ctx, platform))!;
    }

    const [id] = await this.db('lms_integration_settings').insert({
      organization_id: ctx.organizationId,
      company_id: ctx.companyId ?? null,
      platform,
      is_enabled: data.is_enabled ?? false,
      config_json: data.config_json ?? null,
      last_synced_at: null,
    });

    const inserted = await this.db('lms_integration_settings').where('id', id).first();
    return this.normalise(inserted);
  }

  /**
   * Mark a successful sync by stamping last_synced_at.
   */
  async markSynced(ctx: TenantContext, platform: string): Promise<void> {
    await this.db('lms_integration_settings')
      .where('organization_id', ctx.organizationId)
      .where('platform', platform)
      .modify((q) => {
        if (ctx.companyId) q.where('company_id', ctx.companyId);
      })
      .update({ last_synced_at: this.db.fn.now() });
  }

  /**
   * Quick boolean check — used as the guard in adapters / service.
   */
  async isEnabled(ctx: TenantContext, platform: string): Promise<boolean> {
    const row = await this.getSetting(ctx, platform);
    return row?.is_enabled === true;
  }
}

export const lmsIntegrationRepository = new LmsIntegrationRepository();
