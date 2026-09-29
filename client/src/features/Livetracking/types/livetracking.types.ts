// ============================================================
// Livetracking Frontend TypeScript Types
// client/src/features/Livetracking/types/livetracking.types.ts
// ============================================================

/** Live employee snapshot returned from GET /livetracking/live */
export interface LiveEmployee {
  employee_id: number;
  employee_code: string;
  name: string;
  avatar_url: string | null;
  department: string;
  designation: string;
  reporting_manager: string | null;
  reporting_manager_id: number | null;
  department_id: number | null;
  branch_id: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  location_status: 'ON' | 'OFF';
  connection_status: 'ONLINE' | 'OFFLINE';
  last_ping_at: string | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  attendance_status: string | null;
  face_attendance_status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  /** Real-time breadcrumb trail for route line rendering */
  routeTrail?: RoutePoint[];
  /** Real-time detected breaks along the route */
  breakPoints?: BreakPoint[];
}

/** Break/Stop event detected along a route */
export interface BreakPoint {
  id: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  address?: string | null;
}

/** Historical breadcrumb point for route playback */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  recorded_at: string;
  heading?: number | null;
  /** Road-snapped position, when a routing engine produced one. latitude/longitude is raw GPS. */
  snapped_latitude?: number | null;
  snapped_longitude?: number | null;
}

/** One accepted location fix, as broadcast in `tracking:locations` batches */
export interface LocationDelta {
  employee_id: number;
  latitude: number;
  longitude: number;
  previous_latitude: number | null;
  previous_longitude: number | null;
  heading: number | null;
  /** m/s */
  speed: number | null;
  accuracy: number | null;
  /** When the fix was taken (ISO) */
  timestamp: string;
  /** When the server received it (ISO) */
  last_ping_at: string;
  location_status: 'ON' | 'OFF';
  connection_status: 'ONLINE' | 'OFFLINE';
  /** Stored as a breadcrumb → append to the route line */
  route_point: boolean;
  /** Start a new route segment (do not connect to the previous point) */
  segment_break: boolean;
  /** Replayed after an offline period → append without animating each point */
  replay: boolean;
}

/** Derived live state shown on the map and in the selected-employee panel */
export type MovementStatus = 'moving' | 'idle' | 'offline' | 'gps_off';

/** Real-time socket event payloads */
export interface TrackingLocationUpdatedEvent {
  employee_id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  location_status: 'ON' | 'OFF';
  connection_status: 'ONLINE' | 'OFFLINE';
  last_ping_at: string;
}

export interface TrackingStatusChangedEvent {
  employee_id: number;
  connection_status?: 'ONLINE' | 'OFFLINE';
  location_status?: 'ON' | 'OFF';
  timestamp: string;
}

/** Filter state for the dashboard filter bar */
export interface LiveTrackingFilters {
  search: string;
  department: string;
  designation: string;
  reportingManager: string;
  attendanceStatus: string;
  connectionStatus: 'all' | 'ONLINE' | 'OFFLINE';
  locationStatus: 'all' | 'ON' | 'OFF';
}

/** Daily aggregated tracking session per employee */
export interface TrackingSession {
  id: number;
  employee_id: number;
  session_date: string;       // 'YYYY-MM-DD'
  session_start: string | null;
  session_end: string | null;
  total_working_minutes: number;
  total_break_minutes: number;
  break_count: number;
  total_distance_km: number;
  ping_count: number;
  employee_name?: string;
  employee_code?: string;
  department?: string;
  designation?: string;
}

