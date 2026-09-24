// ============================================================
// LivetrackingController
// server/src/modules/Livetracking/controllers/LivetrackingController.ts
//
// NOTE: JwtClaims only contains sub (userId), oid (orgId), sid (sessionUuid).
// employeeId is NOT in the JWT — we look it up via users table.
// ============================================================
import type { Request, Response } from 'express';
import { LivetrackingRepository } from '../repositories/LivetrackingRepository';
import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { broadcastLocationUpdate } from '../sockets/livetracking.socket';
import { calculateSessionMetrics } from '../utils/sessionCalculator';

const repo = new LivetrackingRepository();

/** Resolve employee_id from the users table using the authed userId.
 * Falls back to matching employees by email if users.employee_id is NULL. */
async function resolveEmployeeId(
  organizationId: number,
  userId: number
): Promise<number | null> {
  if (!userId) return null;
  const db = getKnex();

  // Primary: get employee_id from users table directly
  const user = await db('users')
    .where('id', userId)
    .where('organization_id', organizationId)
    .select('employee_id', 'email')
    .first()
    .catch(() => null);

  if (!user) return null;

  // If employee_id is set on the user record, use it
  if (user.employee_id) return Number(user.employee_id);

  // Fallback: match by email in the employees table
  if (user.email) {
    const emp = await db('employees')
      .where('organization_id', organizationId)
      .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
      .whereIn('status', ['active', 'probation', 'onboarding', 'notice'])
      .select('id')
      .first()
      .catch(() => null);

    if (emp?.id) {
      // Backfill the users.employee_id for future requests
      await db('users')
        .where('id', userId)
        .update({ employee_id: emp.id })
        .catch(() => {});

      return Number(emp.id);
    }
  }

  return null;
}

/** Reject out-of-range / null-island / non-finite coordinates (spoofed or garbage GPS data) */
function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Determine if user is HR, Admin, or CEO by inspecting JWT claims and DB user_roles */
async function checkIsHROrAdmin(organizationId: number, userId: number, userClaims: any): Promise<boolean> {
  const adminPatterns = ['admin', 'hr', 'organization_admin', 'super_admin', 'ceo', 'owner', 'director', 'executive'];

  // Check claims / JWT if present
  const claimsRoles: string[] = Array.isArray(userClaims?.roles) ? userClaims.roles : [];
  if (userClaims?.role) claimsRoles.push(userClaims.role);

  for (const r of claimsRoles) {
    const norm = String(r).toLowerCase().replace(/[\s-]+/g, '_');
    if (adminPatterns.some((p) => norm.includes(p))) return true;
  }

  // Query DB user_roles joined with roles table
  const rows = await getKnex()('user_roles as ur')
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .where('ur.organization_id', organizationId)
    .select('r.code', 'r.name')
    .catch(() => []);

  for (const row of rows) {
    const codeNorm = String(row?.code || '').toLowerCase().replace(/[\s-]+/g, '_');
    const nameNorm = String(row?.name || '').toLowerCase().replace(/[\s-]+/g, '_');

    if (adminPatterns.some((p) => codeNorm.includes(p) || nameNorm.includes(p))) {
      return true;
    }
  }

  return false;
}

/**
 * Non-blocking async session recalculation.
 * Fetches today's breadcrumbs for an employee and upserts the session summary.
 */
async function recalcSessionAsync(ctx: TenantContext, employeeId: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const breadcrumbs = await repo.getLocationHistory(ctx, employeeId, today);
  if (!breadcrumbs || breadcrumbs.length === 0) return;
  const metrics = calculateSessionMetrics(breadcrumbs);
  await repo.upsertTrackingSession(ctx, employeeId, today, {
    ...metrics,
    locationWalk: JSON.stringify(breadcrumbs),
  });
}

