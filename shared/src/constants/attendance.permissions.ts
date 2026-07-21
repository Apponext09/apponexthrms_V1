/**
 * Attendance Module Permissions
 * Total: 8 permission codes for complete attendance management
 */

export const ATTENDANCE_PERMISSIONS = {
  // Core attendance
  'attendance.read': 'attendance.read', // View own and team attendance records
  'attendance.write': 'attendance.write', // Create/update attendance records (admin only)
  'attendance.check_in': 'attendance.check_in', // Check-in capability
  'attendance.check_out': 'attendance.check_out', // Check-out capability
  'attendance.break_in': 'attendance.break_in', // Start break
  'attendance.break_out': 'attendance.break_out', // End break

  // Shift management
  'attendance.shift_read': 'attendance.shift_read', // View shifts
  'attendance.shift_write': 'attendance.shift_write', // Create/update shifts (admin only)
  'attendance.shift_swap': 'attendance.shift_swap', // Request shift swap

  // Location & Geofencing
  'attendance.location_read': 'attendance.location_read', // View locations
  'attendance.location_write': 'attendance.location_write', // Create/update locations (admin only)

  // Regularization (requires approval workflow)
  'attendance.regularization_read': 'attendance.regularization_read', // View regularization requests
  'attendance.regularization_write': 'attendance.regularization_write', // Create regularization requests
  'attendance.regularization_approve': 'attendance.regularization_approve', // Approve regularization

  // Overtime
  'attendance.overtime_read': 'attendance.overtime_read', // View overtime
  'attendance.overtime_write': 'attendance.overtime_write', // Request overtime
  'attendance.overtime_approve': 'attendance.overtime_approve', // Approve overtime

  // Timesheet
  'attendance.timesheet_read': 'attendance.timesheet_read', // View timesheets
  'attendance.timesheet_write': 'attendance.timesheet_write', // Create/submit timesheets
  'attendance.timesheet_approve': 'attendance.timesheet_approve', // Approve timesheets

  // Analytics & Reports
  'attendance.analytics_read': 'attendance.analytics_read', // View attendance analytics/reports
} as const;

export const ATTENDANCE_PERMISSION_CODES = Object.keys(ATTENDANCE_PERMISSIONS);

/**
 * Role-based permission mappings for Attendance
 */
export const ATTENDANCE_ROLE_PERMISSIONS = {
  employee: [
    'attendance.read', // Can view own records
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.shift_swap',
    'attendance.location_read',
    'attendance.regularization_read',
    'attendance.regularization_write', // Can request regularization
    'attendance.overtime_read',
    'attendance.overtime_write', // Can request overtime
    'attendance.timesheet_read',
    'attendance.timesheet_write',
    'attendance.analytics_read', // Personal analytics only
  ],

  team_lead: [
    'attendance.read',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.shift_swap',
    'attendance.location_read',
    'attendance.regularization_read',
    'attendance.regularization_write',
    'attendance.regularization_approve', // Can approve team regularizations
    'attendance.overtime_read',
    'attendance.overtime_write',
    'attendance.overtime_approve', // Can approve team overtime
    'attendance.timesheet_read',
    'attendance.timesheet_write',
    'attendance.timesheet_approve', // Can approve team timesheets
    'attendance.analytics_read',
  ],

  reporting_manager: [
    'attendance.read',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.shift_swap',
    'attendance.location_read',
    'attendance.regularization_read',
    'attendance.regularization_write',
    'attendance.regularization_approve',
    'attendance.overtime_read',
    'attendance.overtime_write',
    'attendance.overtime_approve',
    'attendance.timesheet_read',
    'attendance.timesheet_write',
    'attendance.timesheet_approve',
    'attendance.analytics_read',
  ],

  hr_manager: [
    'attendance.read',
    'attendance.write',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.shift_write',
    'attendance.shift_swap',
    'attendance.location_read',
    'attendance.location_write',
    'attendance.regularization_read',
    'attendance.regularization_write',
    'attendance.regularization_approve',
    'attendance.overtime_read',
    'attendance.overtime_write',
    'attendance.overtime_approve',
    'attendance.timesheet_read',
    'attendance.timesheet_write',
    'attendance.timesheet_approve',
    'attendance.analytics_read',
  ],

  organization_admin: [
    // Full access to all attendance features
    ...Object.keys(ATTENDANCE_PERMISSIONS),
  ],

  super_admin: [
    // Full access to all attendance features
    ...Object.keys(ATTENDANCE_PERMISSIONS),
  ],

  consultant: [
    'attendance.read',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.location_read',
    'attendance.regularization_read',
    'attendance.timesheet_read',
    'attendance.timesheet_write',
  ],

  intern: [
    'attendance.read',
    'attendance.check_in',
    'attendance.check_out',
    'attendance.break_in',
    'attendance.break_out',
    'attendance.shift_read',
    'attendance.location_read',
    'attendance.timesheet_read',
    'attendance.timesheet_write',
  ],

  auditor: [
    'attendance.read',
    'attendance.analytics_read',
  ],

  finance_manager: [
    'attendance.read',
    'attendance.overtime_read',
    'attendance.timesheet_read',
    'attendance.analytics_read',
  ],
} as const;
