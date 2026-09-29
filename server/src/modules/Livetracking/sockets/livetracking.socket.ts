// ============================================================
// LiveTrackingSocket — Socket.IO /live-tracking namespace
// server/src/modules/Livetracking/sockets/livetracking.socket.ts
//
// NOTE: JwtClaims only contains sub (userId as string), oid (orgId as string), sid.
// employeeId is NOT in the JWT — we resolve it via DB lookup on connection.
//
// Location processing (validation, ordering, persistence, broadcasting) lives
// in services/locationIngest.ts. Viewers receive batched deltas as
// `tracking:locations` — never the whole route.
// ============================================================
import type { Server, Socket } from 'socket.io';
import { verifyToken } from '../../../common/lib/jwt';
import { LivetrackingRepository } from '../repositories/LivetrackingRepository';
import { logger } from '@/common/lib/logger';
import type { LocationStatusChangePayload } from '../types/livetracking.types';
import type { TenantContext } from '../../../db/types';
import { checkIsHROrAdmin, getManagerChain, resolveEmployeeId } from '../utils/access';
import {
  attachLocationBroadcaster,
  flushEmployeeBeforeStatusChange,
  ingestFixes,
  markSessionDirty,
  MAX_BATCH_POINTS,
  viewerRooms,
  type IncomingFix,
} from '../services/locationIngest';

const repo = new LivetrackingRepository();

/** Minimum spacing between replay batches from one socket */
const MIN_BATCH_INTERVAL_MS = 250;

/** Sockets per employee — an employee stays ONLINE while any tab/device is connected */
const employeeSocketCount = new Map<string, number>();

