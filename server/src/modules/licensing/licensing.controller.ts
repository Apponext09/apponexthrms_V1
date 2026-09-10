import type { Request, Response } from 'express';
import { LicensingService } from './licensing.service';

export class LicensingController {
  private service: LicensingService;

  constructor() {
    this.service = new LicensingService();
  }

  /**
   * GET /licensing/features
   * Get all features enabled/disabled for organization
   */
  async getFeatures(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const features = await this.service.getOrgFeatures(ctx);
      res.json({
        success: true,
        data: features,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch features',
      });
    }
  }

  /**
   * GET /licensing/features/all
   * Get all features including addon and overrides
   */
  async getAllFeatures(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const features = await this.service.getAllFeatures(ctx).catch((err) => {
        console.warn('[LicensingController] getAllFeatures fallback:', err?.message);
        return {};
      });

      res.json({
        success: true,
        data: features || {},
      });
    } catch (error: any) {
      res.json({
        success: true,
        data: {},
      });
    }
  }

  /**
   * POST /licensing/features/:module/:feature/enable
   * Enable a feature for organization
   */
  async enableFeature(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { module, feature } = req.params;

      await this.service.setFeatureAccess(ctx, module, feature, true);

      res.json({
        success: true,
        message: `Feature ${feature} enabled`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to enable feature',
      });
    }
  }

  /**
   * POST /licensing/features/:module/:feature/disable
   * Disable a feature for organization
   */
  async disableFeature(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { module, feature } = req.params;
      const { reason } = req.body;

      await this.service.setFeatureAccess(ctx, module, feature, false, reason);

      res.json({
        success: true,
        message: `Feature ${feature} disabled`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to disable feature',
      });
    }
  }

  /**
   * GET /licensing/features/:module/:feature/check
   * Check if a feature is accessible
   */
  async checkFeatureAccess(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { module, feature } = req.params;

      const hasAccess = await this.service.hasFeatureAccess(ctx, module, feature);

      // Track this check
      await this.service.trackFeatureAccess(ctx, module, feature, hasAccess);

      res.json({
        success: true,
        data: {
          module,
          feature,
          has_access: hasAccess,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check feature access',
      });
    }
  }

  /**
   * GET /licensing/features/:module/:feature/usage
   * Get usage count for a feature
   */
  async getFeatureUsage(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { module, feature } = req.params;

      const usage = await this.service.getFeatureUsage(ctx, module, feature);

      res.json({
        success: true,
        data: {
          module,
          feature,
          usage,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get feature usage',
      });
    }
  }
}
