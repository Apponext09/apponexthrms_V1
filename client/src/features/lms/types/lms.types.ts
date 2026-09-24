export interface LmsCategory {
  id: number;
  organizationId: number;
  organization_id?: number;
  companyId?: number | null;
  company_id?: number | null;
  name: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  courseCount?: number;
  course_count?: number;
}

export interface LmsCourse {
  id: number;
  uuid?: string;
  organizationId: number;
  organization_id?: number;
  companyId?: number | null;
  company_id?: number | null;
  categoryId?: number | null;
  category_id?: number | null;
  categoryName?: string;
  category_name?: string;
  title: string;
  description?: string | null;
  type: 'self_paced' | 'blended' | 'instructor_led';
  durationHours: number;
  duration_hours?: number;
  skillTags?: string[];
  skill_tags?: string[];
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
  isMandatory: boolean;
  is_mandatory?: boolean;
  deadlineDays: number;
  deadline_days?: number;
  passPercentage: number;
  pass_percentage?: number;
  attemptLimit: number;
  attempt_limit?: number;
  status: 'draft' | 'published' | 'archived';
  // Integration source tracking (additive — default 'manual')
  source?: 'manual' | 'udemy' | 'coursera' | 'linkedin';
  externalId?: string | null;
  external_id?: string | null;
  externalUrl?: string | null;
  external_url?: string | null;
  createdBy?: number | null;
  created_by?: number | null;
  updatedBy?: number | null;
  updated_by?: number | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  moduleCount?: number;
  module_count?: number;
  enrolledCount?: number;
  enrolled_count?: number;
  completedCount?: number;
  completed_count?: number;
  modules?: LmsModule[];
}

