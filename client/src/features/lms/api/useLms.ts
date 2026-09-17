import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lmsApi } from './lmsApi';
import { toast } from 'sonner';

export const LMS_QUERY_KEYS = {
  analytics: ['lms', 'analytics'] as const,
  categories: (search?: string) => ['lms', 'categories', search] as const,
  courses: (filters?: any) => ['lms', 'courses', filters] as const,
  course: (id: number) => ['lms', 'course', id] as const,
  modules: (courseId: number) => ['lms', 'modules', courseId] as const,
  batches: (filters?: any) => ['lms', 'batches', filters] as const,
  enrollments: (filters?: any) => ['lms', 'enrollments', filters] as const,
  myEnrollments: (employeeId?: number) => ['lms', 'my-enrollments', employeeId] as const,
  teamEnrollments: (employeeIds?: number[]) => ['lms', 'team-enrollments', employeeIds] as const,
  assessment: (courseId: number) => ['lms', 'assessment', courseId] as const,
  adminAssessment: (courseId: number) => ['lms', 'admin-assessment', courseId] as const,
  attempts: (assessmentId: number, employeeId?: number) => ['lms', 'attempts', assessmentId, employeeId] as const,
  certificates: (filters?: any) => ['lms', 'certificates', filters] as const,
  myCertificates: (employeeId?: number) => ['lms', 'my-certificates', employeeId] as const,
  compliance: ['lms', 'compliance'] as const,
};

// ── Analytics ────────────────────────────────────────────────────────
export function useLmsAnalytics() {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.analytics,
    queryFn: () => lmsApi.getAnalytics(),
  });
}

// ── Categories ───────────────────────────────────────────────────────
export function useLmsCategories(search?: string) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.categories(search),
    queryFn: () => lmsApi.getCategories(search),
  });
}

export function useCreateLmsCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lmsApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'categories'] });
      toast.success('Category created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create category');
    },
  });
}

export function useUpdateLmsCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => lmsApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'categories'] });
      toast.success('Category updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update category');
    },
  });
}

export function useDeleteLmsCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lmsApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'categories'] });
      toast.success('Category deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    },
  });
}

// ── Courses ──────────────────────────────────────────────────────────
export function useLmsCourses(filters?: any) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.courses(filters),
    queryFn: () => lmsApi.getCourses(filters),
  });
}

export function useLmsCourse(id: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.course(id),
    queryFn: () => lmsApi.getCourseById(id),
    enabled: !!id,
  });
}

export function useCreateLmsCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lmsApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
      toast.success('Course created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create course');
    },
  });
}

export function useUpdateLmsCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => lmsApi.updateCourse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.course(variables.id) });
      toast.success('Course updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update course');
    },
  });
}

export function useDeleteLmsCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lmsApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
      toast.success('Course deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    },
  });
}

// ── Modules ──────────────────────────────────────────────────────────
export function useLmsModules(courseId: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.modules(courseId),
    queryFn: () => lmsApi.getModules(courseId),
    enabled: !!courseId,
  });
}

export function useCreateLmsModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lmsApi.createModule(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.modules(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.course(variables.courseId) });
      toast.success('Module added successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add module');
    },
  });
}

export function useUpdateLmsModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => lmsApi.updateModule(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'modules'] });
      if (variables.data?.courseId) {
        queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.modules(variables.data.courseId) });
        queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.course(variables.data.courseId) });
      }
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      toast.success('Module updated successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to update module';
      toast.error(msg);
    },
  });
}

export function useDeleteLmsModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, courseId }: { id: number; courseId: number }) => lmsApi.deleteModule(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'modules'] });
      if (variables.courseId) {
        queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.modules(variables.courseId) });
        queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.course(variables.courseId) });
      }
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      toast.success('Module deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete module');
    },
  });
}

export function useReorderLmsModules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, moduleOrders }: { courseId: number; moduleOrders: { id: number; sequence: number }[] }) =>
      lmsApi.reorderModules(courseId, moduleOrders),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.modules(variables.courseId) });
      toast.success('Modules reordered');
    },
  });
}

// ── Batches ──────────────────────────────────────────────────────────
export function useLmsBatches(filters?: any) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.batches(filters),
    queryFn: () => lmsApi.getBatches(filters),
  });
}

export function useCreateLmsBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lmsApi.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'batches'] });
      toast.success('Batch created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create batch');
    },
  });
}

export function useUpdateLmsBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => lmsApi.updateBatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'batches'] });
      toast.success('Batch updated');
    },
  });
}

export function useDeleteLmsBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lmsApi.deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'batches'] });
      toast.success('Batch deleted');
    },
  });
}

// ── Enrollments ───────────────────────────────────────────────────────
export function useLmsEnrollments(filters?: any) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.enrollments(filters),
    queryFn: () => lmsApi.getEnrollments(filters),
  });
}

export function useMyLmsEnrollments(employeeId?: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.myEnrollments(employeeId),
    queryFn: () => lmsApi.getMyEnrollments(employeeId),
  });
}

export function useTeamLmsEnrollments(employeeIds?: number[]) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.teamEnrollments(employeeIds),
    queryFn: () => lmsApi.getTeamEnrollments(employeeIds),
    enabled: !!employeeIds && employeeIds.length > 0,
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: number; courseId: number; batchId?: number | null; enrolledBy?: string }) =>
      lmsApi.createEnrollment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
      toast.success('Enrolled successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    },
  });
}

