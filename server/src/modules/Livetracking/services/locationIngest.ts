// ============================================================
// locationIngest — single pipeline for every incoming location fix
// server/src/modules/Livetracking/services/locationIngest.ts
//
// Socket pings, HTTP fallback pings and offline replay batches all go through
// here, so filtering, ordering and persistence rules are identical for each.
//
//   validate → order/dedupe (device timestamp) → outlier filter → state update
//     → buffered DB writes (flushed in batches) → delta queued per viewer room
//     → rooms flushed as one `tracking:locations` array every BROADCAST_MS
//
// Viewers receive only the new point (plus the previous one for animation);
// they keep the route locally. Road snapping runs in the background after the
// raw breadcrumb is stored and never delays or gates the live update.
// ============================================================
import type { Namespace } from 'socket.io';
import { logger } from '@/common/lib/logger';
import type { TenantContext } from '../../../db/types';
import {
  LivetrackingRepository,
  toMysqlDatetime,
  type BreadcrumbRow,
  type LiveRow,
} from '../repositories/LivetrackingRepository';
import { calculateSessionMetrics } from '../utils/sessionCalculator';
import { snapToRoad } from '../utils/roadSnapper';
import { getManagerChain, localDateStr } from '../utils/access';

const repo = new LivetrackingRepository();

