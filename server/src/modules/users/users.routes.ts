import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { UsersController } from './users.controller';

const router = Router();
const controller = new UsersController();

// All routes require authentication
router.use(authenticate, resolveTenant);

/**
 * GET /api/v1/users
 * List users in organization
 */
router.get(
  '/',
  asyncHandler((req, res) => controller.listUsers(req, res))
);

/**
 * GET /api/v1/users/:userId
 * Get user by ID
 */
router.get(
  '/:userId',
  asyncHandler((req, res) => controller.getUser(req, res))
);

/**
 * PUT /api/v1/users/:userId
 * Update user
 */
router.put(
  '/:userId',
  asyncHandler((req, res) => controller.updateUser(req, res))
);

/**
 * POST /api/v1/users/:userId/force-logout
 * Force logout user
 */
router.post(
  '/:userId/force-logout',
  asyncHandler((req, res) => controller.forceLogout(req, res))
);

export default router;
