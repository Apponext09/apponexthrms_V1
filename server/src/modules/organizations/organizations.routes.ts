import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { OrganizationsController } from './organizations.controller';

const router = Router();
const controller = new OrganizationsController();

// All routes require authentication
router.use(authenticate, resolveTenant);

/**
 * GET /api/v1/organizations
 * List organizations (or get current)
 */
router.get(
  '/',
  asyncHandler((req, res) => controller.getCurrent(req, res))
);

/**
 * GET /api/v1/organizations/current
 * Get current organization
 */
router.get(
  '/current',
  asyncHandler((req, res) => controller.getCurrent(req, res))
);

/**
 * PUT /api/v1/organizations/current
 * Update current organization
 */
router.put(
  '/current',
  asyncHandler((req, res) => controller.updateCurrent(req, res))
);

export default router;
