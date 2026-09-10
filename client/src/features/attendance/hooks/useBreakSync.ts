import { useEffect, useRef } from 'react';
import { apiClient } from '@/config/api';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * useBreakSync — runs once per session when user is logged in.
 *
 * On mount it calls GET /attendance/status and syncs the authoritative
 * break state from the DB into the Zustand store. This ensures the
 * BreakOverlay re-appears after a page reload even if localStorage was cleared.
 */
export function useBreakSync() {
  const { user } = useAuthStore();
  const { setBreakStatusFromAPI } = useAttendanceStore();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!user || syncedRef.current) return;
    syncedRef.current = true;

    const syncFromServer = async () => {
      try {
        const res = await apiClient.get('/attendance/status');
        const data = res.data?.data;
        if (!data) return;

        setBreakStatusFromAPI({
          isOnBreak: !!data.isOnBreak,
          isBreakQuotaExhausted: !!data.isBreakQuotaExhausted,
          assignedBreakMinutes: Number(data.assignedBreakMinutes ?? 60),
          totalBreakMinutes: Number(data.totalBreakMinutes ?? 0),
          remainingBreakMinutes: Number(data.remainingBreakMinutes ?? 0),
          activeBreak: data.activeBreak
            ? { breakStartTime: data.activeBreak.breakStartTime ?? null }
            : null,
        });
      } catch {
        // Silently ignore — store keeps its persisted value from localStorage
      }
    };

    syncFromServer();
  }, [user, setBreakStatusFromAPI]);
}