export function useBulkEnrollCourses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { courseId: number; batchId?: number | null; employeeIds: number[]; enrolledBy?: 'admin' | 'manager' }) =>
      lmsApi.bulkEnroll(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
      toast.success(`Successfully enrolled ${res.length} employee(s)`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to bulk enroll');
    },
  });
}

export function useUpdateLmsProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { progressPct?: number; completedModuleId?: number; status?: string } }) =>
      lmsApi.updateProgress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'certificates'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
    },
  });
}

// ── Assessments ───────────────────────────────────────────────────────
export function useLmsAssessment(courseId: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.assessment(courseId),
    queryFn: () => lmsApi.getAssessment(courseId),
    enabled: !!courseId,
  });
}

export function useAdminLmsAssessment(courseId: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.adminAssessment(courseId),
    queryFn: () => lmsApi.getAdminAssessment(courseId),
    enabled: !!courseId,
  });
}

export function useSaveLmsAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: any }) =>
      id ? lmsApi.updateAssessment(id, data) : lmsApi.createAssessment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'assessment'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'admin-assessment'] });
      toast.success('Assessment saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save assessment');
    },
  });
}

export function useLmsAttempts(assessmentId: number, employeeId?: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.attempts(assessmentId, employeeId),
    queryFn: () => lmsApi.getAttempts(assessmentId, employeeId),
    enabled: !!assessmentId,
  });
}

export function useSubmitLmsAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { assessmentId: number; enrollmentId?: number | null; answers: Record<string, number>; employeeId?: number }) =>
      lmsApi.submitAssessment(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'attempts'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'certificates'] });
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.analytics });
      if (res.passed) {
        toast.success(`Congratulations! You passed with ${res.score}%`);
      } else {
        toast.error(`Assessment completed. Score: ${res.score}%. (Passing score required).`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit assessment');
    },
  });
}

// ── Certificates ──────────────────────────────────────────────────────
export function useLmsCertificates(filters?: any) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.certificates(filters),
    queryFn: () => lmsApi.getCertificates(filters),
  });
}

export function useMyLmsCertificates(employeeId?: number) {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.myCertificates(employeeId),
    queryFn: () => lmsApi.getMyCertificates(employeeId),
  });
}

// ── Compliance ────────────────────────────────────────────────────────
export function useLmsCompliance() {
  return useQuery({
    queryKey: LMS_QUERY_KEYS.compliance,
    queryFn: () => lmsApi.getComplianceRules(),
  });
}

export function useCreateLmsCompliance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lmsApi.createComplianceRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.compliance });
      toast.success('Compliance rule added');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add compliance rule');
    },
  });
}

export function useDeleteLmsCompliance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lmsApi.deleteComplianceRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LMS_QUERY_KEYS.compliance });
      toast.success('Compliance rule deleted');
    },
  });
}

// ── Integration Hooks ─────────────────────────────────────────────────────

/**
 * Fetches the enabled/disabled status for all supported LMS platforms.
 * Used by CourseManagementPage to conditionally show "Import from Platform" button,
 * and by LmsIntegrationSettingsPage to render the toggle UI.
 */
export function useLmsIntegrationSettings() {
  return useQuery({
    queryKey: ['lms', 'integration-settings'],
    queryFn: () => lmsApi.getIntegrationSettings(),
    staleTime: 0, // always fetch fresh — toggles must reflect instantly
  });
}

/**
 * Admin mutation: toggle a platform on/off and save credentials.
 */
export function useUpdateLmsIntegrationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      platform,
      data,
    }: {
      platform: import('../types/lms.types').LmsPlatform;
      data: { isEnabled?: boolean; config?: Record<string, string> };
    }) => lmsApi.updateIntegrationSetting(platform, data),
    onSuccess: (updatedSetting, variables) => {
      // Immediately update the cache with the server-returned value
      queryClient.setQueryData(
        ['lms', 'integration-settings'],
        (old: import('../types/lms.types').LmsIntegrationSetting[] | undefined) => {
          if (!old) return [updatedSetting];
          const exists = old.some((s) => s.platform === updatedSetting.platform);
          if (exists) {
            return old.map((s) =>
              s.platform === updatedSetting.platform ? updatedSetting : s
            );
          }
          return [...old, updatedSetting];
        }
      );
      // Then kick off a background refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['lms', 'integration-settings'] });
      const label = variables.platform.charAt(0).toUpperCase() + variables.platform.slice(1);
      toast.success(`${label} integration settings saved`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update integration settings');
    },
  });
}

/**
 * Admin mutation: trigger an on-demand course import from a platform.
 * Shows a descriptive toast with the sync result message.
 */
export function useSyncLmsPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (platform: import('../types/lms.types').LmsPlatform) =>
      lmsApi.syncPlatform(platform),
    onSuccess: (result) => {
      // Invalidate courses so newly imported courses appear immediately
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] });
      queryClient.invalidateQueries({ queryKey: ['lms', 'integration-settings'] });
      toast.success(result.message);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Sync failed. Please try again.');
    },
  });
}