export class LivetrackingController {
  /**
   * GET /api/v1/livetracking/live
   * Returns current live location snapshot for all accessible employees.
   * - HR / Admin / Super Admin → full org
   * - Manager / Team Lead (has direct reports) → reporting team (multi-tier)
   * - Regular employee → self only
   */
  getLiveLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;

      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);

      let employees;
      if (isHROrAdmin) {
        employees = await repo.getLiveLocationsForOrg(ctx);
      } else {
        const employeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);
        if (!employeeId) {
          res.json({ success: true, data: [] });
          return;
        }

        const empRow = await getKnex()('employees')
          .where('id', employeeId)
          .select('current_department_id')
          .first()
          .catch(() => null);

        const hasReports = await getKnex()('employees')
          .where('organization_id', ctx.organizationId)
          .where('reporting_manager_id', employeeId)
          .whereNull('deleted_at')
          .first()
          .catch(() => null);

        employees = hasReports
          ? await repo.getLiveLocationsForTeam(ctx, employeeId, empRow?.current_department_id ?? null)
          : await repo.getLiveLocationForEmployee(ctx, employeeId);
      }

      res.json({ success: true, data: employees });
    } catch (error: any) {
      console.error('[LivetrackingController] getLiveLocations error:', error?.message || error);
      res.status(500).json({ success: false, error: 'Failed to fetch live locations' });
    }
  };

  /**
   * GET /api/v1/livetracking/history/:employeeId?date=YYYY-MM-DD
   * Returns historical location breadcrumbs for route playback.
   * - HR/Admin → any employee
   * - Manager → their own reports only
   * - Regular employee → self only
   */
  getRouteHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const employeeId = parseInt(req.params.employeeId, 10);
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

      if (isNaN(employeeId)) {
        res.status(400).json({ success: false, error: 'Invalid employeeId' });
        return;
      }

      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);

      if (!isHROrAdmin) {
        const requesterEmployeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);

        if (!requesterEmployeeId) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }

        if (requesterEmployeeId !== employeeId) {
          const managesTarget = await getKnex()('employees')
            .where('organization_id', ctx.organizationId)
            .where('id', employeeId)
            .where('reporting_manager_id', requesterEmployeeId)
            .whereNull('deleted_at')
            .first()
            .catch(() => null);

          if (!managesTarget) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
          }
        }
      }

      const history = await repo.getLocationHistory(ctx, employeeId, date);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('[LivetrackingController] getRouteHistory error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch location history' });
    }
  };

  /**
   * POST /api/v1/livetracking/ping
   * HTTP fallback for location ping (when socket not connected).
   * Resolves employee_id from the authenticated user's DB record.
   */
  postLocationPing = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;

      // Resolve employee_id from DB
      const employeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);

      if (!employeeId) {
        res.status(403).json({
          success: false,
          error: 'No employee record linked to this user account',
        });
        return;
      }

      const { latitude, longitude, accuracy, speed, heading } = req.body;

      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({ success: false, error: 'latitude and longitude are required' });
        return;
      }

      const parsedLat = parseFloat(latitude);
      const parsedLng = parseFloat(longitude);

      if (!isValidLatLng(parsedLat, parsedLng)) {
        res.status(400).json({ success: false, error: 'latitude/longitude out of valid range' });
        return;
      }

      const payload = {
        latitude: parsedLat,
        longitude: parsedLng,
        accuracy: accuracy !== undefined ? parseFloat(accuracy) : undefined,
        speed: speed !== undefined ? parseFloat(speed) : undefined,
        heading: heading !== undefined ? parseFloat(heading) : undefined,
      };

      await repo.upsertLiveLocation(ctx, employeeId, payload);
      await repo.addLocationBreadcrumb(ctx, employeeId, payload);

      // Async session recalculation (non-blocking) after every breadcrumb write
      recalcSessionAsync(ctx, employeeId).catch(() => {});

      // Broadcast real-time location update to HR/Admin & Manager clients via Socket.IO
      broadcastLocationUpdate(ctx.organizationId, {
        employee_id: employeeId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        speed: payload.speed,
        heading: payload.heading,
        location_status: 'ON',
        connection_status: 'ONLINE',
        last_ping_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Location ping received',
        employee_id: employeeId,
      });
    } catch (error) {
      console.error('[LivetrackingController] postLocationPing error:', error);
      res.status(500).json({ success: false, error: 'Failed to store location ping' });
    }
  };

  /**
   * GET /api/v1/livetracking/sessions?date=YYYY-MM-DD
   * Returns all employee session summaries for a date (HR/Admin only).
   */
  getSessionsForDate = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);

      if (!isHROrAdmin) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const sessions = await repo.getSessionsForDate(ctx, date);
      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('[LivetrackingController] getSessionsForDate error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tracking sessions' });
    }
  };

  /**
   * GET /api/v1/livetracking/sessions/:employeeId?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns session history for a specific employee (HR/Admin only).
   */
  getEmployeeSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);

      if (!isHROrAdmin) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const employeeId = parseInt(req.params.employeeId, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ success: false, error: 'Invalid employeeId' });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const from = (req.query.from as string) || thirtyDaysAgo;
      const to = (req.query.to as string) || today;

      const sessions = await repo.getEmployeeSessions(ctx, employeeId, from, to);
      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('[LivetrackingController] getEmployeeSessions error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch employee sessions' });
    }
  };

  /**
   * POST /api/v1/livetracking/save-location
   * Explicitly save/pin an employee's location & auto-update location_walk history.
   * A caller may only pin their OWN location unless they are HR/Admin — otherwise
   * any employee could overwrite another employee's location by passing employee_id.
   */
  saveLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const { employee_id, latitude, longitude, address } = req.body;

      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);
      const selfEmployeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);

      const targetEmpId = employee_id && isHROrAdmin ? Number(employee_id) : selfEmployeeId;

      if (!targetEmpId || isNaN(targetEmpId)) {
        res.status(400).json({ success: false, error: 'Invalid or missing employee_id' });
        return;
      }

      if (!isValidLatLng(latitude, longitude)) {
        res.status(400).json({ success: false, error: 'Latitude and Longitude are required and must be valid' });
        return;
      }

      await repo.saveEmployeeLocation(ctx, targetEmpId, latitude, longitude, address);

      res.json({
        success: true,
        message: 'Location pinned and location_walk updated in database',
        employee_id: targetEmpId,
      });
    } catch (error) {
      console.error('[LivetrackingController] saveLocation error:', error);
      res.status(500).json({ success: false, error: 'Failed to save location' });
    }
  };
}
