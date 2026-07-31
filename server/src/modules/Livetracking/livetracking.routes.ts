// ============================================================
// Livetracking Routes
// server/src/modules/Livetracking/livetracking.routes.ts
// ============================================================
import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { LivetrackingController } from './controllers/LivetrackingController';

const router = Router();
const controller = new LivetrackingController();

// All routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

/**
 * GET /api/v1/livetracking/live
 * Live employee location snapshots (role-scoped)
 */
router.get('/live', controller.getLiveLocations);

/**
 * GET /api/v1/livetracking/history/:employeeId?date=YYYY-MM-DD
 * Historical location breadcrumbs for route playback
 */
router.get('/history/:employeeId', controller.getRouteHistory);

/**
 * POST /api/v1/livetracking/ping
 * HTTP fallback location ping (when socket is not connected)
 */
router.post('/ping', controller.postLocationPing);

export default router;
