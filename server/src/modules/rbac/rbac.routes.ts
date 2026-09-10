import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { RbacController } from './rbac.controller';

const router = Router();
const controller = new RbacController();

// All routes require authentication
router.use(authenticate, resolveTenant);

/**
 * GET /api/v1/rbac/me/permissions
 * Get current user's permissions and roles
 */
router.get(
  '/me/permissions',
  asyncHandler((req, res) => controller.getMyPermissions(req, res))
);

/**
 * GET /api/v1/rbac/roles
 * List all roles in organization
 */
router.get(
  '/roles',
  asyncHandler((req, res) => controller.listRoles(req, res))
);

/**
 * POST /api/v1/rbac/users/:userId/roles/:roleId
 * Assign role to user
 */
router.post(
  '/users/:userId/roles/:roleId',
  asyncHandler((req, res) => controller.assignRoleToUser(req, res))
);

/**
 * DELETE /api/v1/rbac/users/:userId/roles/:roleId
 * Revoke role from user
 */
router.delete(
  '/users/:userId/roles/:roleId',
  asyncHandler((req, res) => controller.revokeRoleFromUser(req, res))
);

export default router;
