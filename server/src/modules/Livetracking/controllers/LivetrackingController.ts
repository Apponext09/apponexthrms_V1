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

/** Determine if user is HR or Admin by inspecting JWT claims and DB user_roles */
async function checkIsHROrAdmin(organizationId: number, userId: number, userClaims: any): Promise<boolean> {
  const adminPatterns = ['admin', 'hr', 'organization_admin', 'hr_manager', 'hr_admin', 'super_admin'];

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

export class LivetrackingController {
  /**
   * GET /api/v1/livetracking/live
   * Returns current live location snapshot for all accessible employees.
   * - HR / Admin / Super Admin → full org
   * - Manager / Team Lead → reporting team (multi-tier)
   */
  getLiveLocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const user = (req as any).user;

      const isHROrAdmin = await checkIsHROrAdmin(ctx.organizationId, ctx.userId, user);
      console.log('[LiveTracking] getLiveLocations - userId:', ctx.userId, 'isHROrAdmin:', isHROrAdmin);

      let employees;

      if (isHROrAdmin) {
        employees = await repo.getLiveLocationsForOrg(ctx);
        console.log('[LiveTracking] HR/Admin path - fetched', employees.length, 'employees');
      } else {
        // Manager / Team Lead — resolve their employee_id from DB
        const employeeId = await resolveEmployeeId(ctx.organizationId, ctx.userId);
        console.log('[LiveTracking] Manager path - resolved employeeId:', employeeId);

        if (!employeeId) {
          // Fallback: return all org employees if employee mapping not found
          employees = await repo.getLiveLocationsForOrg(ctx);
          console.log('[LiveTracking] Fallback path - fetched', employees.length, 'employees');
        } else {
          // Resolve department
          const empRow = await getKnex()('employees')
            .where('id', employeeId)
            .select('current_department_id')
            .first()
            .catch(() => null);

          const departmentId: number | null = empRow?.current_department_id ?? null;
          employees = await repo.getLiveLocationsForTeam(ctx, employeeId, departmentId);
          console.log('[LiveTracking] Team path - fetched', employees.length, 'employees');
        }
      }

      res.json({ success: true, data: employees });
    } catch (error: any) {
      console.error('[LivetrackingController] getLiveLocations error:', error?.message || error);
      console.error('[LivetrackingController] SQL error details:', error?.sqlMessage, '| SQL:', error?.sql);
      res.status(500).json({ success: false, error: 'Failed to fetch live locations' });
    }
  };

  /**
   * GET /api/v1/livetracking/history/:employeeId?date=YYYY-MM-DD
   * Returns historical location breadcrumbs for route playback.
   */
  getRouteHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = (req as any).ctx as TenantContext;
      const employeeId = parseInt(req.params.employeeId, 10);
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

      if (isNaN(employeeId)) {
        res.status(400).json({ success: false, error: 'Invalid employeeId' });
        return;
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

      const payload = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy !== undefined ? parseFloat(accuracy) : undefined,
        speed: speed !== undefined ? parseFloat(speed) : undefined,
        heading: heading !== undefined ? parseFloat(heading) : undefined,
      };

      await repo.upsertLiveLocation(ctx, employeeId, payload);
      await repo.addLocationBreadcrumb(ctx, employeeId, payload);

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
}
