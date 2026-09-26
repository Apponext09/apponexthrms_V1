// ============================================================
// Livetracking Routes
// server/src/modules/Livetracking/livetracking.routes.ts
// ============================================================
import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { LivetrackingController } from './controllers/LivetrackingController';
import { requireMenuPage } from '../rbac/requireMenuAccess';

const router = Router();
const controller = new LivetrackingController();

// All routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

/**
 * GET /api/v1/livetracking/live
 * Live employee location snapshots (role-scoped)
 */
router.get('/live', requireMenuPage(['/attendance/live-tracking', '/live-tracking', '/hr/live-tracking', '/manager/live-tracking', '/team-lead/live-tracking', '/employee/live-tracking']), controller.getLiveLocations);

/**
 * GET /api/v1/livetracking/history/:employeeId?date=YYYY-MM-DD
 * Historical location breadcrumbs for route playback
 */
router.get('/history/:employeeId', requireMenuPage(['/live-tracking/history', '/admin/live-tracking/history', '/hr/live-tracking/history', '/manager/live-tracking/history', '/team-lead/live-tracking/history', '/employee/live-tracking']), controller.getRouteHistory);

/**
 * POST /api/v1/livetracking/ping
 * HTTP fallback location ping (when socket is not connected)
 */
router.post('/ping', controller.postLocationPing);

/**
 * GET /api/v1/livetracking/sessions?date=YYYY-MM-DD
 * All employee session summaries for a date (HR/Admin only)
 */
router.get('/sessions', requireMenuPage(['/attendance/live-tracking', '/live-tracking', '/hr/live-tracking', '/manager/live-tracking', '/team-lead/live-tracking']), controller.getSessionsForDate);

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
