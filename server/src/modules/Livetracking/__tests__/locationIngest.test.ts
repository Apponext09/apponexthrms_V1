import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks: no DB, no network ─────────────────────────────────────────────────
const repoMock = vi.hoisted(() => ({
  getLastBreadcrumb: vi.fn(async () => null),
  insertBreadcrumbs: vi.fn(async () => {}),
  upsertLiveRows: vi.fn(async () => {}),
  setBreadcrumbSnap: vi.fn(async () => {}),
  getLocationHistory: vi.fn(async () => []),
  upsertTrackingSession: vi.fn(async () => {}),
}));

vi.mock('../repositories/LivetrackingRepository', () => ({
  LivetrackingRepository: vi.fn(() => repoMock),
  toMysqlDatetime: (ms: number) => new Date(ms).toISOString(),
}));
vi.mock('../utils/access', () => ({
  getManagerChain: vi.fn(async () => [77]),
  localDateStr: (d: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
}));
vi.mock('../utils/roadSnapper', () => ({ snapToRoad: vi.fn() }));
vi.mock('@/common/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import {
  ingestFixes,
  flushLocationWrites,
  isValidLatLng,
  viewerRooms,
  __resetLocationIngestForTests,
  __peekRoomQueuesForTests,
} from '../services/locationIngest';

const ORG = 4;
let nextEmp = 1000;
/** Fresh employee per test so per-employee state/flood guard never leaks between tests */
const newEmployee = () => ++nextEmp;

const base = { latitude: 19.076, longitude: 72.8777, accuracy: 10 };
/** ~111 m north per 0.001° latitude */
const at = (dLat: number, tsMs: number, extra: Record<string, unknown> = {}) => ({
  ...base,
  latitude: base.latitude + dLat,
  timestamp: new Date(tsMs).toISOString(),
  ...extra,
});

function deltasFor(employeeId: number) {
  return (__peekRoomQueuesForTests().get(`employee:${ORG}:${employeeId}`) ?? []).filter(
    (d) => d.employee_id === employeeId
  );
}

beforeEach(() => {
  __resetLocationIngestForTests();
  vi.clearAllMocks();
});

describe('isValidLatLng', () => {
  it('accepts normal coordinates and rejects garbage / null island', () => {
    expect(isValidLatLng(19.07, 72.87)).toBe(true);
    expect(isValidLatLng(0, 0)).toBe(false);
    expect(isValidLatLng(91, 10)).toBe(false);
    expect(isValidLatLng(10, -181)).toBe(false);
    expect(isValidLatLng(NaN, 10)).toBe(false);
    expect(isValidLatLng('19' as any, 72)).toBe(false);
  });
});

describe('viewerRooms', () => {
  it('targets org room, the employee, and each manager — never a broadcast to everyone', () => {
    expect(viewerRooms(4, 10, [20, 30])).toEqual(['org:4', 'employee:4:10', 'employee:4:20', 'employee:4:30']);
  });
});

describe('ingestFixes — replay batches', () => {
  it('sorts out-of-order points, drops duplicates, and emits deltas with previous position', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 10 * 60_000;
    const points = [at(0.002, t0 + 60_000), at(0, t0), at(0.001, t0 + 30_000), at(0.001, t0 + 30_000)];

    const res = await ingestFixes(ORG, emp, points, 'replay');
    expect(res).toEqual({ accepted: 3, rejected: 1 });

    const d = deltasFor(emp);
    expect(d.map((x) => x.latitude)).toEqual([base.latitude, base.latitude + 0.001, base.latitude + 0.002]);
    expect(d[0].segment_break).toBe(true); // first point of the day starts a segment
    expect(d[0].previous_latitude).toBeNull();
    expect(d[1].previous_latitude).toBeCloseTo(base.latitude, 6);
    expect(d[1].segment_break).toBe(false);
    expect(d.every((x) => x.replay)).toBe(true);
    // Deltas carry only the new point — never a whole trail
    expect(Object.keys(d[0])).not.toContain('routedTrail');
  });

  it('rejects points older than what was already accepted (replay after live)', async () => {
    const emp = newEmployee();
    const now = Date.now();
    await ingestFixes(ORG, emp, [at(0, now - 1000)], 'socket');
    const res = await ingestFixes(ORG, emp, [at(0.001, now - 60_000)], 'replay');
    expect(res.accepted).toBe(0);
  });

  it('rejects stale (>12h) and future timestamps in replays', async () => {
    const emp = newEmployee();
    const now = Date.now();
    const res = await ingestFixes(
      ORG,
      emp,
      [at(0, now - 13 * 60 * 60_000), at(0, now + 10 * 60_000), { ...base, timestamp: 'garbage' }],
      'replay'
    );
    expect(res.accepted).toBe(0);
  });
});

