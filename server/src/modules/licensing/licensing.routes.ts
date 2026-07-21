import express from 'express';
import { authenticate, resolveTenant } from '../../common/middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { LicensingController } from './licensing.controller';

const router = express.Router();
const controller = new LicensingController();

// All licensing routes require authentication
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /licensing/features
 * Get all features for organization
 */
router.get('/features', asyncHandler((req, res) => controller.getFeatures(req, res)));

/**
 * GET /licensing/features/all
 * Get all features including addons and overrides
 */
router.get('/features/all', asyncHandler((req, res) => controller.getAllFeatures(req, res)));

/**
 * GET /licensing/features/:module/:feature/check
 * Check if a feature is accessible
 */
router.get('/features/:module/:feature/check', asyncHandler((req, res) => controller.checkFeatureAccess(req, res)));

/**
 * GET /licensing/features/:module/:feature/usage
 * Get usage count for a feature
 */
router.get('/features/:module/:feature/usage', asyncHandler((req, res) => controller.getFeatureUsage(req, res)));

/**
 * POST /licensing/features/:module/:feature/enable
 * Enable a feature (admin only)
 */
router.post('/features/:module/:feature/enable', asyncHandler((req, res) => controller.enableFeature(req, res)));

/**
 * POST /licensing/features/:module/:feature/disable
 * Disable a feature (admin only)
 *
 * Request body:
 * {
 *   "reason": "string" (optional)
 * }
 */
router.post('/features/:module/:feature/disable', asyncHandler((req, res) => controller.disableFeature(req, res)));

export default router;