export interface LmsModule {
  id: number;
  organizationId: number;
  organization_id?: number;
  courseId: number;
  course_id?: number;
  name: string;
  contentType: 'video' | 'pdf' | 'ppt' | 'link' | 'text';
  content_type?: 'video' | 'pdf' | 'ppt' | 'link' | 'text';
  contentUrl?: string | null;
  content_url?: string | null;
  bodyText?: string | null;
  body_text?: string | null;
  sequence: number;
  isLocked: boolean;
  is_locked?: boolean;
  durationMinutes: number;
  duration_minutes?: number;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsBatch {
  id: number;
  organizationId: number;
  organization_id?: number;
  companyId?: number | null;
  company_id?: number | null;
  courseId: number;
  course_id?: number;
  courseTitle?: string;
  course_title?: string;
  trainerId?: number | null;
  trainer_id?: number | null;
  trainerName?: string | null;
  trainer_name?: string | null;
  title: string;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  scheduleTime?: string | null;
  schedule_time?: string | null;
  scheduleDays?: string | null;
  schedule_days?: string | null;
  todaySessionTime?: string | null;
  today_session_time?: string | null;
  sessionNotice?: string | null;
  session_notice?: string | null;
  mode: 'online' | 'offline';
  maxSeats: number;
  max_seats?: number;
  seatsFilled: number;
  seats_filled?: number;
  meetingLink?: string | null;
  meeting_link?: string | null;
  location?: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsEnrollment {
  id: number;
  organizationId: number;
  organization_id?: number;
  employeeId: number;
  employee_id?: number;
  employeeName?: string;
  employee_name?: string;
  employeeCode?: string;
  employee_code?: string;
  departmentName?: string;
  department_name?: string;
  courseId: number;
  course_id?: number;
  courseTitle?: string;
  course_title?: string;
  courseThumbnail?: string;
  course_thumbnail?: string;
  courseDurationHours?: number;
  course_duration_hours?: number;
  courseType?: 'self_paced' | 'blended' | 'instructor_led';
  course_type?: 'self_paced' | 'blended' | 'instructor_led';
  batchId?: number | null;
  batch_id?: number | null;
  batchTitle?: string;
  batch_title?: string;
  enrolledBy: 'self' | 'manager' | 'admin';
  enrolled_by?: 'self' | 'manager' | 'admin';
  enrolledByEmployeeId?: number | null;
  enrolled_by_employee_id?: number | null;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progressPct: number;
  progress_pct?: number;
  completedModules?: number[];
  completed_modules?: number[];
  enrolledOn: string;
  enrolled_on?: string;
  completedOn?: string | null;
  completed_on?: string | null;
  score?: number | null;
  batchMeetingLink?: string | null;
  batch_meeting_link?: string | null;
  batchTrainerName?: string | null;
  batch_trainer_name?: string | null;
  batchMode?: 'online' | 'offline';
  batch_mode?: 'online' | 'offline';
  batchStartDate?: string | null;
  batch_start_date?: string | null;
  batchEndDate?: string | null;
  batch_end_date?: string | null;
  batchScheduleTime?: string | null;
  batch_schedule_time?: string | null;
  batchScheduleDays?: string | null;
  batch_schedule_days?: string | null;
  batchTodaySessionTime?: string | null;
  batch_today_session_time?: string | null;
  batchSessionNotice?: string | null;
  batch_session_notice?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsQuestion {
  id: string | number;
  question: string;
  options: string[];
  correctIndex?: number;
  correct_index?: number;
  marks?: number;
  explanation?: string;
}

export interface LmsAssessment {
  id: number;
  organizationId: number;
  organization_id?: number;
  courseId: number;
  course_id?: number;
  title: string;
  description?: string | null;
  questions: LmsQuestion[];
  passPercentage: number;
  pass_percentage?: number;
  attemptLimit: number;
  attempt_limit?: number;
  timerSeconds: number;
  timer_seconds?: number;
  isActive: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsAssessmentAttempt {
  id: number;
  organizationId: number;
  organization_id?: number;
  assessmentId: number;
  assessment_id?: number;
  employeeId: number;
  employee_id?: number;
  enrollmentId?: number | null;
  enrollment_id?: number | null;
  answers: Record<string, number>;
  score: number;
  passed: boolean;
  attemptNumber: number;
  attempt_number?: number;
  attemptedAt: string;
  attempted_at?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsCertificate {
  id: number;
  certificateNumber: string;
  certificate_number?: string;
  organizationId: number;
  organization_id?: number;
  employeeId: number;
  employee_id?: number;
  employeeName?: string;
  employee_name?: string;
  employeeCode?: string;
  employee_code?: string;
  courseId: number;
  course_id?: number;
  courseTitle?: string;
  course_title?: string;
  courseThumbnail?: string;
  course_thumbnail?: string;
  enrollmentId?: number | null;
  enrollment_id?: number | null;
  issuedOn: string;
  issued_on?: string;
  expiryDate?: string | null;
  expiry_date?: string | null;
  certificateUrl?: string | null;
  certificate_url?: string | null;
  score?: number | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsCompliance {
  id: number;
  organizationId: number;
  organization_id?: number;
  courseId: number;
  course_id?: number;
  courseTitle?: string;
  course_title?: string;
  departmentId?: number | null;
  department_id?: number | null;
  departmentName?: string;
  department_name?: string;
  designationId?: number | null;
  designation_id?: number | null;
  designationName?: string;
  designation_name?: string;
  isMandatory: boolean;
  is_mandatory?: boolean;
  deadlineDays: number;
  deadline_days?: number;
  reminderSchedule?: number[];
  reminder_schedule?: number[];
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface LmsAnalytics {
  kpis: {
    totalCourses: number;
    activeCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    inProgressEnrollments: number;
    notStartedEnrollments: number;
    completionRate: number;
    avgProgress: number;
    avgScore: number;
    totalLearningHours: number;
  };
  topCourses: Array<{
    id: number;
    title: string;
    thumbnail_url?: string;
    duration_hours: number;
    enrollments_count: number;
    completions_count: number;
  }>;
  departmentStats: Array<{
    department_id: number;
    department_name: string;
    total_employees: number;
    total_enrollments: number;
    completed_enrollments: number;
    avg_progress: number;
  }>;
  recentCertificates: Array<{
    id: number;
    certificate_number: string;
    issued_on: string;
    score?: number;
    employee_name: string;
    course_title: string;
  }>;
}

// ==========================================
// LMS Integration Settings (client-safe DTOs)
// ==========================================
export type LmsPlatform = 'udemy' | 'coursera' | 'linkedin';

export interface LmsIntegrationSetting {
  platform: LmsPlatform;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  isConfigured: boolean;
}

export interface LmsSyncResult {
  platform: LmsPlatform;
  imported: number;
  skipped: number;
  message: string;
}
