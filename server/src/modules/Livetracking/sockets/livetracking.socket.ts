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
import { snapToRoad } from '../utils/roadSnapper';
import { generateRoutedTrail } from '../utils/routeGenerator';

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

  const adminPatterns = ['admin', 'hr', 'organization_admin', 'super_admin', 'ceo', 'owner', 'director', 'executive'];
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

// ── Server-side 1D Kalman filter ─────────────────────────────────────────────
// Smooths per-employee GPS coordinates server-side as a second pass
// (client Kalman already runs on the device; server Kalman guards against
//  any client-side implementation gaps or legacy app versions).
interface KalmanAxis {
  estimate: number;
  errorCovariance: number;
}
function kalmanUpdate(
  state: KalmanAxis,
  measurement: number,
  measurementAccuracy: number | null | undefined,
  Q = 0.0001 // process noise
): KalmanAxis {
  // Weight measurement noise by the GPS-reported accuracy (metres) — a coarse
  // fix was previously blended with the same trust as a precise GPS lock,
  // which could visibly drag an accurate fix off target.
  const R = Math.max(1, (measurementAccuracy ?? 15) / 5);
  const predictedErr = state.errorCovariance + Q;
  const K = predictedErr / (predictedErr + R); // Kalman gain
  return {
    estimate: state.estimate + K * (measurement - state.estimate),
    errorCovariance: (1 - K) * predictedErr,
  };
}

/** Per-socket state for throttling breadcrumb writes and Kalman smoothing */
interface SocketState {
  employeeId: number;
  organizationId: number;
  userId: number;
  roles: string[];
  lastLat: number | null;
  lastLng: number | null;
  lastBreadcrumbAt: number;
  /** Server-side Kalman filter state (null until first valid ping) */
  kalmanLat: KalmanAxis | null;
  kalmanLng: KalmanAxis | null;
  /** Routed trail for real-time updates (snapped coords) */
  routedTrail: Array<{ latitude: number; longitude: number; recorded_at: string }>;
  /** Last broadcast routed polyline to avoid redundant broadcasts */
  lastRoutedPolyline: [number, number][] | null;
}

const socketState = new Map<string, SocketState>();

