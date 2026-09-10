import { z } from 'zod';

// ===== CHECK-IN/OUT =====
export const checkInSchema = z.object({
  checkInLocation: z.number().optional(),
  method: z.enum(['web', 'web_portal', 'mobile', 'gps', 'qr', 'biometric', 'kiosk', 'face_recognition']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const checkOutSchema = z.object({
  checkOutLocation: z.number().optional(),
  method: z.enum(['web', 'web_portal', 'mobile', 'gps', 'qr', 'biometric', 'kiosk', 'face_recognition']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const breakInSchema = z.object({
  breakType: z.enum(['lunch', 'tea', 'personal']).optional().default('lunch'),
});

// ===== SHIFT TEMPLATES =====
export const shiftTemplateCreateSchema = z.object({
  shiftName: z.string().min(1).max(100),
  shiftCode: z.string().min(1).max(50),
  shiftType: z.enum(['fixed', 'flexible', 'rotational', 'night', 'split']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationHours: z.number().positive(),
  gracePeriodMinutes: z.number().nonnegative().optional(),
  breakDurationMinutes: z.number().nonnegative().optional(),
  isNightShift: z.boolean().optional(),
  isFlexible: z.boolean().optional(),
  flexibleStartRangeStart: z.string().optional(),
  flexibleStartRangeEnd: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const shiftAssignmentSchema = z.object({
  employeeId: z.number(),
  shiftId: z.number(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  rotationId: z.number().optional(),
});

// ===== LOCATIONS & GEOFENCING =====
export const locationCreateSchema = z.object({
  locationName: z.string().min(1).max(100),
  locationCode: z.string().min(1).max(50),
  branchId: z.number().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const geofenceCreateSchema = z.object({
  locationId: z.number(),
  geofenceName: z.string().min(1).max(100),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().positive(),
  isOfficeLocation: z.boolean().optional(),
  allowsRemoteWork: z.boolean().optional(),
});

export const locationValidationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// ===== SHIFT SWAP =====
export const shiftSwapRequestSchema = z.object({
  requestShiftDate: z.string().date(),
  requestedShiftId: z.number(),
  swapWithEmployeeId: z.number(),
  swapShiftDate: z.string().date().optional(),
  swapShiftId: z.number().optional(),
  reason: z.string().optional(),
});

// ===== REGULARIZATION =====
export const regularizationCreateSchema = z.object({
  type: z.enum(['missed_punch', 'late_arrival', 'early_departure', 'work_from_home', 'manual_correction']),
  requestDate: z.string().date(),
  reason: z.string().min(1),
  attendanceRecordId: z.number().optional(),
  supportingDocumentUrl: z.string().url().optional(),
});

export const regularizationApproveSchema = z.object({
  comments: z.string().optional(),
});

// ===== OVERTIME =====
export const overtimeRequestSchema = z.object({
  overtimeDate: z.string().date(),
  overtimeHours: z.number().positive(),
  overtimeType: z.enum(['extra_hours', 'weekend_work', 'holiday_work']),
  reason: z.string().optional(),

});

// ===== TIMESHEET =====
export const timesheetCreateSchema = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
});

export const timesheetEntrySchema = z.object({
  entryDate: z.string().date(),
  taskName: z.string().min(1).max(255),
  hoursSpent: z.number().positive(),
  isBillable: z.boolean().optional(),
  billableRate: z.number().optional(),
  taskDescription: z.string().optional(),
  effortCategory: z.enum(['development', 'design', 'qa', 'documentation', 'support']).optional(),
  projectId: z.number().optional(),
});

// ===== QUERY PARAMETERS =====
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const attendanceHistorySchema = paginationSchema.extend({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const dateRangeSchema = z.object({
  date: z.string().date().optional(),
});
