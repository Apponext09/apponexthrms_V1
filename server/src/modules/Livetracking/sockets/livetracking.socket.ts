// ============================================================
// LiveTrackingSocket — Socket.IO /live-tracking namespace
// server/src/modules/Livetracking/sockets/livetracking.socket.ts
//
// NOTE: JwtClaims only contains sub (userId as string), oid (orgId as string), sid.
// employeeId is NOT in the JWT — we resolve it via DB lookup on connection.
// ============================================================
import type { Server, Socket } from 'socket.io';
import { verifyToken } from '../../../common/lib/jwt';
import { LivetrackingRepository } from '../repositories/LivetrackingRepository';
import { getKnex } from '../../../db/knex';
import { logger } from '@/common/lib/logger';
import type { LocationPingPayload, LocationStatusChangePayload } from '../types/livetracking.types';
import type { TenantContext } from '../../../db/types';
import { calculateSessionMetrics } from '../utils/sessionCalculator';

/** Resolve employee_id and role from the users table */
async function resolveSocketUser(
  orgId: number,
  userId: number
): Promise<{ employeeId: number; isHROrAdmin: boolean; departmentId: number | null }> {
  const db = getKnex();

  // Get employee_id and email from users table
  const userRow = await db('users')
    .where('id', userId)
    .where('organization_id', orgId)
    .select('employee_id', 'email')
    .first()
    .catch(() => null);

  let employeeId = userRow?.employee_id ? Number(userRow.employee_id) : 0;

  // Fallback: match by email if employee_id is not set on users row
  if (!employeeId && userRow?.email) {
    const empRow = await db('employees')
      .where('organization_id', orgId)
      .whereRaw('LOWER(email) = ?', [userRow.email.toLowerCase()])
      .whereIn('status', ['active', 'probation', 'onboarding', 'notice'])
      .select('id')
      .first()
      .catch(() => null);

    if (empRow?.id) {
      employeeId = Number(empRow.id);
      // Backfill for future connections
      await db('users')
        .where('id', userId)
        .update({ employee_id: employeeId })
        .catch(() => {});
    }
  }

  // Get roles from user_roles
  const roleRows = await db('user_roles as ur')
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .where('ur.organization_id', orgId)
    .select('r.code', 'r.name')
    .catch(() => []);

  const adminPatterns = ['admin', 'hr', 'organization_admin', 'hr_manager', 'hr_admin', 'super_admin'];
  const isHROrAdmin = roleRows.some((row: any) => {
    const codeNorm = String(row?.code || '').toLowerCase().replace(/[\s-]+/g, '_');
    const nameNorm = String(row?.name || '').toLowerCase().replace(/[\s-]+/g, '_');
    return adminPatterns.some((p) => codeNorm.includes(p) || nameNorm.includes(p));
  });

  // Get department from employees table
  let departmentId: number | null = null;
  if (employeeId) {
    const empRow = await db('employees')
      .where('id', employeeId)
      .select('current_department_id')
      .first()
      .catch(() => null);
    departmentId = empRow?.current_department_id ?? null;
  }

  return { employeeId, isHROrAdmin, departmentId };
}

const repo = new LivetrackingRepository();

/** Minimum distance in meters before saving a new breadcrumb */
const MIN_DISTANCE_METERS = 20;
/** Minimum time in ms between breadcrumb saves (15 seconds) */
const MIN_PING_INTERVAL_MS = 15_000;

/** Per-socket state for throttling breadcrumb writes */
interface SocketState {
  employeeId: number;
  organizationId: number;
  userId: number;
  roles: string[];
  lastLat: number | null;
  lastLng: number | null;
  lastBreadcrumbAt: number;
}

const socketState = new Map<string, SocketState>();

