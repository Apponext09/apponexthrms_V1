import { apiClient } from '@/config/api';
import type {
  LmsCategory,
  LmsCourse,
  LmsModule,
  LmsBatch,
  LmsEnrollment,
  LmsAssessment,
  LmsAssessmentAttempt,
  LmsCertificate,
  LmsCompliance,
  LmsAnalytics,
} from '../types/lms.types';

export const lmsApi = {
  // Analytics
  getAnalytics: async (): Promise<LmsAnalytics> => {
    const res = await apiClient.get('/lms/dashboard/analytics');
    return res.data.data;
  },

  // Categories
  getCategories: async (search?: string): Promise<LmsCategory[]> => {
    const res = await apiClient.get('/lms/categories', { params: { search } });
    return res.data.data;
  },
  createCategory: async (data: Partial<LmsCategory>): Promise<LmsCategory> => {
    const res = await apiClient.post('/lms/categories', data);
    return res.data.data;
  },
  updateCategory: async (id: number, data: Partial<LmsCategory>): Promise<LmsCategory> => {
    const res = await apiClient.put(`/lms/categories/${id}`, data);
    return res.data.data;
  },
  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/categories/${id}`);
  },

  // Courses
  getCourses: async (filters?: {
    categoryId?: number;
    status?: string;
    type?: string;
    isMandatory?: boolean;
    search?: string;
  }): Promise<LmsCourse[]> => {
    const res = await apiClient.get('/lms/courses', { params: filters });
    return res.data.data;
  },
  getCourseById: async (id: number): Promise<LmsCourse> => {
    const res = await apiClient.get(`/lms/courses/${id}`);
    return res.data.data;
  },
  createCourse: async (data: any): Promise<LmsCourse> => {
    const res = await apiClient.post('/lms/courses', data);
    return res.data.data;
  },
  updateCourse: async (id: number, data: any): Promise<LmsCourse> => {
    const res = await apiClient.put(`/lms/courses/${id}`, data);
    return res.data.data;
  },
  deleteCourse: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/courses/${id}`);
  },

  // Modules
  getModules: async (courseId: number): Promise<LmsModule[]> => {
    const res = await apiClient.get(`/lms/courses/${courseId}/modules`);
    return res.data.data;
  },
  createModule: async (data: any): Promise<LmsModule> => {
    const res = await apiClient.post('/lms/modules', data);
    return res.data.data;
  },
  updateModule: async (id: number, data: any): Promise<LmsModule> => {
    const res = await apiClient.put(`/lms/modules/${id}`, data);
    return res.data.data;
  },
  deleteModule: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/modules/${id}`);
  },
  reorderModules: async (courseId: number, moduleOrders: { id: number; sequence: number }[]): Promise<void> => {
    await apiClient.post('/lms/modules/reorder', { courseId, moduleOrders });
  },

  // Batches
  getBatches: async (filters?: { courseId?: number; status?: string; search?: string }): Promise<LmsBatch[]> => {
    const res = await apiClient.get('/lms/batches', { params: filters });
    return res.data.data;
  },
  createBatch: async (data: any): Promise<LmsBatch> => {
    const res = await apiClient.post('/lms/batches', data);
    return res.data.data;
  },
  updateBatch: async (id: number, data: any): Promise<LmsBatch> => {
    const res = await apiClient.put(`/lms/batches/${id}`, data);
    return res.data.data;
  },
  deleteBatch: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/batches/${id}`);
  },

  // Enrollments
  getEnrollments: async (filters?: {
    employeeId?: number;
    courseId?: number;
    batchId?: number;
    status?: string;
    search?: string;
  }): Promise<LmsEnrollment[]> => {
    const res = await apiClient.get('/lms/enrollments', { params: filters });
    return res.data.data;
  },
  getMyEnrollments: async (employeeId?: number): Promise<LmsEnrollment[]> => {
    const res = await apiClient.get('/lms/enrollments/my', { params: { employeeId } });
    return res.data.data;
  },
  getTeamEnrollments: async (employeeIds?: number[]): Promise<LmsEnrollment[]> => {
    const res = await apiClient.get('/lms/enrollments/team', {
      params: { employeeIds: employeeIds?.join(',') },
    });
    return res.data.data;
  },
  createEnrollment: async (data: {
    employeeId: number;
    courseId: number;
    batchId?: number | null;
    enrolledBy?: string;
  }): Promise<LmsEnrollment> => {
    const res = await apiClient.post('/lms/enrollments', data);
    return res.data.data;
  },
  bulkEnroll: async (data: {
    courseId: number;
    batchId?: number | null;
    employeeIds: number[];
    enrolledBy?: 'admin' | 'manager';
  }): Promise<LmsEnrollment[]> => {
    const res = await apiClient.post('/lms/enrollments/bulk', data);
    return res.data.data;
  },
  updateProgress: async (
    enrollmentId: number,
    data: { progressPct?: number; completedModuleId?: number; status?: string }
  ): Promise<LmsEnrollment> => {
    const res = await apiClient.put(`/lms/enrollments/${enrollmentId}/progress`, data);
    return res.data.data;
  },
  dropEnrollment: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/enrollments/${id}`);
  },

  // Assessments
  getAssessment: async (courseId: number): Promise<LmsAssessment> => {
    const res = await apiClient.get(`/lms/courses/${courseId}/assessment`);
    return res.data.data;
  },
  getAdminAssessment: async (courseId: number): Promise<LmsAssessment> => {
    const res = await apiClient.get(`/lms/courses/${courseId}/assessment/admin`);
    return res.data.data;
  },
  createAssessment: async (data: any): Promise<LmsAssessment> => {
    const res = await apiClient.post('/lms/assessments', data);
    return res.data.data;
  },
  updateAssessment: async (id: number, data: any): Promise<LmsAssessment> => {
    const res = await apiClient.put(`/lms/assessments/${id}`, data);
    return res.data.data;
  },
  getAttempts: async (assessmentId: number, employeeId?: number): Promise<LmsAssessmentAttempt[]> => {
    const res = await apiClient.get(`/lms/assessments/${assessmentId}/attempts`, { params: { employeeId } });
    return res.data.data;
  },
  submitAssessment: async (data: {
    assessmentId: number;
    enrollmentId?: number | null;
    answers: Record<string, number>;
    employeeId?: number;
  }): Promise<any> => {
    const res = await apiClient.post('/lms/assessments/submit', data);
    return res.data.data;
  },

  // Certificates
  getCertificates: async (filters?: { employeeId?: number; courseId?: number }): Promise<LmsCertificate[]> => {
    const res = await apiClient.get('/lms/certificates', { params: filters });
    return res.data.data;
  },
  getMyCertificates: async (employeeId?: number): Promise<LmsCertificate[]> => {
    const res = await apiClient.get('/lms/certificates/my', { params: { employeeId } });
    return res.data.data;
  },
  getCertificateById: async (id: number): Promise<LmsCertificate> => {
    const res = await apiClient.get(`/lms/certificates/${id}`);
    return res.data.data;
  },

  // Compliance
  getComplianceRules: async (): Promise<LmsCompliance[]> => {
    const res = await apiClient.get('/lms/compliance');
    return res.data.data;
  },
  createComplianceRule: async (data: any): Promise<LmsCompliance> => {
    const res = await apiClient.post('/lms/compliance', data);
    return res.data.data;
  },
  updateComplianceRule: async (id: number, data: any): Promise<LmsCompliance> => {
    const res = await apiClient.put(`/lms/compliance/${id}`, data);
    return res.data.data;
  },
  deleteComplianceRule: async (id: number): Promise<void> => {
    await apiClient.delete(`/lms/compliance/${id}`);
  },
};
