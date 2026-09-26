// ============================================================
// liveTrackingStore — per-employee live state, outside React
// client/src/features/Livetracking/store/liveTrackingStore.ts
//
// Socket deltas are applied here, NOT to React state: a GPS update touches one
// entry and notifies subscribers with the ids that changed. The map engine
// reacts per employee; React only re-renders the few components that
// subscribe to a single employee (the selected-employee panel).
// ============================================================
import type { LiveEmployee, LocationDelta, MovementStatus } from '../types/livetracking.types';
import {
  buildRoutePoints,
  haversineMeters,
  isValidCoord,
  routeAppendDecision,
  routeDistanceMeters,
  type TrackPoint,
} from '../utils/geo';

/** Speed (m/s) at or above which an employee counts as moving */
const MOVING_SPEED_MPS = 1;
/** Moved this far recently → moving, even without a reported speed */
const MOVING_RECENT_MS = 30_000;
/** No ping for this long → shown as offline (signal lost) */
const STALE_AFTER_MS = 5 * 60_000;

export interface LiveTrack {
  id: number;
  lat: number | null;
  lng: number | null;
  /** Fix time of the latest accepted location (epoch ms) */
  ts: number;
  prevLat: number | null;
  prevLng: number | null;
  prevTs: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  lastPingAt: number;
  lastMovedAt: number;
  locationStatus: 'ON' | 'OFF';
  connectionStatus: 'ONLINE' | 'OFFLINE';
  /** Today's route (thinned, chronological, with segment breaks) */
  route: TrackPoint[];
  distanceM: number;
  /** First route point of the day, or first fix seen */
  trackingStartTs: number | null;
  /** Kind of the most recent change — the map uses it to decide animate vs jump */
  lastChange: { jump: boolean; routeAppended: boolean } | null;
  /** Monotonic counter, bumped on every change (cheap change detection) */
  version: number;
}

type Listener = (changedIds: Set<number>) => void;

