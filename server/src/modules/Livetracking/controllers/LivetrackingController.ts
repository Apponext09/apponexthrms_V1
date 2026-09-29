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
import { ingestFixes, MAX_BATCH_POINTS, SEGMENT_GAP_MS } from '../services/locationIngest';
import {
  checkIsHROrAdmin,
  getManagerChain,
  getSubordinateIds,
  localDateStr,
  resolveEmployeeId,
} from '../utils/access';

const repo = new LivetrackingRepository();

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate an optional YYYY-MM-DD query param, falling back to server-local today */
function parseDateParam(value: unknown, fallback: string = localDateStr()): string | null {
  if (value === undefined || value === '') return fallback;
  return typeof value === 'string' && DATE_RE.test(value) ? value : null;
}

/** Meters between two points (equirectangular — accurate enough at breadcrumb scale) */
function approxMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const x = (((lng2 - lng1) * Math.PI) / 180) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371000;
}

const TRAIL_MIN_SPACING_M = 10;

/** Drop stationary jitter (points within ~10m of the last kept one); keep gaps and the latest point */
function thinTrail(points: Array<[number, number, number]>): Array<[number, number, number]> {
  const kept: Array<[number, number, number]> = [];
  for (const p of points) {
    const last = kept[kept.length - 1];
    if (!last || p[2] - last[2] >= SEGMENT_GAP_MS || approxMeters(last[0], last[1], p[0], p[1]) >= TRAIL_MIN_SPACING_M) {
      kept.push(p);
    }
  }
  const final = points[points.length - 1];
  if (final && kept[kept.length - 1] !== final) kept.push(final);
  return kept;
}

export class LivetrackingController {
  /**
   * GET /api/v1/livetracking/live
   * Returns current live location snapshot for all accessible employees.
   * - HR / Admin / Super Admin → full org
   * - Manager / Team Lead → self + everyone below them in the reporting tree
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

        const subordinateIds = await getSubordinateIds(ctx.organizationId, employeeId);
        employees = await repo.getLiveLocationsForEmployees(ctx, [employeeId, ...subordinateIds]);
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
   * - Manager → anyone below them in the reporting tree
   * - Regular employee → self only
   */
  getRouteHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const employeeId = parseInt(req.params.employeeId, 10);
      const date = parseDateParam(req.query.date);

      if (isNaN(employeeId)) {
        res.status(400).json({ success: false, error: 'Invalid employeeId' });
        return;
      }
      if (!date) {
        res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
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
          const targetChain = await getManagerChain(ctx.organizationId, employeeId);
          if (!targetChain.includes(requesterEmployeeId)) {
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
   * Resolves employee_id from the authenticated user's DB record — a client-sent
   * employee id is never used. Goes through the same pipeline as socket pings.
   */
  postLocationPing = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;

      const employeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);
      if (!employeeId) {
        res.status(403).json({
          success: false,
          error: 'No employee record linked to this user account',
        });
        return;
      }

      const { latitude, longitude, accuracy, speed, heading, timestamp } = req.body ?? {};
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

      const result = await ingestFixes(
        ctx.organizationId,
        employeeId,
        [{ latitude: parsedLat, longitude: parsedLng, accuracy, speed, heading, timestamp }],
        'http'
      );

      res.json({
        success: true,
        message: 'Location ping received',
        employee_id: employeeId,
        accepted: result.accepted > 0,
      });
    } catch (error) {
      console.error('[LivetrackingController] postLocationPing error:', error);
      res.status(500).json({ success: false, error: 'Failed to store location ping' });
    }
  };

  /**
   * POST /api/v1/livetracking/ping/batch
   * Replays fixes the tracker buffered while offline and the socket is still down.
   * Body: { points: [{ latitude, longitude, accuracy?, speed?, heading?, timestamp }] }
   * Duplicates / out-of-order / stale / invalid points are dropped server-side.
   */
  postLocationBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const points = req.body?.points;

      if (!Array.isArray(points) || points.length === 0 || points.length > MAX_BATCH_POINTS) {
        res.status(400).json({ success: false, error: `points must be an array of 1-${MAX_BATCH_POINTS} fixes` });
        return;
      }

      const employeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);
      if (!employeeId) {
        res.status(403).json({ success: false, error: 'No employee record linked to this user account' });
        return;
      }

      const result = await ingestFixes(ctx.organizationId, employeeId, points, 'replay');
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[LivetrackingController] postLocationBatch error:', error);
      res.status(500).json({ success: false, error: 'Failed to store buffered locations' });
    }
  };

  /**
   * GET /api/v1/livetracking/trails?employee_ids=1,2,3&date=YYYY-MM-DD&max_points=300
   * One day's route for many employees in one request (dashboard seeding), as
   * compact [lat, lng, epochMs] tuples. Points within ~10m of the previous kept
   * point are thinned out; only the last max_points per employee are sent.
   * Scope: HR/Admin → any employee in the org; others → self + reporting tree.
   */
  getTrails = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;
      const date = parseDateParam(req.query.date);
      if (!date) {
        res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
        return;
      }

      const requested = String(req.query.employee_ids ?? '')
        .split(',')
        .map((v) => parseInt(v, 10))
        .filter((v) => Number.isInteger(v) && v > 0);
      if (requested.length === 0) {
        res.json({ success: true, data: {} });
        return;
      }
      if (requested.length > 2000) {
        res.status(400).json({ success: false, error: 'Too many employee_ids (max 2000)' });
        return;
      }

      const maxPointsRaw = parseInt(String(req.query.max_points ?? ''), 10);
      const maxPoints = Number.isInteger(maxPointsRaw) ? Math.min(Math.max(maxPointsRaw, 2), 2000) : 300;

      let allowed = requested;
      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);
      if (!isHROrAdmin) {
        const selfId = await resolveEmployeeId(ctx.organizationId, ctx.userId);
        if (!selfId) {
          res.json({ success: true, data: {} });
          return;
        }
        const visible = new Set([selfId, ...(await getSubordinateIds(ctx.organizationId, selfId))]);
        allowed = requested.filter((id) => visible.has(id));
      }

      // The query itself is scoped to ctx.organizationId, so ids from another org return nothing.
      const trails = await repo.getTrailsForEmployees(ctx, allowed, date);
      const data: Record<number, Array<[number, number, number]>> = {};
      for (const [empId, points] of trails) {
        data[empId] = thinTrail(points).slice(-maxPoints);
      }
      res.json({ success: true, data });
    } catch (error) {
      console.error('[LivetrackingController] getTrails error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch route trails' });
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

      const date = parseDateParam(req.query.date);
      if (!date) {
        res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' });
        return;
      }
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

      const from = parseDateParam(req.query.from, localDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
      const to = parseDateParam(req.query.to);
      if (!from || !to) {
        res.status(400).json({ success: false, error: 'from/to must be YYYY-MM-DD' });
        return;
      }

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
