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
  attendance_status: string | null;
  face_attendance_status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
}

/** Historical breadcrumb point for route playback */
export interface RoutePoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  recorded_at: string;
}

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