export class LiveTrackingSocket {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupNamespace();
    logger.info('LiveTrackingSocket namespace /live-tracking initialized');
  }

  private setupNamespace(): void {
    const nsp = this.io.of('/live-tracking');
    attachLocationBroadcaster(nsp);

    // ── JWT Auth middleware on socket connection ──────────────────────────────
    // A missing/invalid token is REJECTED, not defaulted to user 1 / org 1.
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
      } catch {
        next(new Error('Authentication failed'));
      }
    });

    nsp.on('connection', (socket: Socket) => {
      const claims = (socket as any)._claims || {};
      const orgId = parseInt(String(claims.oid), 10);
      const userId = parseInt(String(claims.sub), 10);

      if (!orgId || !userId) {
        socket.disconnect(true);
        return;
      }

      logger.info(`[LiveTracking] Socket connected: ${socket.id}, user ${userId}, org ${orgId}`);

      const ctx: TenantContext = {
        organizationId: orgId,
        userId,
        sessionUuid: socket.id,
      };

      // Identity is resolved asynchronously, but every listener is registered
      // synchronously below and awaits it — events a client sends immediately
      // after connecting (e.g. an offline replay batch) are never dropped.
      let employeeId = 0;
      let rooms: string[] = [];
      let countKey = '';
      /** Whether this socket was added to employeeSocketCount (it may disconnect before identity resolves) */
      let counted = false;
      const ready = (async () => {
        let isHROrAdmin = false;
        let managerChain: number[] = [];
        try {
          const [resolvedId, hrAdmin] = await Promise.all([
            resolveEmployeeId(orgId, userId),
            checkIsHROrAdmin(orgId, userId),
          ]);
          employeeId = resolvedId ?? 0;
          isHROrAdmin = hrAdmin;
          if (employeeId) managerChain = await getManagerChain(orgId, employeeId);
        } catch {
          logger.warn(`[LiveTracking] Could not resolve user ${userId} — proceeding as employee`);
        }

        // ── Room subscription ───────────────────────────────────────────────
        // HR/Admin → org-wide room. Everyone with an employee record → their own
        // room, which is also where their reportees' events are delivered.
        if (isHROrAdmin) socket.join(`org:${orgId}`);
        if (employeeId) socket.join(`employee:${orgId}:${employeeId}`);

        rooms = viewerRooms(orgId, employeeId, managerChain);
        countKey = `${orgId}:${employeeId}`;

        if (employeeId && socket.connected) {
          employeeSocketCount.set(countKey, (employeeSocketCount.get(countKey) ?? 0) + 1);
          counted = true;
          // Ensure the live_location row exists and mark employee ONLINE
          repo.ensureLiveRow(ctx, employeeId).catch(() => {});
        }
      })();

      // ── Event: employee:ping_location — one live fix ──────────────────────
      // Coordinates arrive already Kalman-smoothed by the client.
      socket.on('employee:ping_location', async (payload: IncomingFix) => {
        await ready;
        if (!employeeId || !payload || typeof payload !== 'object') return;
        ingestFixes(orgId, employeeId, [payload], 'socket').catch((err) =>
          logger.error('[LiveTracking] ping_location error:', err)
        );
      });

      // ── Event: employee:location_batch — fixes buffered while offline ─────
      // Acked so the tracker only discards its buffer once the server has it.
      let lastBatchAt = 0;
      socket.on('employee:location_batch', async (payload: { points?: IncomingFix[] }, ack?: (res: object) => void) => {
        await ready;
        const reply = typeof ack === 'function' ? ack : () => {};
        const points = Array.isArray(payload?.points) ? payload.points : null;
        const now = Date.now();
        if (!employeeId || !points || points.length > MAX_BATCH_POINTS || now - lastBatchAt < MIN_BATCH_INTERVAL_MS) {
          reply({ ok: false, error: 'rejected' });
          return;
        }
        lastBatchAt = now;
        try {
          const result = await ingestFixes(orgId, employeeId, points, 'replay');
          reply({ ok: true, ...result });
        } catch (err) {
          logger.error('[LiveTracking] location_batch error:', err);
          reply({ ok: false, error: 'failed' });
        }
      });

      // ── Event: employee:location_status_change ────────────────────────────
      // Broadcast only on an actual ON↔OFF transition — re-sending the same
      // status (the client used to send ON with every fix) must not spam viewers.
      socket.on('employee:location_status_change', async (payload: LocationStatusChangePayload) => {
        await ready;
        if (!employeeId) return;

        const status = payload?.status === 'ON' ? 'ON' : 'OFF';
        try {
          // A buffered snapshot (which carries ON) must not land after the OFF write
          if (status === 'OFF') await flushEmployeeBeforeStatusChange(orgId, employeeId);
          const changed = await repo.updateLocationStatus(ctx, employeeId, status);
          if (!changed) return;

          nsp.to(rooms).emit('tracking:location_status_changed', {
            employee_id: employeeId,
            location_status: status,
            timestamp: new Date().toISOString(),
          });

          logger.info(`[LiveTracking] Employee ${employeeId} location status changed to ${status}`);
        } catch (err) {
          logger.error('[LiveTracking] location_status_change error:', err);
        }
      });

      // ── Disconnect: mark employee OFFLINE ─────────────────────────────────
      socket.on('disconnect', async () => {
        logger.info(`[LiveTracking] Socket disconnected: ${socket.id}`);
        await ready;
        if (!employeeId || !counted) return;

        // Another tab/device of the same employee is still connected — stay ONLINE
        const remaining = (employeeSocketCount.get(countKey) ?? 1) - 1;
        if (remaining > 0) {
          employeeSocketCount.set(countKey, remaining);
          return;
        }
        employeeSocketCount.delete(countKey);

        try {
          await flushEmployeeBeforeStatusChange(orgId, employeeId);
          await repo.updateConnectionStatus(ctx, employeeId, 'OFFLINE');
          markSessionDirty(orgId, employeeId);

          nsp.to(rooms).emit('tracking:status_changed', {
            employee_id: employeeId,
            connection_status: 'OFFLINE',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          logger.error('[LiveTracking] disconnect cleanup error:', err);
        }
      });
    });
  }
}

let socketInstance: LiveTrackingSocket | null = null;

export function initializeLiveTrackingSocket(io: Server): LiveTrackingSocket {
  // No socket survives a server restart, so any ONLINE row left behind by a
  // crash/redeploy (no disconnect event fired) is stale.
  repo.markAllOffline().catch((err) => logger.warn('[LiveTracking] Could not reset connection status:', err));
  socketInstance = new LiveTrackingSocket(io);
  return socketInstance;
}