function parseTime(value: unknown): number {
  if (!value) return 0;
  const t = new Date(String(value).replace(' ', 'T')).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function movementStatus(track: LiveTrack | undefined, now = Date.now()): MovementStatus {
  if (!track) return 'offline';
  if (track.locationStatus === 'OFF') return 'gps_off';
  if (track.connectionStatus === 'OFFLINE' || !track.lastPingAt || now - track.lastPingAt > STALE_AFTER_MS) {
    return 'offline';
  }
  const freshSpeed = track.speed != null && now - track.ts < MOVING_RECENT_MS ? track.speed : 0;
  if (freshSpeed >= MOVING_SPEED_MPS || now - track.lastMovedAt < MOVING_RECENT_MS) return 'moving';
  return 'idle';
}

class LiveTrackingStore {
  private tracks = new Map<number, LiveTrack>();
  private listeners = new Set<Listener>();
  private employeeListeners = new Map<number, Set<() => void>>();
  private pending = new Set<number>();
  private scheduled = false;

  get(id: number): LiveTrack | undefined {
    return this.tracks.get(id);
  }

  ids(): number[] {
    return [...this.tracks.keys()];
  }

  /** Subscribe to batched change notifications (at most one per animation frame) */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Subscribe to one employee — used with useSyncExternalStore */
  subscribeEmployee(id: number, listener: () => void): () => void {
    let set = this.employeeListeners.get(id);
    if (!set) {
      set = new Set();
      this.employeeListeners.set(id, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  reset(): void {
    const ids = new Set(this.tracks.keys());
    this.tracks.clear();
    ids.forEach((id) => this.markChanged(id));
  }

  private ensure(id: number): LiveTrack {
    let t = this.tracks.get(id);
    if (!t) {
      t = {
        id,
        lat: null,
        lng: null,
        ts: 0,
        prevLat: null,
        prevLng: null,
        prevTs: 0,
        heading: null,
        speed: null,
        accuracy: null,
        lastPingAt: 0,
        lastMovedAt: 0,
        locationStatus: 'OFF',
        connectionStatus: 'OFFLINE',
        route: [],
        distanceM: 0,
        trackingStartTs: null,
        lastChange: null,
        version: 0,
      };
      this.tracks.set(id, t);
    }
    return t;
  }

  private markChanged(id: number): void {
    const t = this.tracks.get(id);
    if (t) t.version++;
    this.pending.add(id);
    if (this.scheduled) return;
    this.scheduled = true;
    const run = () => {
      this.scheduled = false;
      const changed = new Set(this.pending);
      this.pending.clear();
      this.listeners.forEach((l) => l(changed));
      changed.forEach((cid) => this.employeeListeners.get(cid)?.forEach((l) => l()));
    };
    // Coalesce a burst of deltas (a socket batch) into one notification
    if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined' && !document.hidden) {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

  /** Keep only these employees (roster changed) */
  retain(ids: Iterable<number>): void {
    const keep = new Set(ids);
    for (const id of [...this.tracks.keys()]) {
      if (!keep.has(id)) {
        this.tracks.delete(id);
        this.markChanged(id);
      }
    }
  }

  /** Apply a REST snapshot row — never moves an employee backwards in time */
  upsertSnapshot(emp: LiveEmployee): void {
    const id = Number(emp.employee_id);
    if (!id) return;
    const t = this.ensure(id);
    t.locationStatus = emp.location_status === 'ON' ? 'ON' : 'OFF';
    t.connectionStatus = emp.connection_status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    const pingAt = parseTime(emp.last_ping_at);
    if (isValidCoord(emp.latitude, emp.longitude) && pingAt >= t.ts) {
      t.lat = Number(emp.latitude);
      t.lng = Number(emp.longitude);
      t.ts = pingAt || t.ts;
      t.speed = emp.speed != null ? Number(emp.speed) : t.speed;
      t.heading = emp.heading != null ? Number(emp.heading) : t.heading;
      t.accuracy = emp.accuracy != null ? Number(emp.accuracy) : t.accuracy;
      t.lastChange = { jump: true, routeAppended: false };
    }
    t.lastPingAt = Math.max(t.lastPingAt, pingAt);
    this.markChanged(id);
  }

  /**
   * Seed today's route from REST ([lat, lng, epochMs] or RoutePoint-like rows).
   * Live points that arrived after the seed's last point are kept, so a slow
   * seed request never erases what the socket already drew.
   */
  seedRoute(id: number, raw: Array<{ lat: number; lng: number; ts: number }>): void {
    const t = this.ensure(id);
    const seeded = buildRoutePoints(raw);
    const lastSeedTs = seeded.length ? seeded[seeded.length - 1].ts : 0;
    const liveAfter = t.route.filter((p) => p.ts > lastSeedTs);
    const merged = [...seeded];
    for (const p of liveAfter) {
      const { append, brk } = routeAppendDecision(merged[merged.length - 1] ?? null, p);
      if (append) merged.push({ ...p, brk: brk || p.brk });
    }
    t.route = merged;
    t.distanceM = routeDistanceMeters(merged);
    t.trackingStartTs = merged.length ? merged[0].ts : t.trackingStartTs;
    const last = merged[merged.length - 1];
    if (last && (t.lat == null || last.ts > t.ts)) {
      t.lat = last.lat;
      t.lng = last.lng;
      t.ts = last.ts;
    }
    t.lastChange = { jump: true, routeAppended: true };
    this.markChanged(id);
  }

  /** Apply a batch of socket deltas. Returns ids of employees not in the store. */
  applyDeltas(deltas: LocationDelta[]): number[] {
    const unknown: number[] = [];
    for (const d of deltas) {
      const id = Number(d?.employee_id);
      if (!id || !isValidCoord(d.latitude, d.longitude)) continue;
      const t = this.tracks.get(id);
      if (!t) {
        unknown.push(id);
        continue;
      }
      const ts = parseTime(d.timestamp) || Date.now();
      // Duplicates (same delta via two rooms) and out-of-order deltas are ignored
      if (ts <= t.ts) {
        t.lastPingAt = Math.max(t.lastPingAt, parseTime(d.last_ping_at));
        continue;
      }

      const moved = t.lat != null && t.lng != null ? haversineMeters(t.lat, t.lng, d.latitude, d.longitude) : 0;
      t.prevLat = t.lat;
      t.prevLng = t.lng;
      t.prevTs = t.ts;
      t.lat = d.latitude;
      t.lng = d.longitude;
      t.ts = ts;
      t.speed = d.speed;
      t.accuracy = d.accuracy;
      if (d.heading != null) t.heading = d.heading;
      t.lastPingAt = parseTime(d.last_ping_at) || Date.now();
      t.locationStatus = 'ON';
      t.connectionStatus = 'ONLINE';
      if (moved >= 10 && !d.segment_break) t.lastMovedAt = Date.now();

      let routeAppended = false;
      if (d.route_point) {
        const point: TrackPoint = { lat: d.latitude, lng: d.longitude, ts, brk: d.segment_break };
        const last = t.route[t.route.length - 1] ?? null;
        const { append, brk } = routeAppendDecision(last, point);
        if (append) {
          point.brk = brk;
          if (!brk && last) t.distanceM += haversineMeters(last.lat, last.lng, point.lat, point.lng);
          t.route.push(point);
          if (t.trackingStartTs == null) t.trackingStartTs = ts;
          routeAppended = true;
        }
      }
      if (t.trackingStartTs == null) t.trackingStartTs = ts;
      t.lastChange = { jump: d.segment_break || d.replay, routeAppended };
      this.markChanged(id);
    }
    return unknown;
  }

  setStatus(id: number, patch: { location_status?: 'ON' | 'OFF'; connection_status?: 'ONLINE' | 'OFFLINE' }): void {
    const t = this.tracks.get(id);
    if (!t) return;
    if (patch.location_status) t.locationStatus = patch.location_status;
    if (patch.connection_status) t.connectionStatus = patch.connection_status;
    t.lastChange = null;
    this.markChanged(id);
  }
}

/** One store per app — the dashboard resets it on mount */
export const liveTrackingStore = new LiveTrackingStore();
