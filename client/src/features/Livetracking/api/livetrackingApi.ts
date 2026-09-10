// ============================================================
// Livetracking API Service
// client/src/features/Livetracking/api/livetrackingApi.ts
// ============================================================
import apiClient from '@/lib/api';
import type { LiveEmployee, RoutePoint, TrackingSession } from '../types/livetracking.types';

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

/**
 * Fetch all employee session summaries for a specific date (HR/Admin only).
 * @param date - 'YYYY-MM-DD' format date string
 */
export async function fetchDailySessions(date: string): Promise<TrackingSession[]> {
  const res = await apiClient.get('/livetracking/sessions', { params: { date } });
  return (res.data?.data || []) as TrackingSession[];
}

/**
 * Fetch session history for a specific employee over a date range.
 * @param employeeId - The target employee
 * @param from - 'YYYY-MM-DD' start date
 * @param to - 'YYYY-MM-DD' end date
 */
export async function fetchEmployeeSessions(
  employeeId: number,
  from: string,
  to: string
): Promise<TrackingSession[]> {
  const res = await apiClient.get(`/livetracking/sessions/${employeeId}`, {
    params: { from, to },
  });
  return (res.data?.data || []) as TrackingSession[];
}

/**
 * Explicitly save/pin an employee's location to DB.
 */
export async function saveEmployeeLocation(
  employeeId: number,
  latitude: number,
  longitude: number,
  address?: string
): Promise<void> {
  await apiClient.post('/livetracking/save-location', {
    employee_id: employeeId,
    latitude,
    longitude,
    address,
  });
}

