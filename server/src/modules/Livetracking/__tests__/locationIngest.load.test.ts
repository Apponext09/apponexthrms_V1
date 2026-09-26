import { describe, it, expect, vi } from 'vitest';

// Load profile for the ingest pipeline: 1,000 employees pinging every ~2.5 s.
// Repository is mocked, so this measures the pipeline's own CPU + batching.
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
  getManagerChain: vi.fn(async () => []),
  localDateStr: () => '2026-09-26',
}));
vi.mock('../utils/roadSnapper', () => ({ snapToRoad: vi.fn() }));
vi.mock('@/common/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import {
  ingestFixes,
  flushLocationWrites,
  __peekRoomQueuesForTests,
  __resetLocationIngestForTests,
} from '../services/locationIngest';

describe('ingest load — 1,000 employees', () => {
  it('handles one minute of fixes (24 per employee) well within budget', async () => {
    __resetLocationIngestForTests();
    const EMPLOYEES = 1000;
    const FIXES = 24; // 60 s at 2.5 s
    const t0 = Date.now() - 10 * 60_000;

    const start = performance.now();
    for (let f = 0; f < FIXES; f++) {
      await Promise.all(
        Array.from({ length: EMPLOYEES }, (_, i) =>
          ingestFixes(
            4,
            i + 1,
            [
              {
                latitude: 19 + (i % 100) * 0.01 + f * 0.0002, // ~22 m per fix
                longitude: 72.8 + Math.floor(i / 100) * 0.01,
                accuracy: 10,
                speed: 9,
                timestamp: new Date(t0 + f * 2500).toISOString(),
              },
            ],
            'replay' // bypass the per-employee live flood guard for the synthetic burst
          )
        )
      );
    }
    const elapsed = performance.now() - start;
    const perFixUs = (elapsed * 1000) / (EMPLOYEES * FIXES);

    const orgBatch = __peekRoomQueuesForTests().get('org:4') ?? [];
    const orgBytes = JSON.stringify(orgBatch).length;
    await flushLocationWrites();
    const crumbWrites = repoMock.insertBreadcrumbs.mock.calls.length;
    const liveWrites = repoMock.upsertLiveRows.mock.calls.length;

    console.log(
      `[load] ${EMPLOYEES * FIXES} fixes in ${elapsed.toFixed(0)} ms → ${perFixUs.toFixed(1)} µs/fix; ` +
        `org room delta payload for 1 min = ${(orgBytes / 1024).toFixed(0)} KB (${orgBatch.length} deltas, ` +
        `${(orgBytes / orgBatch.length).toFixed(0)} B each); DB statements on flush: ${crumbWrites} insert + ${liveWrites} upsert`
    );

    // At 1,000 employees × 1 fix / 2.5 s = 400 fixes/s, 1 ms/fix would already be 40% of a core.
    expect(perFixUs).toBeLessThan(250);
    expect(orgBatch.length).toBe(EMPLOYEES * FIXES);
    // One multi-row statement per buffer, not one per fix
    expect(crumbWrites).toBe(1);
    expect(liveWrites).toBe(1);
    expect((repoMock.upsertLiveRows.mock.calls[0][0] as unknown[]).length).toBe(EMPLOYEES);
  }, 60_000);
});
