export interface AttendanceRecord {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  check_in_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  duration_minutes: number | null;
  break_time_minutes: number;
  work_duration_minutes: number | null;
  status: 'present' | 'absent' | 'half_day' | 'work_from_home' | 'on_leave' | 'holiday' | 'weekly_off' | 'sick';
  check_in_location_id: number | null;
  check_out_location_id: number | null;
  check_in_method: string | null;
  check_out_method: string | null;
  is_late: boolean;
  is_early_departure: boolean;
  is_regularized: boolean;
  regularization_request_id: number | null;
  overtime_minutes: number;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  checkInDate?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  durationMinutes?: number | null;
  workDurationMinutes?: number | null;
  checkInLocationId?: number | null;
  checkOutLocationId?: number | null;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
  isLate?: boolean;
}

export interface ShiftTemplate {
  id: number;
  uuid: string;
  shift_name: string;
  shift_code: string;
  shift_type: 'fixed' | 'flexible' | 'rotational' | 'night' | 'split';
  start_time: string | null;
  end_time: string | null;
  duration_hours: number;
  grace_period_minutes: number;
  break_duration_minutes: number;
  is_night_shift: boolean;
  is_flexible: boolean;
  flexible_start_range_start: string | null;
  flexible_start_range_end: string | null;
  color: string;
  description: string | null;
  is_default: boolean;
  status: 'active' | 'inactive';
}

export interface EmployeeShiftAssignment {
  id: number;
  uuid: string;
  employee_id: number;
  shift_id: number;
  shift_rotation_id: number | null;
  assignment_start_date: string;
  assignment_end_date: string | null;
  is_current: boolean;
}

export interface AttendanceLocation {
  id: number;
  uuid: string;
  location_name: string;
  location_code: string;
  branch_id: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  is_primary: boolean;
}

export interface AttendanceGeofence {
  id: number;
  uuid: string;
  location_id: number;
  geofence_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_office_location: boolean;
  allows_remote_work: boolean;
}

export interface Regularization {
  id: number;
  uuid: string;
  employee_id: number;
  attendance_record_id: number | null;
  regularization_type: 'missed_punch' | 'late_arrival' | 'early_departure' | 'work_from_home' | 'manual_correction';
  request_date: string;
  reason_description: string | null;
  supporting_document_url: string | null;
  workflow_instance_id: number | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  approval_comments: string | null;
}

export interface OvertimeRequest {
  id: number;
  uuid: string;
  employee_id: number;
  overtime_date: string;
  overtime_hours: number;
  overtime_type: 'extra_hours' | 'weekend_work' | 'holiday_work';
  reason_description: string | null;
  workflow_instance_id: number | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: number | null;
  approval_date: string | null;
  comp_off_eligible: boolean;
  comp_off_used: boolean;
}

export interface Timesheet {
  id: number;
  uuid: string;
  employee_id: number;
  timesheet_period_start: string;
  timesheet_period_end: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_by: number | null;
  submitted_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

export interface TimesheetEntry {
  id: number;
  uuid: string;
  timesheet_id: number;
  entry_date: string;
  project_id: number | null;
  task_name: string;
  task_description: string | null;
  hours_spent: number;
  is_billable: boolean;
  billable_rate: number | null;
  effort_category: string | null;
  entry_status: 'draft' | 'submitted';
}

export interface AttendanceSummary {
  id: number;
  employee_id: number;
  summary_month: string;
  present_days: number;
  absent_days: number;
  half_days: number;
  sick_days: number;
  work_from_home_days: number;
  late_arrivals: number;
  early_departures: number;
  overtime_hours: number;
  total_work_hours: number;
  avg_daily_hours: number;
  attendance_percentage: number;
}

export interface PaginatedList<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