/** Haversine distance between two coordinates in meters */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class LiveTrackingSocket {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupNamespace();
    logger.info('LiveTrackingSocket namespace /live-tracking initialized');
  }

  private setupNamespace(): void {
    const nsp = this.io.of('/live-tracking');

    // ── JWT Auth middleware on socket connection ──────────────────────────────
    nsp.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }
        const claims = verifyToken(token);
        (socket as any)._claims = claims;
        next();
      } catch {
        next(new Error('Invalid or expired token'));
      }
    });

    nsp.on('connection', async (socket: Socket) => {
      const claims = (socket as any)._claims;
      // JWT sub = userId (string), oid = orgId (string)
      const orgId: number = parseInt(claims?.oid || '0', 10) || parseInt(claims?.organizationId || '0', 10);
      const userId: number = parseInt(claims?.sub || '0', 10) || parseInt(claims?.userId || claims?.id || '0', 10);

      if (!orgId || !userId) {
        socket.disconnect(true);
        return;
      }

      logger.info(`[LiveTracking] Socket connected: ${socket.id}, user ${userId}, org ${orgId}`);

      // ── Resolve employeeId, role, and department from DB ─────────────────
      let employeeId = 0;
      let isHROrAdmin = false;
      try {
        const resolved = await resolveSocketUser(orgId, userId);
        employeeId = resolved.employeeId;
        isHROrAdmin = resolved.isHROrAdmin;
      } catch (err) {
        logger.warn(`[LiveTracking] Could not resolve user ${userId} — proceeding as employee`);
      }

      // ── Role-based room subscription ──────────────────────────────────────
      if (isHROrAdmin) {
        // HR/Admin → join org-wide room to receive all updates
        socket.join(`org:${orgId}`);
      } else if (employeeId) {
        // Manager / Team Lead / Employee → join their personal and team rooms
        socket.join(`team:${orgId}:${employeeId}`);
        socket.join(`employee:${orgId}:${employeeId}`);
      }

      // Store per-socket state for throttling
      socketState.set(socket.id, {
        employeeId,
        organizationId: orgId,
        userId,
        roles: [],
        lastLat: null,
        lastLng: null,
        lastBreadcrumbAt: 0,
      });

      const ctx: TenantContext = {
        organizationId: orgId,
        userId,
        sessionUuid: socket.id,
      };

      // Ensure the live_location row exists and mark employee ONLINE
      if (employeeId) {
        repo.ensureLiveRow(ctx, employeeId).catch(() => {});
      }

      // ── Event: employee:ping_location ─────────────────────────────────────
      // Sent by employee app every 10-15 seconds or on significant movement
      socket.on('employee:ping_location', async (payload: LocationPingPayload) => {
        if (!employeeId) return;

        const { latitude, longitude } = payload;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

        try {
          const state = socketState.get(socket.id)!;
          const now = Date.now();

          // Always update the live snapshot
          await repo.upsertLiveLocation(ctx, employeeId, payload);

          // Throttle breadcrumb inserts by distance and time
          const shouldSaveBreadcrumb =
            state.lastLat === null ||
            now - state.lastBreadcrumbAt >= MIN_PING_INTERVAL_MS ||
            haversineDistance(state.lastLat!, state.lastLng!, latitude, longitude) >= MIN_DISTANCE_METERS;

          if (shouldSaveBreadcrumb) {
            await repo.addLocationBreadcrumb(ctx, employeeId, payload);
            state.lastLat = latitude;
            state.lastLng = longitude;
            state.lastBreadcrumbAt = now;

            // Non-blocking session recalculation
            (async () => {
              try {
                const today = new Date().toISOString().slice(0, 10);
                const breadcrumbs = await repo.getLocationHistory(ctx, employeeId, today);
                if (breadcrumbs && breadcrumbs.length > 0) {
                  const metrics = calculateSessionMetrics(breadcrumbs);
                  await repo.upsertTrackingSession(ctx, employeeId, today, metrics);
                }
              } catch (err) {
                logger.warn('[LiveTracking] session recalc failed:', err);
              }
            })();
          }

          // Broadcast to HR/Admin (org room) and Manager rooms
          const updateEvent = {
            employee_id: employeeId,
            latitude,
            longitude,
            accuracy: payload.accuracy,
            speed: payload.speed,
            heading: payload.heading,
            location_status: 'ON',
            connection_status: 'ONLINE',
            last_ping_at: new Date().toISOString(),
          };

          nsp.emit('tracking:location_updated', updateEvent);
          nsp.to(`org:${orgId}`).emit('tracking:location_updated', updateEvent);
          this._broadcastToManagerRooms(nsp, orgId, updateEvent);
        } catch (err) {
          logger.error('[LiveTracking] ping_location error:', err);
        }
      });

      // ── Event: employee:location_status_change ────────────────────────────
      // Fired instantly when employee turns GPS ON or OFF
      socket.on('employee:location_status_change', async (payload: LocationStatusChangePayload) => {
        if (!employeeId) return;

        const status = payload?.status === 'ON' ? 'ON' : 'OFF';
        try {
          await repo.updateLocationStatus(ctx, employeeId, status);

          const event = {
            employee_id: employeeId,
            location_status: status,
            timestamp: new Date().toISOString(),
          };

          // Broadcast real-time alert to HR/Admin and Managers
          nsp.to(`org:${orgId}`).emit('tracking:location_status_changed', event);
          this._broadcastToManagerRooms(nsp, orgId, event);

          logger.info(`[LiveTracking] Employee ${employeeId} location status changed to ${status}`);
        } catch (err) {
          logger.error('[LiveTracking] location_status_change error:', err);
        }
      });

      // ── Disconnect: mark employee OFFLINE ─────────────────────────────────
      socket.on('disconnect', async () => {
        logger.info(`[LiveTracking] Socket disconnected: ${socket.id}`);
        const state = socketState.get(socket.id);
        socketState.delete(socket.id);

        if (!state?.employeeId) return;

        try {
          await repo.updateConnectionStatus(ctx, state.employeeId, 'OFFLINE');

          const event = {
            employee_id: state.employeeId,
            connection_status: 'OFFLINE',
            timestamp: new Date().toISOString(),
          };

          nsp.to(`org:${orgId}`).emit('tracking:status_changed', event);
          this._broadcastToManagerRooms(nsp, orgId, event);
        } catch (err) {
          logger.error('[LiveTracking] disconnect cleanup error:', err);
        }
      });
    });
  }

  /** Emit event to all online manager rooms for this org */
  private _broadcastToManagerRooms(nsp: any, orgId: number, event: object): void {
    // Manager rooms are named `team:{orgId}:{managerEmployeeId}`
    // We emit to a wildcard pattern by iterating connected rooms
    const roomPattern = `team:${orgId}:`;
    for (const [roomName] of nsp.adapter.rooms ?? []) {
      if (typeof roomName === 'string' && roomName.startsWith(roomPattern)) {
        nsp.to(roomName).emit('tracking:location_updated', event);
      }
    }
  }

  /** Broadcast location update to org (HR/Admin) and manager rooms */
  broadcastLocationUpdate(orgId: number, updateEvent: object): void {
    const nsp = this.io.of('/live-tracking');
    nsp.to(`org:${orgId}`).emit('tracking:location_updated', updateEvent);
    this._broadcastToManagerRooms(nsp, orgId, updateEvent);
  }

  /** Broadcast snapshot to newly connected HR/Admin client */
  broadcastSnapshot(orgId: number, data: object[]): void {
    this.io.of('/live-tracking').to(`org:${orgId}`).emit('tracking:snapshot', data);
  }
}

let socketInstance: LiveTrackingSocket | null = null;

export function initializeLiveTrackingSocket(io: Server): LiveTrackingSocket {
  socketInstance = new LiveTrackingSocket(io);
  return socketInstance;
}

export function broadcastLocationUpdate(orgId: number, updateEvent: object): void {
  if (socketInstance) {
    socketInstance.broadcastLocationUpdate(orgId, updateEvent);
  }
}
