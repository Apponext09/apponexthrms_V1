import express from 'express';
import { authenticate, resolveTenant } from '../../common/middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { MarketplaceController } from './marketplace.controller';

const router = express.Router();
const controller = new MarketplaceController();

/**
 * Public routes (no authentication required)
 */

/**
 * GET /marketplace/addons
 * Get all available addons
 */
router.get('/addons', asyncHandler((req, res) => controller.getAvailableAddons(req, res)));

/**
 * GET /marketplace/addons/:id
 * Get addon details
 */
router.get('/addons/:id', asyncHandler((req, res) => controller.getAddonDetails(req, res)));

/**
 * Protected routes (authentication required)
 */

// Apply auth middleware
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /marketplace/subscriptions
 * Get organization's current addon subscriptions
 */
router.get('/subscriptions', asyncHandler((req, res) => controller.getOrgSubscriptions(req, res)));

/**
 * POST /marketplace/subscribe
 * Subscribe organization to addon
 *
 * Request body:
 * {
 *   "addon_id": "addon-id-here",
 *   "billing_cycle": "monthly" | "yearly",
 *   "start_trial": true | false (optional, defaults to true)
 * }
 */
router.post('/subscribe', asyncHandler((req, res) => controller.subscribeToAddon(req, res)));

/**
 * PATCH /marketplace/subscriptions/:id
 * Update subscription (upgrade billing cycle, toggle auto-renew)
 *
 * Request body:
 * {
 *   "billing_cycle": "monthly" | "yearly" (optional),
 *   "auto_renew": true | false (optional)
 * }
 */
router.patch('/subscriptions/:id', asyncHandler((req, res) => controller.updateSubscription(req, res)));

/**
 * DELETE /marketplace/subscriptions/:id
 * Cancel subscription
 *
 * Request body:
 * {
 *   "reason": "string" (optional)
 * }
 */
router.delete('/subscriptions/:id', asyncHandler((req, res) => controller.cancelSubscription(req, res)));

/**
 * GET /marketplace/trials
 * Get organization's active trials
 */
router.get('/trials', asyncHandler((req, res) => controller.getTrials(req, res)));

/**
 * POST /marketplace/trials/:id/convert
 * Convert trial to paid subscription
 *
 * Request body:
 * {
 *   "billing_cycle": "monthly" | "yearly"
 * }
 */
router.post('/trials/:id/convert', asyncHandler((req, res) => controller.convertTrial(req, res)));

/**
 * GET /marketplace/billing-history
 * Get organization's billing history
 */
router.get('/billing-history', asyncHandler((req, res) => controller.getBillingHistory(req, res)));

/**
 * GET /marketplace/invoices/:id
 * Get invoice details
 */
router.get('/invoices/:id', asyncHandler((req, res) => controller.getInvoice(req, res)));

export default router;
