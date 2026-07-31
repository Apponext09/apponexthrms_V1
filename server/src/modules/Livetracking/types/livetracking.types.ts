// ============================================================
// Livetracking Module — Backend TypeScript Interfaces
// server/src/modules/Livetracking/types/livetracking.types.ts
// ============================================================

export interface EmployeeLiveLocation {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  address: string | null;
  location_status: 'ON' | 'OFF';
  connection_status: 'ONLINE' | 'OFFLINE';
  last_ping_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeLocationHistory {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recorded_at: string;
  created_at: string;
}

/** Enriched live snapshot joined with employee details */
export interface LiveEmployeeSnapshot {
  employee_id: number;
  employee_code: string;
  name: string;
  avatar_url: string | null;
  department: string;
  designation: string;
  reporting_manager: string | null;
  reporting_manager_id: number | null;
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
  branch: string | null;
  department_id: number | null;
}

/** Payload emitted from employee socket */
export interface LocationPingPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

/** Socket event payloads */
export interface LocationStatusChangePayload {
  status: 'ON' | 'OFF';
}

export interface SocketAuthPayload {
  token: string;
}

/** Query params for history route */
export interface HistoryQueryParams {
  date: string; // 'YYYY-MM-DD'
  employeeId: number;
}
