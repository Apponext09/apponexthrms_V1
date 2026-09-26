import { apiClient } from '@/config/api';

export interface EmployeeLifecycleSummary {
  id: number;
  uuid: string;
  employeeCode: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  lifecycleStatus: 'candidate' | 'onboarding' | 'probation' | 'active' | 'notice' | 'exit' | 'alumni';
  joiningDate: string;
  companyId?: number | null;
  companyName?: string;
  departmentId?: number | null;
  departmentName: string;
  designationId?: number | null;
  designationName: string;
  reportingManagerId?: number | null;
  reportingManager: string;
  reportingManagerName?: string;
  currentLocationId?: number | null;
  locationName: string;
  transfersCount: number;
  lastTransferDate?: string | null;
  transferReason?: string | null;
  transferType?: string | null;
  onboarding: {
    interviewerName: string;
    onboardedByName: string;
    interviewDate?: string | null;
    interviewRating?: string | null;
    probationEndDate?: string | null;
    orientationCompleted: boolean;
    documentsVerified?: boolean;
    welcomeKitIssued?: boolean;
    notes?: string;
  };
  offboarding: {
    exitType?: string | null;
    resignationDate?: string | null;
    relievingDate?: string | null;
    lastWorkingDay?: string | null;
    noticePeriodDays?: number | null;
    exitReason?: string | null;
    exitInterviewerName?: string | null;
    assetsReturned?: boolean | null;
    fnfStatus: string;
  };
}

export interface EmployeeLifecycleDetails {
  profile: EmployeeLifecycleSummary;
  onboarding: {
    id?: number;
    uuid?: string;
    interviewerName: string;
    interviewerId?: number | null;
    onboardedByName: string;
    onboardedById?: number | null;
    interviewDate?: string | null;
    interviewRating?: string | null;
    interviewNotes?: string | null;
    joiningDate?: string | null;
    probationEndDate?: string | null;
    orientationCompleted: boolean;
    documentsVerified: boolean;
    welcomeKitIssued: boolean;
    notes?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  offboarding?: {
    id?: number;
    uuid?: string;
    organizationId?: number | null;
    companyId?: number | null;
    employeeId?: number | null;
    exitType: string;
    resignationDate?: string | null;
    noticePeriodDays: number;
    relievingDate?: string | null;
    lastWorkingDay?: string | null;
    exitInterviewerName?: string | null;
    exitInterviewerId?: number | null;
    exitReason?: string | null;
    exitNotes?: string | null;
    assetsReturned: boolean;
    fnfStatus: string;
    createdBy?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  transfers: Array<{
    id: number;
    uuid: string;
    organizationId?: number | null;
    companyId?: number | null;
    employeeId?: number | null;
    fromDepartmentId?: number | null;
    toDepartmentId?: number | null;
    fromDesignationId?: number | null;
    toDesignationId?: number | null;
    fromLocationId?: number | null;
    toLocationId?: number | null;
    fromReportingManagerId?: number | null;
    toReportingManagerId?: number | null;
    effectiveDate: string;
    transferType: string;
    transferReason: string;
    notes: string;
    fromDepartmentName: string;
    toDepartmentName: string;
    fromDesignationName: string;
    toDesignationName: string;
    fromLocationName: string;
    toLocationName: string;
    fromManagerName: string;
    toManagerName: string;
    createdBy: string;
    createdAt: string;
  }>;
  lifecycleEvents: Array<{
    id: number;
    fromStatus: string;
    toStatus: string;
    transitionDate: string;
    notes: string;
  }>;
  chronologicalMilestones?: Array<ChronologicalMilestoneEvent>;
}

export interface ChronologicalMilestoneEvent {
  id: string;
  eventType: string;
  category: 'joining' | 'transfer' | 'offboarding' | 'status_change';
  title: string;
  subtitle?: string;
  date: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  iconType: string;
  metadata?: Record<string, any>;
}

export const lifecycleApi = {
  getSummaries: async (params?: {
    search?: string;
    stage?: string;
    departmentId?: number;
    companyId?: number | string;
    page?: number;
    pageSize?: number;
  }) => {
    const res = await apiClient.get('/hr/lifecycle/employees', { params });
    // Return both data and metadata for pagination
    return {
      data: (res.data?.data || []) as EmployeeLifecycleSummary[],
      total: res.data?.total || 0,
      page: res.data?.page || 1,
      pageSize: res.data?.pageSize || 25,
    };
  },

  getDetails: async (employeeId: number) => {
    const res = await apiClient.get(`/hr/lifecycle/employees/${employeeId}`);
    return res.data?.data as EmployeeLifecycleDetails;
  },

  transferEmployee: async (payload: {
    employeeId: number;
    toDepartmentId?: number;
    toDesignationId?: number;
    toLocationId?: number;
    toReportingManagerId?: number;
    effectiveDate: string;
    transferType: string;
    transferReason?: string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/hr/lifecycle/transfers', payload);
    return res.data;
  },

  saveOnboarding: async (employeeId: number, payload: any) => {
    const res = await apiClient.post(`/hr/lifecycle/onboarding/${employeeId}`, payload);
    return res.data;
  },

  saveOffboarding: async (employeeId: number, payload: any) => {
    const res = await apiClient.post(`/hr/lifecycle/offboarding/${employeeId}`, payload);
    return res.data;
  },

  getPendingResignations: async () => {
    const res = await apiClient.get('/hr/lifecycle/resignations/pending');
    return res.data?.data || [];
  },

  reviewResignation: async (id: number, decision: 'approved' | 'rejected', reviewComment = '') => {
    const res = await apiClient.post(`/hr/lifecycle/resignations/${id}/review`, { decision, reviewComment });
    return res.data?.data;
  },

  getManagers: async (companyId?: number | string) => {
    const res = await apiClient.get('/hr/lifecycle/managers', { params: { companyId } });
    return (res.data?.data || []) as Array<{ id: number; name: string; designation?: string; department?: string }>;
  },
};
