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

/**
 * GET /api/v1/livetracking/sessions?date=YYYY-MM-DD
 * All employee session summaries for a date (HR/Admin only)
 */
router.get('/sessions', controller.getSessionsForDate);

/**
 * GET /api/v1/livetracking/sessions/:employeeId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Session history for a specific employee (HR/Admin only)
 */
/**
 * POST /api/v1/livetracking/save-location
 * Explicitly save/pin employee location & auto-update location_walk history
 */
router.post('/save-location', controller.saveLocation);

export default router;
