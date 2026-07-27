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
  departmentId?: number | null;
  departmentName: string;
  designationId?: number | null;
  designationName: string;
  reportingManagerId?: number | null;
  reportingManager: string;
  currentLocationId?: number | null;
  locationName: string;
  transfersCount: number;
  onboarding: {
    interviewerName: string;
    onboardedByName: string;
    interviewDate?: string | null;
    orientationCompleted: boolean;
  };
  offboarding: {
    exitType?: string | null;
    resignationDate?: string | null;
    relievingDate?: string | null;
    fnfStatus: string;
  };
}

export interface EmployeeLifecycleDetails {
  profile: EmployeeLifecycleSummary;
  onboarding: {
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
  };
  offboarding?: {
    exitType: string;
    resignationDate?: string | null;
    noticePeriodDays: number;
    relievingDate?: string | null;
    lastWorkingDay?: string | null;
    exitInterviewerName?: string | null;
    exitReason?: string | null;
    exitNotes?: string | null;
    assetsReturned: boolean;
    fnfStatus: string;
  } | null;
  transfers: Array<{
    id: number;
    uuid: string;
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
}

export const lifecycleApi = {
  getSummaries: async (params?: { search?: string; stage?: string; departmentId?: number }) => {
    const res = await apiClient.get('/hr/lifecycle/employees', { params });
    return res.data?.data as EmployeeLifecycleSummary[];
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
};
