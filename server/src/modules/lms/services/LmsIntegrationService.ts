import { v4 as uuidv4 } from 'uuid';
import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { lmsIntegrationRepository } from '../repositories/LmsIntegrationRepository';
import { udemyAdapter } from '../adapters/UdemyAdapter';
import { courseraAdapter } from '../adapters/CourseraAdapter';
import { linkedinAdapter } from '../adapters/LinkedInAdapter';
import type { IPlatformAdapter, PlatformConfig } from '../adapters/IPlatformAdapter';
import { encrypt, safeDecrypt } from '../../../common/utils/cryptoService';

export type LmsPlatform = 'udemy' | 'coursera' | 'linkedin';

/** Safe response shape sent to the client — never exposes raw credentials */
export interface IntegrationSettingDTO {
  platform: LmsPlatform;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  isConfigured: boolean; // true when config_json is non-null and non-empty
}

export interface SyncResult {
  platform: LmsPlatform;
  imported: number;
  skipped: number;
  message: string;
}

// Registry of all supported adapters — extend here when adding new platforms
const ADAPTER_REGISTRY: Record<LmsPlatform, IPlatformAdapter> = {
  udemy: udemyAdapter,
  coursera: courseraAdapter,
  linkedin: linkedinAdapter,
};

// All platforms that exist in the system (for returning defaults even if unconfigured)
const ALL_PLATFORMS: LmsPlatform[] = ['udemy', 'coursera', 'linkedin'];

class LmsIntegrationService {
  /**
   * Returns a full list of all platforms with their current status.
   * Platforms that have never been configured are returned with defaults.
   */
  async getSettings(ctx: TenantContext): Promise<IntegrationSettingDTO[]> {
    const rows = await lmsIntegrationRepository.getAllSettings(ctx);
    const rowsByPlatform = new Map(rows.map((r) => [r.platform, r]));

    return ALL_PLATFORMS.map((platform) => {
      const row = rowsByPlatform.get(platform);
      return {
        platform,
        isEnabled: row?.is_enabled === true,
        lastSyncedAt: row?.last_synced_at ?? null,
        isConfigured: !!(row?.config_json && row.config_json.trim() !== '{}'),
      };
    });
  }

  /**
   * Enable or disable a platform, and optionally save its credentials.
   * Credentials are stored as a JSON string — encrypt before storing in production.
   */
  async updateSetting(
    ctx: TenantContext,
    platform: LmsPlatform,
    data: {
      isEnabled?: boolean;
      config?: PlatformConfig;
    }
  ): Promise<IntegrationSettingDTO> {
    // Encrypt credentials before storing — AES-256-CBC via cryptoService
    let configJson: string | undefined;
    if (data.config && Object.keys(data.config).length > 0) {
      const plainJson = JSON.stringify(data.config);
      configJson = encrypt(plainJson);
    } else if (data.config !== undefined) {
      // Explicitly passed empty config — clear stored credentials
      configJson = undefined;
    }

    await lmsIntegrationRepository.upsertSetting(ctx, platform, {
      ...(data.isEnabled !== undefined && { is_enabled: data.isEnabled }),
      ...(configJson !== undefined && { config_json: configJson }),
    });

    const updated = await lmsIntegrationRepository.getSetting(ctx, platform);
    return {
      platform,
      isEnabled: updated?.is_enabled === true,
      lastSyncedAt: updated?.last_synced_at ?? null,
      isConfigured: !!(updated?.config_json && updated.config_json.trim() !== '{}'),
    };
  }

  /**
   * Guard: returns true only when the platform is explicitly enabled.
   * Called by syncPlatform() to short-circuit before any adapter code runs.
   */
  async isEnabled(ctx: TenantContext, platform: LmsPlatform): Promise<boolean> {
    return lmsIntegrationRepository.isEnabled(ctx, platform);
  }

  /**
   * Main sync entrypoint.
   *
   * Flow:
   * 1. Check isEnabled — if false, return immediately with 0 imported.
   * 2. Load credentials from DB.
   * 3. Call the platform adapter's fetchCourses().
   * 4. Upsert each external course into lms_courses (source=platform).
   * 5. Stamp last_synced_at.
   */
  async syncPlatform(ctx: TenantContext, platform: LmsPlatform): Promise<SyncResult> {
    // ── Guard: do nothing if integration is disabled ──────────────────────
    const enabled = await this.isEnabled(ctx, platform);
    if (!enabled) {
      return {
        platform,
        imported: 0,
        skipped: 0,
        message: `${platform} integration is not enabled for this company.`,
      };
    }

    // ── Load & DECRYPT credentials ────────────────────────────────────────
    const setting = await lmsIntegrationRepository.getSetting(ctx, platform);
    let config: PlatformConfig = {};
    if (setting?.config_json) {
      try {
        // safeDecrypt handles both AES-encrypted strings AND legacy plain-text
        // (backward compatible — old plain-text rows still work)
        const decrypted = safeDecrypt(setting.config_json);
        if (decrypted) {
          config = JSON.parse(decrypted) as PlatformConfig;
        }
      } catch {
        config = {};
      }
    }

    // ── Fetch courses from adapter ────────────────────────────────────────
    const adapter = ADAPTER_REGISTRY[platform];
    const externalCourses = await adapter.fetchCourses(config);

    if (externalCourses.length === 0) {
      return {
        platform,
        imported: 0,
        skipped: 0,
        message: `No courses returned from ${platform}. Adapter may be stubbed or credentials missing.`,
      };
    }

    // ── Upsert into lms_courses ───────────────────────────────────────────
    const db = getKnex();
    let imported = 0;
    let skipped = 0;

    for (const ec of externalCourses) {
      // Dedup by (org, company, platform source, external_id)
      const existing = await db('lms_courses')
        .where('organization_id', ctx.organizationId)
        .where((b) => {
          if (ctx.companyId) b.where('company_id', ctx.companyId).orWhereNull('company_id');
        })
        .where('source', platform)
        .where('external_id', ec.externalId)
        .whereNull('deleted_at')
        .first();

      const payload = {
        title: ec.title,
        description: ec.description ?? null,
        thumbnail_url: ec.thumbnailUrl ?? null,
        duration_hours: ec.durationHours ?? 0,
        skill_tags: JSON.stringify(ec.skillTags ?? []),
        external_url: ec.externalUrl,
        source: platform,
        status: 'published',
        updated_at: db.fn.now(),
      };

      if (existing) {
        await db('lms_courses').where('id', existing.id).update(payload);
        skipped++; // "skipped" here means "already existed, updated in place"
      } else {
        await db('lms_courses').insert({
          ...payload,
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId ?? null,
          external_id: ec.externalId,
          type: 'self_paced',
          is_mandatory: false,
          deadline_days: 0,
          pass_percentage: 60,
          attempt_limit: 3,
        });
        imported++;
      }
    }

    await lmsIntegrationRepository.markSynced(ctx, platform);

    return {
      platform,
      imported,
      skipped,
      message: `Sync complete — ${imported} new course(s) imported, ${skipped} updated.`,
    };
  }
}

export const lmsIntegrationService = new LmsIntegrationService();