describe('ingestFixes — filtering', () => {
  it('drops invalid coordinates, bad accuracy, and non-numeric payloads', async () => {
    const t = Date.now() - 5 * 60_000;
    const res = await ingestFixes(
      ORG,
      newEmployee(),
      [
        { latitude: 999, longitude: 72, timestamp: new Date(t).toISOString() },
        { latitude: 0, longitude: 0, timestamp: new Date(t + 1000).toISOString() },
        { ...base, accuracy: 5000, timestamp: new Date(t + 2000).toISOString() },
        { latitude: { $gt: 1 }, longitude: 72, timestamp: new Date(t + 3000).toISOString() },
      ],
      'replay'
    );
    expect(res.accepted).toBe(0);
  });

  it('holds back a teleport and only accepts it once several fixes agree, as a new segment', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 10 * 60_000;
    const far = { latitude: 19.5, longitude: 73.5, accuracy: 10 };
    const fixes = [
      at(0, t0),
      at(0.0005, t0 + 5_000),
      { ...far, timestamp: new Date(t0 + 10_000).toISOString() },
      { ...far, timestamp: new Date(t0 + 15_000).toISOString() },
      { ...far, timestamp: new Date(t0 + 20_000).toISOString() },
    ];
    const res = await ingestFixes(ORG, emp, fixes, 'replay');
    expect(res.accepted).toBe(3);

    const d = deltasFor(emp);
    const jump = d[d.length - 1];
    expect(jump.latitude).toBe(19.5);
    expect(jump.segment_break).toBe(true); // never a huge straight line to the new place
    expect(jump.previous_latitude).toBeNull();
  });

  it('a single glitch point is ignored and the route continues', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 10 * 60_000;
    const res = await ingestFixes(
      ORG,
      emp,
      [at(0, t0), { latitude: 19.5, longitude: 73.5, accuracy: 10, timestamp: new Date(t0 + 5_000).toISOString() }, at(0.0005, t0 + 10_000)],
      'replay'
    );
    expect(res.accepted).toBe(2);
    expect(deltasFor(emp).every((x) => x.latitude < 19.1)).toBe(true);
  });

  it('starts a new segment after a long silence', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 60 * 60_000;
    await ingestFixes(ORG, emp, [at(0, t0), at(0.01, t0 + 20 * 60_000)], 'replay');
    const d = deltasFor(emp);
    expect(d[1].segment_break).toBe(true);
  });

  it('throttles live floods from one employee', async () => {
    const emp = newEmployee();
    const now = Date.now();
    const a = await ingestFixes(ORG, emp, [at(0, now - 2000)], 'socket');
    const b = await ingestFixes(ORG, emp, [at(0.001, now - 1000)], 'socket');
    expect(a.accepted).toBe(1);
    expect(b.accepted).toBe(0);
  });

  it('uses server time when a live fix has a skewed device clock', async () => {
    const emp = newEmployee();
    await ingestFixes(ORG, emp, [at(0, Date.now() - 3 * 60 * 60_000)], 'socket');
    const d = deltasFor(emp);
    expect(Math.abs(Date.parse(d[0].timestamp) - Date.now())).toBeLessThan(5_000);
  });
});

describe('ingestFixes — heading', () => {
  it('uses the device heading while moving and derives a bearing when it is missing', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 10 * 60_000;
    await ingestFixes(
      ORG,
      emp,
      [
        at(0, t0),
        at(0.001, t0 + 10_000, { heading: 45, speed: 10 }),
        // moving due north, no heading reported → bearing ≈ 0°
        at(0.002, t0 + 20_000),
        // stationary jitter (1 m) → no heading, marker must not spin
        at(0.00201, t0 + 30_000),
      ],
      'replay'
    );
    const d = deltasFor(emp);
    expect(d[1].heading).toBe(45);
    expect(d[2].heading).not.toBeNull();
    expect(Math.min(d[2].heading!, 360 - d[2].heading!)).toBeLessThan(1);
    expect(d[3].heading).toBeNull();
  });
});

describe('persistence', () => {
  it('batches breadcrumbs and keeps only the latest live snapshot per employee', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 10 * 60_000;
    // 3 points 111 m apart → 3 breadcrumbs; 1 jitter point 1 m away within 15 s → not a breadcrumb
    await ingestFixes(ORG, emp, [at(0, t0), at(0.001, t0 + 5_000), at(0.00101, t0 + 6_000), at(0.002, t0 + 30_000)], 'replay');
    expect(repoMock.insertBreadcrumbs).not.toHaveBeenCalled(); // buffered, not per-fix

    await flushLocationWrites();
    const crumbs = repoMock.insertBreadcrumbs.mock.calls[0][0] as any[];
    expect(crumbs).toHaveLength(3);
    expect(crumbs.every((c) => c.source === 'replay' && c.employee_id === emp)).toBe(true);

    const live = repoMock.upsertLiveRows.mock.calls[0][0] as any[];
    expect(live).toHaveLength(1);
    expect(live[0].latitude).toBeCloseTo(base.latitude + 0.002, 6);

    const d = deltasFor(emp);
    expect(d.map((x) => x.route_point)).toEqual([true, true, false, true]);
  });

  it('stores raw GPS — never a road-snapped coordinate — as the breadcrumb', async () => {
    const emp = newEmployee();
    const t0 = Date.now() - 60_000;
    await ingestFixes(ORG, emp, [at(0, t0, { speed: 15 })], 'replay');
    await flushLocationWrites();
    const crumbs = repoMock.insertBreadcrumbs.mock.calls[0][0] as any[];
    expect(crumbs[0].latitude).toBe(base.latitude);
    expect(crumbs[0].longitude).toBe(base.longitude);
  });

  it('delivers to the manager room resolved from the reporting chain', async () => {
    const emp = newEmployee();
    await ingestFixes(ORG, emp, [at(0, Date.now() - 1000)], 'socket');
    expect(__peekRoomQueuesForTests().get(`employee:${ORG}:77`)?.length).toBe(1);
    expect(__peekRoomQueuesForTests().get(`org:${ORG}`)?.length).toBe(1);
  });
});
