import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { authLimiter, passwordResetLimiter } from '../../common/middleware/rateLimiter';
import {
  registerOrganizationSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '@apponexthrms/shared';
import { AuthController } from './auth.controller';

const router = Router();
const controller = new AuthController();

/**
 * Public routes (no auth required)
 */

// POST /api/v1/auth/register-organization
router.post(
  '/register-organization',
  authLimiter,
  validate({ body: registerOrganizationSchema }),
  asyncHandler((req, res) => controller.registerOrganization(req, res))
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler((req, res) => controller.login(req, res))
);

// POST /api/v1/auth/refresh - Rate limited to prevent brute force
router.post(
  '/refresh',
  authLimiter, // Add rate limiting (10/15min per IP)
  validate({ body: refreshTokenSchema }),
  asyncHandler((req, res) => controller.refresh(req, res))
);

/**
 * Protected routes (auth required)
 */

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authenticate,
  resolveTenant,
  asyncHandler((req, res) => controller.logout(req, res))
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticate,
  resolveTenant,
  asyncHandler((req, res) => controller.getMe(req, res))
);

// PUT /api/v1/auth/profile
router.put(
  '/profile',
  authenticate,
  resolveTenant,
  asyncHandler((req, res) => controller.updateProfile(req, res))
);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authenticate,
  resolveTenant,
  passwordResetLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler((req, res) => controller.changePassword(req, res))
);

export default router;
