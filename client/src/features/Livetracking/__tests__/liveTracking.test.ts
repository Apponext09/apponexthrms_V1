import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('maplibre-gl', () => ({}));

import { liveTrackingStore, movementStatus } from '../store/liveTrackingStore';
import { animationDurationMs } from '../map/liveMapEngine';
import {
  bearingDeg,
  buildRoutePoints,
  lerpAngle,
  routeAppendDecision,
  toLineCoordinates,
  SEGMENT_GAP_MS,
} from '../utils/geo';
import type { LiveEmployee, LocationDelta } from '../types/livetracking.types';

const flush = () => new Promise((r) => setTimeout(r, 5));

function employee(id: number, extra: Partial<LiveEmployee> = {}): LiveEmployee {
  return {
    employee_id: id,
    employee_code: `E${id}`,
    name: `Emp ${id}`,
    avatar_url: null,
    department: 'Field',
    designation: 'Exec',
    reporting_manager: null,
    reporting_manager_id: null,
    department_id: null,
    branch_id: null,
    latitude: 19.076,
    longitude: 72.8777,
    address: null,
    location_status: 'ON',
    connection_status: 'ONLINE',
    last_ping_at: new Date(Date.now() - 60_000).toISOString(),
    attendance_status: 'present',
    face_attendance_status: null,
    check_in_time: '09:00',
    check_out_time: null,
    ...extra,
  };
}

function delta(id: number, lat: number, tsMs: number, extra: Partial<LocationDelta> = {}): LocationDelta {
  return {
    employee_id: id,
    latitude: lat,
    longitude: 72.8777,
    previous_latitude: null,
    previous_longitude: null,
    heading: null,
    speed: 5,
    accuracy: 8,
    timestamp: new Date(tsMs).toISOString(),
    last_ping_at: new Date().toISOString(),
    location_status: 'ON',
    connection_status: 'ONLINE',
    route_point: true,
    segment_break: false,
    replay: false,
    ...extra,
  };
}

beforeEach(() => liveTrackingStore.reset());

describe('geo', () => {
  it('bearing: north ≈ 0°, east ≈ 90°', () => {
    expect(bearingDeg(19, 72, 19.01, 72)).toBeCloseTo(0, 0);
    expect(bearingDeg(19, 72, 19, 72.01)).toBeCloseTo(90, 0);
  });

  it('heading interpolation takes the short way round', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0, 5);
  });

  it('route thinning drops jitter, splits on gaps and teleports', () => {
    const t = 1_700_000_000_000;
    const pts = buildRoutePoints([
      { lat: 19.0, lng: 72.0, ts: t },
      { lat: 19.00001, lng: 72.0, ts: t + 5_000 }, // 1 m jitter → dropped
      { lat: 19.001, lng: 72.0, ts: t + 10_000 },
      { lat: 19.002, lng: 72.0, ts: t + 10_000 + SEGMENT_GAP_MS }, // long gap → new segment
      { lat: 19.5, lng: 73.5, ts: t + 20_000 + SEGMENT_GAP_MS }, // 100 km in 10 s → new segment
    ]);
    expect(pts).toHaveLength(4);
    expect(pts.map((p) => Boolean(p.brk))).toEqual([true, false, true, true]);
    // No straight line drawn across the gap or the teleport
    expect(toLineCoordinates(pts)).toHaveLength(1);
  });

  it('routeAppendDecision keeps points that moved past jitter distance', () => {
    const last = { lat: 19, lng: 72, ts: 0 };
    expect(routeAppendDecision(last, { lat: 19.0002, lng: 72, ts: 5000 })).toEqual({ append: true, brk: false });
    expect(routeAppendDecision(last, { lat: 19.00002, lng: 72, ts: 5000 }).append).toBe(false);
  });
});

describe('animationDurationMs', () => {
  it('uses the fix interval so the marker keeps moving until the next fix', () => {
    expect(animationDurationMs(50, 4000, 12)).toBe(4000);
  });
  it('falls back to distance / speed, then to an assumed speed', () => {
    expect(animationDurationMs(100, 0, 10, 6000)).toBe(6000); // 10 s by speed, capped at max
    expect(animationDurationMs(20, 0, 10)).toBe(2000);
    expect(animationDurationMs(10, 0, null)).toBe(2000);
  });
  it('clamps to [min, max]', () => {
    expect(animationDurationMs(1, 50, 5)).toBe(300);
    expect(animationDurationMs(5000, 60_000, 5, 5000)).toBe(5000);
  });
});

