import { z } from 'zod';

// ==========================================
// LMS Categories
// ==========================================
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(150),
  description: z.string().optional().nullable(),
  icon: z.string().optional().default('Folder'),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export interface LmsCategory {
  id: number;
  organization_id: number;
  organizationId?: number;
  company_id?: number | null;
  companyId?: number | null;
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  isActive?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  course_count?: number;
  courseCount?: number;
}

// ==========================================
// LMS Courses
// ==========================================
export const createCourseSchema = z.object({
  categoryId: z.number().optional().nullable(),
  title: z.string().min(1, 'Course title is required').max(255),
  description: z.string().optional().nullable(),
  type: z.enum(['self_paced', 'blended', 'instructor_led']).default('self_paced'),
  durationHours: z.number().min(0).default(0),
  skillTags: z.array(z.string()).optional().default([]),
  thumbnailUrl: z.string().optional().nullable(),
  isMandatory: z.boolean().optional().default(false),
  deadlineDays: z.number().min(0).optional().default(0),
  passPercentage: z.number().min(0).max(100).optional().default(60.00),
  attemptLimit: z.number().min(1).optional().default(3),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export const updateCourseSchema = createCourseSchema.partial();

export interface LmsCourse {
  id: number;
  uuid?: string;
  organization_id: number;
  organizationId?: number;
  company_id?: number | null;
  companyId?: number | null;
  category_id?: number | null;
  categoryId?: number | null;
  category_name?: string;
  categoryName?: string;
  title: string;
  description?: string | null;
  type: 'self_paced' | 'blended' | 'instructor_led';
  duration_hours: number;
  durationHours?: number;
  skill_tags?: string[] | any;
  skillTags?: string[] | any;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  is_mandatory: boolean;
  isMandatory?: boolean;
  deadline_days: number;
  deadlineDays?: number;
  pass_percentage: number;
  passPercentage?: number;
  attempt_limit: number;
  attemptLimit?: number;
  status: 'draft' | 'published' | 'archived';
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  module_count?: number;
  moduleCount?: number;
  enrolled_count?: number;
  enrolledCount?: number;
  completed_count?: number;
  completedCount?: number;
}

// ==========================================
// LMS Modules
// ==========================================
export const createModuleSchema = z.object({
  courseId: z.number(),
  name: z.string().min(1, 'Module name is required').max(255),
  contentType: z.enum(['video', 'pdf', 'ppt', 'link', 'text']).default('video'),
  contentUrl: z.string().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  sequence: z.number().min(1).default(1),
  isLocked: z.boolean().optional().default(false),
  durationMinutes: z.number().min(0).default(0),
});

export const updateModuleSchema = createModuleSchema.partial();

export const reorderModulesSchema = z.object({
  courseId: z.number(),
  moduleOrders: z.array(z.object({
    id: z.number(),
    sequence: z.number(),
  })),
});

export interface LmsModule {
  id: number;
  organization_id: number;
  organizationId?: number;
  course_id: number;
  courseId?: number;
  name: string;
  content_type: 'video' | 'pdf' | 'ppt' | 'link' | 'text';
  contentType?: 'video' | 'pdf' | 'ppt' | 'link' | 'text';
  content_url?: string | null;
  contentUrl?: string | null;
  body_text?: string | null;
  bodyText?: string | null;
  sequence: number;
  is_locked: boolean;
  isLocked?: boolean;
  duration_minutes: number;
  durationMinutes?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ==========================================
// LMS Batches
// ==========================================
export const createBatchSchema = z.object({
  courseId: z.number(),
  trainerId: z.number().optional().nullable(),
  trainerName: z.string().optional().nullable(),
  title: z.string().min(1, 'Batch title is required').max(255),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  scheduleTime: z.string().optional().nullable(),
  scheduleDays: z.string().optional().nullable(),
  todaySessionTime: z.string().optional().nullable(),
  sessionNotice: z.string().optional().nullable(),
  mode: z.enum(['online', 'offline']).default('online'),
  maxSeats: z.number().min(1).default(50),
  meetingLink: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
});

export const updateBatchSchema = createBatchSchema.partial();

export interface LmsBatch {
  id: number;
  organization_id: number;
  organizationId?: number;
  company_id?: number | null;
  companyId?: number | null;
  course_id: number;
  courseId?: number;
  course_title?: string;
  courseTitle?: string;
  trainer_id?: number | null;
  trainerId?: number | null;
  trainer_name?: string | null;
  trainerName?: string | null;
  title: string;
  start_date?: string | null;
  startDate?: string | null;
  end_date?: string | null;
  endDate?: string | null;
  schedule_time?: string | null;
  scheduleTime?: string | null;
  schedule_days?: string | null;
  scheduleDays?: string | null;
  today_session_time?: string | null;
  todaySessionTime?: string | null;
  session_notice?: string | null;
  sessionNotice?: string | null;
  mode: 'online' | 'offline';
  max_seats: number;
  maxSeats?: number;
  seats_filled: number;
  seatsFilled?: number;
  meeting_link?: string | null;
  meetingLink?: string | null;
  location?: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ==========================================
// LMS Enrollments
// ==========================================
export const createEnrollmentSchema = z.object({
  employeeId: z.number(),
  courseId: z.number(),
  batchId: z.number().optional().nullable(),
  enrolledBy: z.enum(['self', 'manager', 'admin']).default('self'),
});

export const bulkEnrollSchema = z.object({
  courseId: z.number(),
  batchId: z.number().optional().nullable(),
  employeeIds: z.array(z.number()).min(1, 'Select at least one employee'),
  enrolledBy: z.enum(['self', 'manager', 'admin']).default('admin'),
});

export const updateProgressSchema = z.object({
  progressPct: z.number().min(0).max(100).optional(),
  completedModuleId: z.number().optional(),
  status: z.enum(['enrolled', 'in_progress', 'completed', 'dropped']).optional(),
});

export interface LmsEnrollment {
  id: number;
  organization_id: number;
  organizationId?: number;
  employee_id: number;
  employeeId?: number;
  employee_name?: string;
  employeeName?: string;
  employee_code?: string;
  employeeCode?: string;
  department_name?: string;
  departmentName?: string;
  course_id: number;
  courseId?: number;
  course_title?: string;
  courseTitle?: string;
  batch_id?: number | null;
  batchId?: number | null;
  batch_title?: string;
  batchTitle?: string;
  enrolled_by: 'self' | 'manager' | 'admin';
  enrolledBy?: 'self' | 'manager' | 'admin';
  enrolled_by_employee_id?: number | null;
  enrolledByEmployeeId?: number | null;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress_pct: number;
  progressPct?: number;
  completed_modules?: number[] | any;
  completedModules?: number[] | any;
  enrolled_on: string;
  enrolledOn?: string;
  completed_on?: string | null;
  completedOn?: string | null;
  score?: number | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// LMS Assessments & Attempts
// ==========================================
export const assessmentQuestionSchema = z.object({
  id: z.string().or(z.number()),
  question: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).min(2, 'At least 2 options required'),
  correctIndex: z.number().min(0),
  marks: z.number().min(1).default(1),
  explanation: z.string().optional().nullable(),
});

export const createAssessmentSchema = z.object({
  courseId: z.number(),
  title: z.string().min(1, 'Assessment title is required').max(255),
  description: z.string().optional().nullable(),
  questions: z.array(assessmentQuestionSchema).min(1, 'At least one question required'),
  passPercentage: z.number().min(0).max(100).default(60.00),
  attemptLimit: z.number().min(1).default(3),
  timerSeconds: z.number().min(60).default(1800),
  isActive: z.boolean().optional().default(true),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

export const submitAssessmentSchema = z.object({
  assessmentId: z.number(),
  enrollmentId: z.number().optional().nullable(),
  answers: z.record(z.string(), z.number()), // questionId -> selectedOptionIndex
});

export interface LmsAssessment {
  id: number;
  organization_id: number;
  organizationId?: number;
  course_id: number;
  courseId?: number;
  title: string;
  description?: string | null;
  questions: any[];
  pass_percentage: number;
  passPercentage?: number;
  attempt_limit: number;
  attemptLimit?: number;
  timer_seconds: number;
  timerSeconds?: number;
  is_active: boolean;
  isActive?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsAssessmentAttempt {
  id: number;
  organization_id: number;
  organizationId?: number;
  assessment_id: number;
  assessmentId?: number;
  employee_id: number;
  employeeId?: number;
  enrollment_id?: number | null;
  enrollmentId?: number | null;
  answers: any;
  score: number;
  passed: boolean;
  attempt_number: number;
  attemptNumber?: number;
  attempted_at: string;
  attemptedAt?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// LMS Certificates
// ==========================================
export interface LmsCertificate {
  id: number;
  certificate_number: string;
  certificateNumber?: string;
  organization_id: number;
  organizationId?: number;
  employee_id: number;
  employeeId?: number;
  employee_name?: string;
  employeeName?: string;
  course_id: number;
  courseId?: number;
  course_title?: string;
  courseTitle?: string;
  enrollment_id?: number | null;
  enrollmentId?: number | null;
  issued_on: string;
  issuedOn?: string;
  expiry_date?: string | null;
  expiryDate?: string | null;
  certificate_url?: string | null;
  certificateUrl?: string | null;
  score?: number | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// LMS Compliance
// ==========================================
export const createComplianceSchema = z.object({
  courseId: z.number(),
  departmentId: z.number().optional().nullable(),
  designationId: z.number().optional().nullable(),
  isMandatory: z.boolean().optional().default(true),
  deadlineDays: z.number().min(1).default(30),
  reminderSchedule: z.array(z.number()).optional().default([7, 3, 1]),
});

export const updateComplianceSchema = createComplianceSchema.partial();

export interface LmsCompliance {
  id: number;
  organization_id: number;
  organizationId?: number;
  course_id: number;
  courseId?: number;
  course_title?: string;
  courseTitle?: string;
  department_id?: number | null;
  departmentId?: number | null;
  department_name?: string;
  departmentName?: string;
  designation_id?: number | null;
  designationId?: number | null;
  designation_name?: string;
  designationName?: string;
  is_mandatory: boolean;
  isMandatory?: boolean;
  deadline_days: number;
  deadlineDays?: number;
  reminder_schedule?: number[] | any;
  reminderSchedule?: number[] | any;
  created_at: string;
  updated_at: string;
}
