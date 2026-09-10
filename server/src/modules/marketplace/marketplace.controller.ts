import type { Request, Response } from 'express';
import { MarketplaceService } from './marketplace.service';

export class MarketplaceController {
  private service: MarketplaceService;

  constructor() {
    this.service = new MarketplaceService();
  }

  /**
   * GET /marketplace/addons
   * Get all available addons
   */
  async getAvailableAddons(req: Request, res: Response): Promise<void> {
    try {
      const addons = await this.service.getAvailableAddons();
      res.json({
        success: true,
        data: addons,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch addons',
      });
    }
  }

  /**
   * GET /marketplace/addons/:id
   * Get addon details
   */
  async getAddonDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const addon = await this.service.getAddonDetails(id);

      if (!addon) {
        res.status(404).json({
          success: false,
          error: 'Addon not found',
        });
        return;
      }

      res.json({
        success: true,
        data: addon,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch addon',
      });
    }
  }

  /**
   * GET /marketplace/subscriptions
   * Get organization's subscriptions (requires auth)
   */
  async getOrgSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const subscriptions = await this.service.getOrgSubscriptions(ctx);
      res.json({
        success: true,
        data: subscriptions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch subscriptions',
      });
    }
  }

  /**
   * POST /marketplace/subscribe
   * Subscribe to addon
   */
  async subscribeToAddon(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { addon_id, billing_cycle, start_trial } = req.body;

      // Validation
      if (!addon_id || !billing_cycle) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: addon_id, billing_cycle',
        });
        return;
      }

      if (!['monthly', 'yearly'].includes(billing_cycle)) {
        res.status(400).json({
          success: false,
          error: 'Invalid billing_cycle. Must be monthly or yearly',
        });
        return;
      }

      const result = await this.service.subscribeToAddon(ctx, {
        addon_id,
        billing_cycle,
        start_trial: start_trial || true,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes('already subscribed')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to subscribe to addon',
        });
      }
    }
  }

  /**
   * PATCH /marketplace/subscriptions/:id
   * Update subscription (upgrade, downgrade, etc.)
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { billing_cycle, auto_renew } = req.body;

      const updated = await this.service.updateSubscription(ctx, id, {
        billing_cycle,
        auto_renew,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to update subscription',
        });
      }
    }
  }

  /**
   * DELETE /marketplace/subscriptions/:id
   * Cancel subscription
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      await this.service.cancelSubscription(ctx, id, reason);

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to cancel subscription',
        });
      }
    }
  }

  /**
   * GET /marketplace/trials
   * Get active trials for organization
   */
  async getTrials(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const trials = await this.service.getTrials(ctx);
      res.json({
        success: true,
        data: trials,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch trials',
      });
    }
  }

  /**
   * POST /marketplace/trials/:id/convert
   * Convert trial to paid subscription
   */
  async convertTrial(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { billing_cycle } = req.body;

      if (!billing_cycle || !['monthly', 'yearly'].includes(billing_cycle)) {
        res.status(400).json({
          success: false,
          error: 'Invalid billing_cycle. Must be monthly or yearly',
        });
        return;
      }

      const subscription = await this.service.convertTrial(ctx, id, billing_cycle);

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else if (error.message.includes('not active')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to convert trial',
        });
      }
    }
  }

  /**
   * GET /marketplace/billing-history
   * Get billing history
   */
  async getBillingHistory(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const history = await this.service.getBillingHistory(ctx);
      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch billing history',
      });
    }
  }

  /**
   * GET /marketplace/invoices/:id
   * Get invoice details
   */
  async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      if (!ctx) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const invoice = await this.service.getInvoice(ctx, id);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to fetch invoice',
        });
      }
    }
  }
}