describe('liveTrackingStore', () => {
  it('appends route points, ignores duplicates and out-of-order deltas', async () => {
    const t = Date.now() - 30_000;
    liveTrackingStore.upsertSnapshot(employee(1, { last_ping_at: new Date(t - 60_000).toISOString() }));
    liveTrackingStore.applyDeltas([delta(1, 19.077, t)]);
    liveTrackingStore.applyDeltas([delta(1, 19.078, t + 5_000)]);
    liveTrackingStore.applyDeltas([delta(1, 19.078, t + 5_000)]); // same delta via a second room
    liveTrackingStore.applyDeltas([delta(1, 19.0775, t + 2_000)]); // older
    const track = liveTrackingStore.get(1)!;
    expect(track.route).toHaveLength(2);
    expect(track.lat).toBeCloseTo(19.078, 6);
    expect(track.prevLat).toBeCloseTo(19.077, 6);
    expect(track.distanceM).toBeGreaterThan(100);
  });

  it('keeps the existing route when a new point arrives (never replaced)', () => {
    const t = Date.now() - 60_000;
    liveTrackingStore.upsertSnapshot(employee(2));
    liveTrackingStore.seedRoute(2, [
      { lat: 19.07, lng: 72.87, ts: t },
      { lat: 19.071, lng: 72.87, ts: t + 5_000 },
      { lat: 19.072, lng: 72.87, ts: t + 10_000 },
    ]);
    liveTrackingStore.applyDeltas([delta(2, 19.073, t + 15_000)]);
    expect(liveTrackingStore.get(2)!.route.map((p) => p.lat)).toEqual([19.07, 19.071, 19.072, 19.073]);
  });

  it('a late seed does not erase live points drawn meanwhile', () => {
    const t = Date.now() - 60_000;
    liveTrackingStore.upsertSnapshot(employee(3));
    liveTrackingStore.applyDeltas([delta(3, 19.08, t + 20_000)]);
    liveTrackingStore.seedRoute(3, [
      { lat: 19.07, lng: 72.8777, ts: t },
      { lat: 19.075, lng: 72.8777, ts: t + 10_000 },
    ]);
    expect(liveTrackingStore.get(3)!.route.map((p) => p.lat)).toEqual([19.07, 19.075, 19.08]);
  });

  it('reports unknown employees instead of silently dropping them', () => {
    expect(liveTrackingStore.applyDeltas([delta(99, 19.07, Date.now())])).toEqual([99]);
  });

  it('notifies only the changed employee', async () => {
    liveTrackingStore.upsertSnapshot(employee(4));
    liveTrackingStore.upsertSnapshot(employee(5));
    await flush();
    const seen: number[][] = [];
    const unsub = liveTrackingStore.subscribe((ids) => seen.push([...ids]));
    let emp5Renders = 0;
    const unsub5 = liveTrackingStore.subscribeEmployee(5, () => emp5Renders++);
    liveTrackingStore.applyDeltas([delta(4, 19.08, Date.now())]);
    await flush();
    unsub();
    unsub5();
    expect(seen).toEqual([[4]]);
    expect(emp5Renders).toBe(0);
  });

  it('derives movement status', () => {
    liveTrackingStore.upsertSnapshot(employee(6));
    liveTrackingStore.applyDeltas([delta(6, 19.08, Date.now(), { speed: 6 })]);
    expect(movementStatus(liveTrackingStore.get(6))).toBe('moving');
    liveTrackingStore.setStatus(6, { location_status: 'OFF' });
    expect(movementStatus(liveTrackingStore.get(6))).toBe('gps_off');
    liveTrackingStore.upsertSnapshot(employee(7, { connection_status: 'OFFLINE' }));
    expect(movementStatus(liveTrackingStore.get(7))).toBe('offline');
    liveTrackingStore.upsertSnapshot(employee(8, { speed: 0, last_ping_at: new Date().toISOString() }));
    expect(movementStatus(liveTrackingStore.get(8))).toBe('idle');
  });
});
