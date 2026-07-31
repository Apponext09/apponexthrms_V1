// ============================================================
// Livetracking API Service
// client/src/features/Livetracking/api/livetrackingApi.ts
// ============================================================
import apiClient from '@/lib/api';
import type { LiveEmployee, RoutePoint } from '../types/livetracking.types';

/**
 * Fetch the live location snapshot for all accessible employees.
 * - HR/Admin → all org employees
 * - Manager → reporting team only (server-side scoped)
 */
export async function fetchLiveLocations(): Promise<LiveEmployee[]> {
  const res = await apiClient.get('/livetracking/live');
  return (res.data?.data || []) as LiveEmployee[];
}

/**
 * Fetch historical location breadcrumbs for route playback.
 * @param employeeId - The employee whose route to show
 * @param date - 'YYYY-MM-DD' format date string
 */
export async function fetchRouteHistory(
  employeeId: number,
  date: string
): Promise<RoutePoint[]> {
  const res = await apiClient.get(`/livetracking/history/${employeeId}`, {
    params: { date },
  });
  return (res.data?.data || []) as RoutePoint[];
}
