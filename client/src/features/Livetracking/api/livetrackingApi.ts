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
 * Fetch one day's route for many employees in a single request (dashboard seeding).
 * Returns compact [latitude, longitude, epochMs] tuples per employee id,
 * thinned server-side and capped at maxPoints (latest points kept).
 */
export async function fetchLiveTrails(
  employeeIds: number[],
  date: string,
  maxPoints = 300
): Promise<Record<number, Array<[number, number, number]>>> {
  if (employeeIds.length === 0) return {};
  const res = await apiClient.get('/livetracking/trails', {
    params: { employee_ids: employeeIds.join(','), date, max_points: maxPoints },
  });
  return (res.data?.data || {}) as Record<number, Array<[number, number, number]>>;
}

/**
 * HTTP replay of fixes buffered while offline (used when the socket is also down).
 */
export async function pingLocationBatchHttp(points: object[]): Promise<{ accepted: number; rejected: number }> {
  const res = await apiClient.post('/livetracking/ping/batch', { points });
  return { accepted: Number(res.data?.accepted ?? 0), rejected: Number(res.data?.rejected ?? 0) };
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
 * HTTP fallback location ping — used by the employee tracker when the Socket.IO
 * connection is down, so a location fix is never silently dropped/lost.
 */
export async function pingLocationHttp(payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}): Promise<void> {
  await apiClient.post('/livetracking/ping', payload);
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