function envNumber(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Fixes coarser than this are dropped entirely (matches the tracker's own filter) */
const MAX_FIX_ACCURACY_M = 500;
/** Fixes coarser than this move the marker but are not stored as route breadcrumbs */
const ROUTE_MAX_ACCURACY_M = envNumber('LIVETRACKING_ROUTE_MAX_ACCURACY_M', 150);
/** Faster than this between two fixes (after accuracy slack) is a GPS glitch, not travel */
const MAX_PLAUSIBLE_SPEED_MPS = envNumber('LIVETRACKING_MAX_SPEED_MPS', 70);
/** Consecutive agreeing "outliers" needed before accepting them as a real relocation */
const JUMP_CONFIRM_FIXES = 3;
const JUMP_CLUSTER_RADIUS_M = 150;
/** Silence longer than this starts a new route segment instead of drawing a straight line across it */
export const SEGMENT_GAP_MS = 15 * 60_000;
/** Breadcrumb throttle (unchanged from the original socket handler) */
const BREADCRUMB_MIN_DISTANCE_M = 20;
const BREADCRUMB_MAX_INTERVAL_MS = 15_000;
/** Live fixes arriving faster than this from one employee are dropped (flood guard) */
const MIN_LIVE_FIX_INTERVAL_MS = 400;
/** Device clocks further off than this are ignored for live fixes (server time is used) */
const MAX_CLOCK_SKEW_MS = 2 * 60_000;
/** Offline-buffered fixes older than this are not replayed */
const MAX_REPLAY_AGE_MS = 12 * 60 * 60_000;
export const MAX_BATCH_POINTS = 200;
/** Heading reported by the device is trusted only above this speed; below it we derive a bearing */
const HEADING_MIN_SPEED_MPS = 0.5;
const BEARING_MIN_DISTANCE_M = 8;

const FLUSH_INTERVAL_MS = 2_000;
const BROADCAST_INTERVAL_MS = 500;
const SESSION_RECALC_INTERVAL_MS = 60_000;
const MANAGER_CHAIN_TTL_MS = 10 * 60_000;
const STATE_IDLE_EVICT_MS = 2 * 60 * 60_000;
const MAX_BUFFERED_BREADCRUMBS = 50_000;

/** Road snapping is opt-in: only when a routing engine is explicitly configured */
const ROAD_SNAP_ENABLED = Boolean(process.env.OSRM_BASE_URL) && process.env.LIVETRACKING_ROAD_SNAP !== 'false';
const SNAP_MIN_SPEED_MPS = 2.2;
const SNAP_CONCURRENCY = 2;
const SNAP_QUEUE_MAX = 500;

export type FixSource = 'socket' | 'http' | 'replay';

/** Raw fix as sent by a client — every field is untrusted */
export interface IncomingFix {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  speed?: unknown;
  heading?: unknown;
  timestamp?: unknown;
  address?: unknown;
}

/** What viewers receive for each accepted fix */
export interface LocationDelta {
  employee_id: number;
  latitude: number;
  longitude: number;
  previous_latitude: number | null;
  previous_longitude: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  /** When the fix was taken (device time, validated) */
  timestamp: string;
  /** When the server received it */
  last_ping_at: string;
  location_status: 'ON';
  connection_status: 'ONLINE';
  /** Stored as a history breadcrumb — viewers append it to the route line */
  route_point: boolean;
  /** Starts a new route segment (long gap or confirmed relocation) — do not connect to the previous point */
  segment_break: boolean;
  /** Part of an offline replay batch — viewers append without animating each point */
  replay: boolean;
}

export interface IngestResult {
  accepted: number;
  rejected: number;
}

interface EmployeeState {
  organizationId: number;
  employeeId: number;
  managerChain: number[];
  managerChainAt: number;
  day: string;
  /** Last accepted fix (the marker position) */
  lastTs: number;
  lastLat: number | null;
  lastLng: number | null;
  lastAccuracy: number;
  lastHeading: number | null;
  /** Last stored breadcrumb */
  crumbTs: number;
  crumbLat: number | null;
  crumbLng: number | null;
  pendingJump: { lat: number; lng: number; count: number } | null;
  lastLiveRecvAt: number;
  lastActivityAt: number;
  /** Serialises processing per employee (socket, HTTP and replay can overlap) */
  chain: Promise<unknown>;
  ready: Promise<void>;
}

const states = new Map<string, EmployeeState>();
const breadcrumbBuffer: Array<BreadcrumbRow & { snap: boolean }> = [];
const liveRowBuffer = new Map<string, LiveRow>();
const sessionDirty = new Map<string, { organizationId: number; employeeId: number; day: string }>();
const roomQueues = new Map<string, LocationDelta[]>();
const snapQueue: Array<{ organizationId: number; employeeId: number; recordedAt: string; lat: number; lng: number }> = [];
let snapInFlight = 0;
let nsp: Namespace | null = null;
let timersStarted = false;

const keyOf = (orgId: number, employeeId: number) => `${orgId}:${employeeId}`;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial compass bearing (0–360°, 0 = north) from point 1 to point 2 */
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Finite number within [min, max], else null — client numbers are never trusted as-is */
function boundedNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Reject out-of-range / null-island / non-finite coordinates */
export function isValidLatLng(lat: unknown, lng: unknown): boolean {
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

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

/** Rooms that may see an employee's location: HR/Admin (org room), the employee, and managers above them */
export function viewerRooms(orgId: number, employeeId: number, managerChain: number[]): string[] {
  return [
    `org:${orgId}`,
    `employee:${orgId}:${employeeId}`,
    ...managerChain.map((managerId) => `employee:${orgId}:${managerId}`),
  ];
}

async function getState(orgId: number, employeeId: number): Promise<EmployeeState> {
  const key = keyOf(orgId, employeeId);
  let state = states.get(key);
  if (!state) {
    const created: EmployeeState = {
      organizationId: orgId,
      employeeId,
      managerChain: [],
      managerChainAt: 0,
      day: localDateStr(),
      lastTs: 0,
      lastLat: null,
      lastLng: null,
      lastAccuracy: 0,
      lastHeading: null,
      crumbTs: 0,
      crumbLat: null,
      crumbLng: null,
      pendingJump: null,
      lastLiveRecvAt: 0,
      lastActivityAt: Date.now(),
      chain: Promise.resolve(),
      ready: Promise.resolve(),
    };
    // Seed from today's last stored breadcrumb so a reconnect / server restart
    // continues the route instead of treating the next fix as a fresh start.
    created.ready = (async () => {
      const ctx = { organizationId: orgId, userId: 0 } as TenantContext;
      const [last, chain] = await Promise.all([
        repo.getLastBreadcrumb(ctx, employeeId, created.day).catch(() => null),
        getManagerChain(orgId, employeeId).catch(() => [] as number[]),
      ]);
      created.managerChain = chain;
      created.managerChainAt = Date.now();
      if (last && isValidLatLng(last.latitude, last.longitude)) {
        created.lastTs = created.crumbTs = last.recordedAtMs;
        created.lastLat = created.crumbLat = last.latitude;
        created.lastLng = created.crumbLng = last.longitude;
      }
    })();
    states.set(key, created);
    state = created;
  }
  await state.ready;
  if (Date.now() - state.managerChainAt > MANAGER_CHAIN_TTL_MS) {
    state.managerChainAt = Date.now();
    getManagerChain(orgId, employeeId)
      .then((chain) => {
        state!.managerChain = chain;
      })
      .catch(() => {});
  }
  return state;
}

/** Validate + filter one fix against the employee's state; returns the delta to broadcast, or null */
function processFix(state: EmployeeState, fix: IncomingFix, source: FixSource, nowMs: number): LocationDelta | null {
  const latitude = boundedNumber(fix?.latitude, -90, 90);
  const longitude = boundedNumber(fix?.longitude, -180, 180);
  if (latitude === null || longitude === null || !isValidLatLng(latitude, longitude)) return null;

  const accuracy = boundedNumber(fix.accuracy, 0, 100_000);
  if (accuracy !== null && accuracy > MAX_FIX_ACCURACY_M) return null;
  const speed = boundedNumber(fix.speed, 0, 150);
  const reportedHeading = boundedNumber(fix.heading, 0, 360);

  // ── Timestamp: device time when plausible, so buffered fixes land at the right moment ──
  let ts = parseTimestamp(fix.timestamp);
  if (source === 'replay') {
    if (ts === null || ts > nowMs + MAX_CLOCK_SKEW_MS || ts < nowMs - MAX_REPLAY_AGE_MS) return null;
  } else if (ts === null || Math.abs(ts - nowMs) > MAX_CLOCK_SKEW_MS) {
    ts = nowMs;
  }
  ts = Math.min(ts, nowMs);

  // ── Ordering: duplicates and anything older than the last accepted fix are dropped ──
  if (ts <= state.lastTs) return null;

  // ── Day rollover: today's route starts fresh ──
  const day = localDateStr(new Date(ts));
  let segmentBreak = false;
  if (day !== state.day) {
    state.day = day;
    state.crumbTs = 0;
    state.crumbLat = state.crumbLng = null;
    segmentBreak = true;
  }

  // ── Outlier filter: an impossible hop is held back until the next fixes confirm it ──
  let moved = 0;
  if (state.lastLat !== null && state.lastLng !== null) {
    moved = haversineMeters(state.lastLat, state.lastLng, latitude, longitude);
    const dtSec = Math.max((ts - state.lastTs) / 1000, 1);
    const slack = (accuracy ?? 0) + state.lastAccuracy;
    if (ts - state.lastTs >= SEGMENT_GAP_MS) {
      segmentBreak = true;
    } else if (moved - slack > MAX_PLAUSIBLE_SPEED_MPS * dtSec) {
      const pj = state.pendingJump;
      if (pj && haversineMeters(pj.lat, pj.lng, latitude, longitude) <= JUMP_CLUSTER_RADIUS_M) {
        pj.count++;
        pj.lat = latitude;
        pj.lng = longitude;
      } else {
        state.pendingJump = { lat: latitude, lng: longitude, count: 1 };
      }
      if (state.pendingJump!.count < JUMP_CONFIRM_FIXES) return null;
      // Several fixes agree on the new place — it's a real relocation (e.g. GPS
      // re-acquired after a tunnel). Accept it, but don't draw a line to it.
      segmentBreak = true;
    }
  } else {
    segmentBreak = true;
  }
  state.pendingJump = null;

  // ── Heading: trust the device only while actually moving; else derive, else keep ──
  let heading: number | null = null;
  if (reportedHeading !== null && (speed ?? 0) >= HEADING_MIN_SPEED_MPS) {
    heading = reportedHeading;
  } else if (!segmentBreak && state.lastLat !== null && state.lastLng !== null && moved >= BEARING_MIN_DISTANCE_M) {
    heading = bearingDeg(state.lastLat, state.lastLng, latitude, longitude);
  }

  const previousLat = segmentBreak ? null : state.lastLat;
  const previousLng = segmentBreak ? null : state.lastLng;

  state.lastTs = ts;
  state.lastLat = latitude;
  state.lastLng = longitude;
  state.lastAccuracy = accuracy ?? 0;
  if (heading !== null) state.lastHeading = heading;

  // ── Breadcrumb: same throttle as before, but only from reasonably accurate fixes ──
  const accurateEnough = accuracy === null || accuracy <= ROUTE_MAX_ACCURACY_M;
  const routePoint =
    accurateEnough &&
    (segmentBreak ||
      state.crumbLat === null ||
      state.crumbLng === null ||
      ts - state.crumbTs >= BREADCRUMB_MAX_INTERVAL_MS ||
      haversineMeters(state.crumbLat, state.crumbLng, latitude, longitude) >= BREADCRUMB_MIN_DISTANCE_M);

  const recordedAt = toMysqlDatetime(ts);
  if (routePoint) {
    state.crumbTs = ts;
    state.crumbLat = latitude;
    state.crumbLng = longitude;
    if (breadcrumbBuffer.length < MAX_BUFFERED_BREADCRUMBS) {
      breadcrumbBuffer.push({
        organization_id: state.organizationId,
        employee_id: state.employeeId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        source,
        recorded_at: recordedAt,
        snap: ROAD_SNAP_ENABLED && (speed ?? 0) >= SNAP_MIN_SPEED_MPS,
      });
    }
    sessionDirty.set(keyOf(state.organizationId, state.employeeId), {
      organizationId: state.organizationId,
      employeeId: state.employeeId,
      day,
    });
  }

  const address = typeof fix.address === 'string' && fix.address.length <= 500 ? fix.address : null;
  liveRowBuffer.set(keyOf(state.organizationId, state.employeeId), {
    organization_id: state.organizationId,
    employee_id: state.employeeId,
    latitude,
    longitude,
    accuracy,
    speed,
    heading: heading ?? state.lastHeading,
    address,
    last_ping_at: toMysqlDatetime(nowMs),
  });

  return {
    employee_id: state.employeeId,
    latitude,
    longitude,
    previous_latitude: previousLat,
    previous_longitude: previousLng,
    heading,
    speed,
    accuracy,
    timestamp: new Date(ts).toISOString(),
    last_ping_at: new Date(nowMs).toISOString(),
    location_status: 'ON',
    connection_status: 'ONLINE',
    route_point: routePoint,
    segment_break: segmentBreak,
    replay: source === 'replay',
  };
}

function queueForViewers(state: EmployeeState, delta: LocationDelta): void {
  for (const room of viewerRooms(state.organizationId, state.employeeId, state.managerChain)) {
    let queue = roomQueues.get(room);
    if (!queue) {
      queue = [];
      roomQueues.set(room, queue);
    }
    queue.push(delta);
  }
}

/**
 * Ingest one or more fixes for an authenticated employee. The employee id must
 * come from the caller's verified identity — never from the payload.
 */
export async function ingestFixes(
  orgId: number,
  employeeId: number,
  fixes: IncomingFix[],
  source: FixSource
): Promise<IngestResult> {
  ensureTimers();
  const state = await getState(orgId, employeeId);
  const nowMs = Date.now();
  state.lastActivityAt = nowMs;

  if (source !== 'replay') {
    if (nowMs - state.lastLiveRecvAt < MIN_LIVE_FIX_INTERVAL_MS) return { accepted: 0, rejected: fixes.length };
    state.lastLiveRecvAt = nowMs;
  }

  const run = async (): Promise<IngestResult> => {
    const list = fixes.slice(0, MAX_BATCH_POINTS);
    // Replayed fixes can arrive in any order — process them chronologically
    if (list.length > 1) {
      list.sort((a, b) => (parseTimestamp(a?.timestamp) ?? 0) - (parseTimestamp(b?.timestamp) ?? 0));
    }
    let accepted = 0;
    for (const fix of list) {
      const delta = processFix(state, fix, source, Date.now());
      if (delta) {
        accepted++;
        queueForViewers(state, delta);
      }
    }
    return { accepted, rejected: fixes.length - accepted };
  };

  const next = state.chain.then(run, run);
  state.chain = next.catch(() => {});
  return next;
}

// ── Flushing ─────────────────────────────────────────────────────────────────

let flushing: Promise<void> | null = null;

/** Write buffered breadcrumbs and live snapshots. Concurrent callers share one run. */
export function flushLocationWrites(): Promise<void> {
  if (flushing) return flushing.then(() => flushLocationWrites());
  if (breadcrumbBuffer.length === 0 && liveRowBuffer.size === 0) return Promise.resolve();

  const crumbs = breadcrumbBuffer.splice(0, breadcrumbBuffer.length);
  const liveRows = [...liveRowBuffer.values()];
  liveRowBuffer.clear();

  flushing = (async () => {
    try {
      if (crumbs.length) {
        await repo.insertBreadcrumbs(crumbs.map(({ snap: _snap, ...row }) => row));
        for (const c of crumbs) {
          if (c.snap && snapQueue.length < SNAP_QUEUE_MAX) {
            snapQueue.push({
              organizationId: c.organization_id,
              employeeId: c.employee_id,
              recordedAt: c.recorded_at,
              lat: c.latitude,
              lng: c.longitude,
            });
          }
        }
        pumpSnapQueue();
      }
    } catch (err) {
      logger.error('[LiveTracking] breadcrumb flush failed:', err as any);
    }
    try {
      if (liveRows.length) await repo.upsertLiveRows(liveRows);
    } catch (err) {
      logger.error('[LiveTracking] live snapshot flush failed:', err as any);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Drop an employee's unflushed live snapshot — used before writing an OFF/OFFLINE status */
export async function flushEmployeeBeforeStatusChange(orgId: number, employeeId: number): Promise<void> {
  if (liveRowBuffer.has(keyOf(orgId, employeeId))) await flushLocationWrites();
}

function pumpSnapQueue(): void {
  while (snapInFlight < SNAP_CONCURRENCY && snapQueue.length > 0) {
    const job = snapQueue.shift()!;
    snapInFlight++;
    snapToRoad(job.lat, job.lng)
      .then((s) =>
        s.snapped
          ? repo.setBreadcrumbSnap(job.organizationId, job.employeeId, job.recordedAt, s.latitude, s.longitude)
          : undefined
      )
      .catch(() => {})
      .finally(() => {
        snapInFlight--;
        pumpSnapQueue();
      });
  }
}

function flushBroadcasts(): void {
  if (!nsp || roomQueues.size === 0) {
    roomQueues.clear();
    return;
  }
  for (const [room, deltas] of roomQueues) {
    // HR/Admin sockets already get everything via their org room — an HR user who
    // is also someone's manager must not receive the same batch twice.
    const orgRoom = room.startsWith('employee:') ? `org:${room.split(':')[1]}` : null;
    (orgRoom ? nsp.to(room).except(orgRoom) : nsp.to(room)).emit('tracking:locations', deltas);
  }
  roomQueues.clear();
}

/** Daily session summaries, recomputed at most once per interval per employee (was: every breadcrumb) */
async function recalcDirtySessions(): Promise<void> {
  if (sessionDirty.size === 0) return;
  await flushLocationWrites();
  const jobs = [...sessionDirty.values()];
  sessionDirty.clear();
  for (const job of jobs) {
    try {
      const ctx = { organizationId: job.organizationId, userId: 0 } as TenantContext;
      const breadcrumbs = await repo.getLocationHistory(ctx, job.employeeId, job.day);
      if (breadcrumbs.length > 0) {
        const metrics = calculateSessionMetrics(breadcrumbs);
        await repo.upsertTrackingSession(ctx, job.employeeId, job.day, {
          ...metrics,
          locationWalk: JSON.stringify(breadcrumbs),
        });
      }
    } catch (err) {
      logger.warn('[LiveTracking] session recalc failed:', err as any);
    }
  }
}

function evictIdleStates(): void {
  const cutoff = Date.now() - STATE_IDLE_EVICT_MS;
  for (const [key, state] of states) {
    if (state.lastActivityAt < cutoff) states.delete(key);
  }
}

function ensureTimers(): void {
  if (timersStarted) return;
  timersStarted = true;
  setInterval(() => void flushLocationWrites(), FLUSH_INTERVAL_MS).unref?.();
  setInterval(flushBroadcasts, BROADCAST_INTERVAL_MS).unref?.();
  setInterval(() => void recalcDirtySessions(), SESSION_RECALC_INTERVAL_MS).unref?.();
  setInterval(evictIdleStates, 10 * 60_000).unref?.();
}

/** Called once by the socket module so batched deltas can be emitted */
export function attachLocationBroadcaster(namespace: Namespace): void {
  nsp = namespace;
  ensureTimers();
}

/** Mark an employee's session for recalculation soon (e.g. after they disconnect) */
export function markSessionDirty(orgId: number, employeeId: number): void {
  sessionDirty.set(keyOf(orgId, employeeId), { organizationId: orgId, employeeId, day: localDateStr() });
}

/** Test hook — clears all in-memory state */
export function __resetLocationIngestForTests(): void {
  states.clear();
  breadcrumbBuffer.length = 0;
  liveRowBuffer.clear();
  sessionDirty.clear();
  roomQueues.clear();
  snapQueue.length = 0;
}

/** Test hook — read-only view of what's queued for broadcast */
export function __peekRoomQueuesForTests(): Map<string, LocationDelta[]> {
  return roomQueues;
}
