// ============================================================
// useLiveTrack — subscribe a component to ONE employee's live state
// client/src/features/Livetracking/hooks/useLiveTrack.ts
// ============================================================
import { useCallback, useSyncExternalStore } from 'react';
import { liveTrackingStore, type LiveTrack } from '../store/liveTrackingStore';

/** Re-renders when (and only when) this employee's live entry changes */
export function useLiveTrack(employeeId: number | null): LiveTrack | undefined {
  const subscribe = useCallback(
    (cb: () => void) => (employeeId ? liveTrackingStore.subscribeEmployee(employeeId, cb) : () => {}),
    [employeeId]
  );
  useSyncExternalStore(subscribe, () => (employeeId ? liveTrackingStore.get(employeeId)?.version ?? -1 : -1));
  return employeeId ? liveTrackingStore.get(employeeId) : undefined;
}
