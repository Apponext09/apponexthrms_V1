import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requireRoles } from '../../common/middleware/requireRoles';
import { RbacController } from './rbac.controller';
import { ROLE_MANAGERS } from './role-management-policy';

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
router.get('/me/menus', asyncHandler((req, res) => controller.getMyMenus(req, res)));
router.get('/menus', asyncHandler((req, res) => controller.listMenus(req, res)));
router.get('/roles/:roleId/menus', requireRoles(ROLE_MANAGERS), asyncHandler((req, res) => controller.getRoleMenus(req, res)));
router.put('/roles/:roleId/menus', requireRoles(ROLE_MANAGERS), asyncHandler((req, res) => controller.setRoleMenus(req, res)));

/**
 * GET /api/v1/rbac/roles
 * List all roles in organization
 */
router.get(
  '/roles',
  asyncHandler((req, res) => controller.listRoles(req, res))
);

router.post('/roles', requireRoles(ROLE_MANAGERS), asyncHandler((req, res) => controller.createRole(req, res)));
router.patch('/roles/:roleId', requireRoles(ROLE_MANAGERS), asyncHandler((req, res) => controller.updateRole(req, res)));
router.delete('/roles/:roleId', requireRoles(ROLE_MANAGERS), asyncHandler((req, res) => controller.deleteRole(req, res)));

/**
 * POST /api/v1/rbac/users/:userId/roles/:roleId
 * Assign role to user
 */
router.post(
  '/users/:userId/roles/:roleId',
  requireRoles(['organization_admin', 'ceo']),
  asyncHandler((req, res) => controller.assignRoleToUser(req, res))
);

/**
 * DELETE /api/v1/rbac/users/:userId/roles/:roleId
 * Revoke role from user
 */
router.delete(
  '/users/:userId/roles/:roleId',
  requireRoles(['organization_admin', 'ceo']),
  asyncHandler((req, res) => controller.revokeRoleFromUser(req, res))
);

export default router;