/** Reject out-of-range / null-island / non-finite coordinates (spoofed or garbage GPS data) */
function isValidLatLng(lat: unknown, lng: unknown): boolean {
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

/** ~8 km/h — below this we treat movement as on-foot/stationary, not a vehicle */
const VEHICLE_SPEED_THRESHOLD_MPS = 2.2;

/** Estimate instantaneous speed (m/s) from the socket's last known point when the
 * browser didn't report GeolocationCoordinates.speed (common indoors / low accuracy). */
function estimateSpeedMps(state: SocketState, lat: number, lng: number, nowMs: number): number | null {
  if (state.lastLat == null || state.lastLng == null || !state.lastBreadcrumbAt) return null;
  const dtSec = (nowMs - state.lastBreadcrumbAt) / 1000;
  if (dtSec <= 0) return null;
  return haversineDistance(state.lastLat, state.lastLng, lat, lng) / dtSec;
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
    // A missing/invalid token is REJECTED, not defaulted to user 1 / org 1 —
    // that fallback previously let anyone connect and read/pollute org 1's
    // live tracking feed with an unauthenticated or malformed token.
    nsp.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.query?.token as string | undefined) ||
          (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!token) {
          next(new Error('Authentication required'));
          return;
        }

        let claims: any;
        try {
          claims = verifyToken(token);
        } catch {
          next(new Error('Invalid or expired token'));
          return;
        }

        if (!claims?.sub || !claims?.oid) {
          next(new Error('Invalid token claims'));
          return;
        }

        (socket as any)._claims = claims;
        next();
      } catch (err: any) {
        next(new Error('Authentication failed'));
      }
    });

    nsp.on('connection', async (socket: Socket) => {
      const claims = (socket as any)._claims || {};
      const orgId: number =
        parseInt(claims?.oid || claims?.organizationId || claims?.organization_id || '1', 10) || 1;
      const userId: number =
        parseInt(claims?.sub || claims?.userId || claims?.user_id || claims?.id || claims?.cid || '1', 10) || 1;

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

      const ctx: TenantContext = {
        organizationId: orgId,
        userId,
        sessionUuid: socket.id,
      };

      // ── Rehydrate today's trail from DB so a socket reconnect (network drop,
      // phone lock/unlock, app backgrounded while stopped, etc.) NEVER resets the
      // in-memory trail to empty. Without this, every reconnect started a fresh
      // empty routedTrail, so the next broadcast would replace the client's full
      // day's line with just the post-reconnect segment — visually "breaking" the
      // line right where the employee had paused. ─────────────────────────────
      let seedTrail: Array<{ latitude: number; longitude: number; recorded_at: string }> = [];
      if (employeeId) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const history = await repo.getLocationHistory(ctx, employeeId, today);
          seedTrail = (history || []).map((h: any) => ({
            latitude: Number(h.latitude),
            longitude: Number(h.longitude),
            recorded_at: h.recorded_at || h.recordedAt || new Date().toISOString(),
          }));
        } catch (err) {
          logger.warn(`[LiveTracking] Could not rehydrate trail for employee ${employeeId}:`, err as any);
        }
      }

      // Store per-socket state for throttling (with Kalman state initialized)
      socketState.set(socket.id, {
        employeeId,
        organizationId: orgId,
        userId,
        roles: [],
        lastLat: null,
        lastLng: null,
        lastBreadcrumbAt: 0,
        kalmanLat: null,
        kalmanLng: null,
        routedTrail: seedTrail,
        lastRoutedPolyline: null,
      });

      // Ensure the live_location row exists and mark employee ONLINE
      if (employeeId) {
        repo.ensureLiveRow(ctx, employeeId).catch(() => {});
      }

      // ── Event: employee:ping_location ─────────────────────────────────────
      // Sent by employee app every 10-15 seconds or on significant movement
      // NOW: Generates real-time routes like Swiggy/Zomato
      socket.on('employee:ping_location', async (payload: LocationPingPayload) => {
        if (!employeeId) return;

        const { latitude, longitude } = payload;
        if (!isValidLatLng(latitude, longitude)) return;

        try {
          const state = socketState.get(socket.id)!;
          const now = Date.now();
          const nowIso = new Date().toISOString();

          // ── Server-side Kalman filter (2nd pass on top of client Kalman) ──────
          let smoothLat = latitude;
          let smoothLng = longitude;

          if (state.kalmanLat === null || state.kalmanLng === null) {
            state.kalmanLat = { estimate: latitude, errorCovariance: 1 };
            state.kalmanLng = { estimate: longitude, errorCovariance: 1 };
          } else {
            state.kalmanLat = kalmanUpdate(state.kalmanLat, latitude, payload.accuracy);
            state.kalmanLng = kalmanUpdate(state.kalmanLng, longitude, payload.accuracy);
          }
          smoothLat = state.kalmanLat.estimate;
          smoothLng = state.kalmanLng.estimate;

          // ── Smart OSRM Road Snap (non-blocking, max 3s timeout, 60s cache) ─────
          // Only snap onto the nearest DRIVING road when the employee looks like
          // they're actually in a vehicle — snapping every fix unconditionally
          // used to drag on-foot movement (walking into a building, a market,
          // a pedestrian area) up to 50m onto the nearest road, making field
          // visits look inaccurate. Below vehicle speed, use the raw Kalman-
          // smoothed GPS fix as-is.
          let broadcastLat = smoothLat;
          let broadcastLng = smoothLng;
          let wasSnapped = false;

          const reportedSpeed =
            typeof payload.speed === 'number' && Number.isFinite(payload.speed) ? payload.speed : null;
          const impliedSpeed = reportedSpeed ?? estimateSpeedMps(state, smoothLat, smoothLng, now);
          const looksLikeVehicle = impliedSpeed != null && impliedSpeed >= VEHICLE_SPEED_THRESHOLD_MPS;

          if (looksLikeVehicle) {
            try {
              const snapped = await snapToRoad(smoothLat, smoothLng);
              broadcastLat = snapped.latitude;
              broadcastLng = snapped.longitude;
              wasSnapped = snapped.snapped;
            } catch {
              // OSRM unavailable — use Kalman-smoothed coords
            }
          }

          // Always update the live snapshot with road-snapped coordinates
          await repo.upsertLiveLocation(ctx, employeeId, {
            ...payload,
            latitude: broadcastLat,
            longitude: broadcastLng,
          });

          // Throttle breadcrumb inserts by distance and time
          const shouldSaveBreadcrumb =
            state.lastLat === null ||
            now - state.lastBreadcrumbAt >= MIN_PING_INTERVAL_MS ||
            haversineDistance(state.lastLat!, state.lastLng!, latitude, longitude) >= MIN_DISTANCE_METERS;

          if (shouldSaveBreadcrumb) {
            // ✅ FIXED: Store SNAPPED coordinates in breadcrumbs (not raw GPS)
            // This ensures history playback shows actual roads, not zigzag GPS lines
            await repo.addLocationBreadcrumb(ctx, employeeId, {
              latitude: broadcastLat,
              longitude: broadcastLng,
              accuracy: payload.accuracy,
              speed: payload.speed,
            });

            // Add to in-memory routed trail
            state.routedTrail.push({
              latitude: broadcastLat,
              longitude: broadcastLng,
              recorded_at: nowIso,
            });

            state.lastLat = latitude;
            state.lastLng = longitude;
            state.lastBreadcrumbAt = now;

            // ✅ Broadcast the growing trail on EVERY breadcrumb (not just every 10th)
            // so the live line follows continuously and never appears to "stop" or
            // disconnect after a pause — it always reflects the full trail so far,
            // in step with what was just persisted to the DB. Each point here was
            // already individually road-snapped via snapToRoad() above, so the line
            // is road-following without needing to wait for a full OSRM re-fit.
            const routedEvent = {
              employee_id: employeeId,
              routedTrail: state.routedTrail,
            };
            nsp.to(`org:${orgId}`).emit('tracking:routed_trail_updated', routedEvent);
            this._broadcastToManagerRooms(nsp, orgId, routedEvent, 'tracking:routed_trail_updated');

            (async () => {
              try {
                // Periodically refresh a smoothed multi-segment road-fit in the
                // background (not required for the live line above, which already
                // renders from individually-snapped points).
                if (state.routedTrail.length >= 2 && state.routedTrail.length % 10 === 0) {
                  const fullRoute = await generateRoutedTrail(state.routedTrail, { employeeId });
                  if (fullRoute && fullRoute.length > 0) {
                    state.lastRoutedPolyline = fullRoute;
                  }
                }

                // Non-blocking session recalculation using snapped breadcrumbs
                const today = new Date().toISOString().slice(0, 10);
                const breadcrumbs = await repo.getLocationHistory(ctx, employeeId, today);
                if (breadcrumbs && breadcrumbs.length > 0) {
                  const metrics = calculateSessionMetrics(breadcrumbs);
                  await repo.upsertTrackingSession(ctx, employeeId, today, metrics);
                }
              } catch (err) {
                logger.warn('[LiveTracking] route/session recalc failed:', err);
              }
            })();
          }

          // Broadcast location update (snapped coordinates)
          const updateEvent = {
            employee_id: employeeId,
            latitude: broadcastLat,
            longitude: broadcastLng,
            accuracy: payload.accuracy,
            speed: payload.speed,
            heading: payload.heading,
            location_status: 'ON',
            connection_status: 'ONLINE',
            last_ping_at: nowIso,
            road_snapped: wasSnapped,
          };

          nsp.to(`org:${orgId}`).emit('tracking:location_updated', updateEvent);
          this._broadcastToManagerRooms(nsp, orgId, updateEvent);
          nsp.to(`employee:${orgId}:${employeeId}`).emit('tracking:location_updated', updateEvent);
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
          this._broadcastToManagerRooms(nsp, orgId, event, 'tracking:location_status_changed');

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
          this._broadcastToManagerRooms(nsp, orgId, event, 'tracking:status_changed');
        } catch (err) {
          logger.error('[LiveTracking] disconnect cleanup error:', err);
        }
      });
    });
  }

  /**
   * Emit event to all online manager rooms for this org.
   * NOTE: eventName must match the event actually being broadcast — this used to
   * be hardcoded to 'tracking:location_updated' for every call site, which meant
   * manager-scoped clients received routedTrail/status-change payloads mislabeled
   * as location updates (their client-side handler expects {latitude, longitude, ...}
   * for that event, so it would corrupt the marker position with NaN coordinates).
   */
  private _broadcastToManagerRooms(
    nsp: any,
    orgId: number,
    event: object,
    eventName: string = 'tracking:location_updated'
  ): void {
    // Manager rooms are named `team:{orgId}:{managerEmployeeId}`
    // We emit to a wildcard pattern by iterating connected rooms
    const roomPattern = `team:${orgId}:`;
    for (const [roomName] of nsp.adapter.rooms ?? []) {
      if (typeof roomName === 'string' && roomName.startsWith(roomPattern)) {
        nsp.to(roomName).emit(eventName, event);
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
