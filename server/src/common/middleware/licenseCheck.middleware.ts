import type { Request, Response, NextFunction } from 'express';
import { LicensingService } from '../../modules/licensing/licensing.service';

export interface LicenseCheckOptions {
  moduleKey: string;
  featureKey: string;
  trackUsage?: boolean;
}

const licensingService = new LicensingService();

/**
 * Middleware to check if organization has access to a specific feature
 * Returns 403 Forbidden if not licensed
 * Returns 429 Too Many Requests if quota exceeded
 *
 * Usage:
 * router.post('/some-feature', licenseCheck({ moduleKey: 'payroll', featureKey: 'salary_calculation' }), controller.someAction)
 */
export const licenseCheck = (options: LicenseCheckOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = req.ctx;

      // If no tenant context, deny access
      if (!ctx) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }

      // Check feature access
      const hasAccess = await licensingService.hasFeatureAccess(
        ctx,
        options.moduleKey,
        options.featureKey,
      );

      // Track the access attempt
      await licensingService.trackFeatureAccess(
        ctx,
        options.moduleKey,
        options.featureKey,
        hasAccess,
        hasAccess ? undefined : 'not_licensed',
      );

      // If no access, return 403
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Feature not licensed',
          code: 'FEATURE_NOT_LICENSED',
          details: {
            module: options.moduleKey,
            feature: options.featureKey,
            message: `Your organization does not have access to the ${options.featureKey} feature. Please upgrade your subscription to access this feature.`,
            action: 'upgrade_subscription',
          },
        });
      }

      // Check usage quota if enabled
      if (options.trackUsage) {
        const usage = await licensingService.getFeatureUsage(ctx, options.moduleKey, options.featureKey);

        // Get the license limit
        const feature = await req.app.locals.db('organization_module_features')
          .where('organization_id', ctx.organizationId)
          .where('module_key', options.moduleKey)
          .where('feature_key', options.featureKey)
          .first();

        if (feature?.monthly_usage_limit && usage >= feature.monthly_usage_limit) {
          await licensingService.trackFeatureAccess(
            ctx,
            options.moduleKey,
            options.featureKey,
            false,
            'quota_exceeded',
          );

          return res.status(429).json({
            success: false,
            error: 'Quota exceeded',
            code: 'QUOTA_EXCEEDED',
            details: {
              module: options.moduleKey,
              feature: options.featureKey,
              limit: feature.monthly_usage_limit,
              usage: usage,
              message: 'You have reached the usage limit for this feature this month.',
              action: 'upgrade_plan',
            },
          });
        }
      }

      // All checks passed, proceed to next middleware/handler
      next();
    } catch (error: any) {
      console.error('License check error:', error);
      res.status(500).json({
        success: false,
        error: 'License check failed',
        code: 'LICENSE_CHECK_ERROR',
      });
    }
  };
};

/**
 * Quick license check middleware (without usage tracking)
 * Use this for read-only operations that don't consume quota
 */
export const quickLicenseCheck = (moduleKey: string, featureKey: string) => {
  return licenseCheck({ moduleKey, featureKey, trackUsage: false });
};

/**
 * License check with usage tracking
 * Use this for operations that should count against quota
 */
export const licenseCheckWithUsage = (moduleKey: string, featureKey: string) => {
  return licenseCheck({ moduleKey, featureKey, trackUsage: true });
};
