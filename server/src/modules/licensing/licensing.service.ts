import { getKnex } from '../../db/knex';
import type { TenantContext } from '../../db/types';
import { v4 as uuid } from 'uuid';
import { AuditService } from '../audit/audit.service';

const db = getKnex();

export class LicensingService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Check if organization has access to a specific feature
   * Returns true if feature is enabled, false otherwise
   */
  async hasFeatureAccess(ctx: TenantContext, moduleKey: string, featureKey: string): Promise<boolean> {
    // First check if feature is explicitly enabled/disabled for this org
    const orgFeature = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    if (orgFeature) {
      return orgFeature.enabled;
    }

    // If not explicitly set, check if addon subscription includes this feature
    const addonWithFeature = await db('organization_addon_subscriptions')
      .where('organization_addon_subscriptions.organization_id', ctx.organizationId)
      .where('organization_addon_subscriptions.subscription_status', 'active')
      .join('marketplace_addons', 'marketplace_addons.id', 'organization_addon_subscriptions.addon_id')
      .where('marketplace_addons.status', 'active')
      .first();

    if (addonWithFeature) {
      try {
        const enabledFeatures = JSON.parse(addonWithFeature.enabled_features || '{}');
        return enabledFeatures[featureKey] === true;
      } catch {
        return false;
      }
    }

    // Feature not found in any addon
    return false;
  }

  /**
   * Enable or disable a feature for an organization
   */
  async setFeatureAccess(
    ctx: TenantContext,
    moduleKey: string,
    featureKey: string,
    enabled: boolean,
    reason?: string,
  ): Promise<void> {
    const existingFeature = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    const now = new Date();

    if (existingFeature) {
      // Update existing
      await db('organization_module_features')
        .where('id', existingFeature.id)
        .update({
          enabled,
          disabled_at: !enabled ? now : null,
          reason_disabled: !enabled ? reason : null,
          updated_at: now,
        });
    } else {
      // Create new
      await db('organization_module_features').insert({
        id: uuid(),
        organization_id: ctx.organizationId,
        module_key: moduleKey,
        feature_key: featureKey,
        enabled,
        enabled_at: enabled ? now : null,
        disabled_at: !enabled ? now : null,
        reason_disabled: !enabled ? reason : null,
        created_at: now,
        updated_at: now,
      });
    }

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'FEATURE_LICENSE',
      entityId: `${moduleKey}:${featureKey}`,
      description: `${enabled ? 'Enabled' : 'Disabled'} feature ${featureKey} in module ${moduleKey}`,
      metadata: {
        module_key: moduleKey,
        feature_key: featureKey,
        enabled,
        reason: reason,
      },
    });
  }

  /**
   * Track a feature access attempt (for audit logs)
   */
  async trackFeatureAccess(
    ctx: TenantContext,
    moduleKey: string,
    featureKey: string,
    granted: boolean,
    reason?: string,
  ): Promise<void> {
    await db('feature_access_logs').insert({
      id: uuid(),
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      module_key: moduleKey,
      feature_key: featureKey,
      access_type: 'view',
      granted,
      reason_denied: reason,
      request_path: (ctx as any).requestPath || '',
      ip_address: (ctx as any).ipAddress || '',
      created_at: new Date(),
    });
  }

  /**
   * Get all features enabled for an organization
   * Returns object like: { module_key: { feature_key: true/false } }
   */
  async getOrgFeatures(ctx: TenantContext): Promise<Record<string, Record<string, boolean>>> {
    const features = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .select('module_key', 'feature_key', 'enabled');

    const result: Record<string, Record<string, boolean>> = {};

    features.forEach((f) => {
      if (!result[f.module_key]) {
        result[f.module_key] = {};
      }
      result[f.module_key][f.feature_key] = f.enabled;
    });

    return result;
  }

  /**
   * Get feature usage count for an organization
   */
  async getFeatureUsage(ctx: TenantContext, moduleKey: string, featureKey: string): Promise<number> {
    const feature = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    return feature?.monthly_usage_current || 0;
  }

  /**
   * Increment feature usage count
   */
  async incrementFeatureUsage(
    ctx: TenantContext,
    moduleKey: string,
    featureKey: string,
    amount: number = 1,
  ): Promise<void> {
    const feature = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    if (feature) {
      await db('organization_module_features')
        .where('id', feature.id)
        .update({
          monthly_usage_current: db.raw(`monthly_usage_current + ${amount}`),
          updated_at: new Date(),
        });
    }
  }

  /**
   * Reset monthly usage counts (to be called on billing cycle)
   */
  async resetMonthlyUsage(ctx: TenantContext): Promise<void> {
    await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .update({
        monthly_usage_current: 0,
        updated_at: new Date(),
      });
  }

  /**
   * Get all features enabled/disabled for an organization
   * Including add-on features and explicit overrides
   */
  async getAllFeatures(ctx: TenantContext) {
    // Get explicit overrides
    const overrides = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .select('module_key', 'feature_key', 'enabled', 'monthly_usage_limit', 'monthly_usage_current');

    // Get addon features
    const subscriptions = await db('organization_addon_subscriptions')
      .where('organization_id', ctx.organizationId)
      .where('subscription_status', 'active')
      .select('enabled_features');

    const addOnFeatures: Record<string, boolean> = {};
    subscriptions.forEach((sub) => {
      try {
        const features = JSON.parse(sub.enabled_features || '{}');
        Object.assign(addOnFeatures, features);
      } catch {
        // Ignore parse errors
      }
    });

    // Merge and return
    const result: Record<string, Record<string, any>> = {};

    // Add addon features first
    Object.entries(addOnFeatures).forEach(([feature, enabled]) => {
      if (!result['addons']) {
        result['addons'] = {};
      }
      result['addons'][feature] = {
        enabled: enabled as boolean,
        source: 'addon',
      };
    });

    // Add overrides (which take precedence)
    overrides.forEach((override) => {
      if (!result[override.module_key]) {
        result[override.module_key] = {};
      }
      result[override.module_key][override.feature_key] = {
        enabled: override.enabled,
        source: 'override',
        usage_limit: override.monthly_usage_limit,
        usage_current: override.monthly_usage_current,
      };
    });

    return result;
  }
}
