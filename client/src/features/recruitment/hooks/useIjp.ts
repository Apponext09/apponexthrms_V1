import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export interface InternalJob {
  id: number;
  uuid: string;
  job_code: string;
  job_title: string;
  job_description: string;
  department_id: number | null;
  department_name?: string;
  designation_id: number | null;
  designation_name?: string;
  location_id: number | null;
  location_name?: string;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  min_experience_years: number | null;
  max_experience_years: number | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string;
  employment_type: 'onsite' | 'remote' | 'hybrid';
  no_of_positions: number;
  status: string;
  is_internal: boolean;
  is_published_external: boolean;
  expiry_date?: string | null;
  skills?: string[];
  created_at: string;
}

export interface IjpApplication {
  application_id: number;
  application_uuid: string;
  application_status: string;
  applied_at: string;
  cover_letter: string | null;
  job_id: number;
  job_code: string;
  job_title: string;
  job_type: string;
  experience_level: string;
  employment_type: string;
  job_status: string;
  department_name?: string;
  designation_name?: string;
  location_name?: string;
  manager_approval_status?: 'Pending' | 'Approved' | 'Rejected';
  managerApprovalStatus?: 'Pending' | 'Approved' | 'Rejected';
  manager_comments?: string | null;
  managerComments?: string | null;
  resume_url?: string | null;
  resumeUrl?: string | null;
}

export const useInternalJobs = (filters?: {
  page?: number;
  pageSize?: number;
  search?: string;
  department_id?: number;
  job_type?: string;
  experience_level?: string;
  employment_type?: string;
}) => {
  return useQuery<{
    items: InternalJob[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
      totalPages: number;
    };
  }>({
    queryKey: ['ijp-jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));
      if (filters?.department_id) params.append('department_id', String(filters.department_id));
      if (filters?.job_type) params.append('job_type', filters.job_type);
      if (filters?.experience_level) params.append('experience_level', filters.experience_level);
      if (filters?.employment_type) params.append('employment_type', filters.employment_type);

      const response = await api.get(`/recruitment/ijp/jobs?${params.toString()}`);
      return {
        items: response.data.data || [],
        meta: response.data.meta || { page: 1, pageSize: 20, total: 0, hasMore: false, totalPages: 0 },
      };
    },
  });
};

export const useMyIjpApplications = () => {
  return useQuery<IjpApplication[]>({
    queryKey: ['my-ijp-applications'],
    queryFn: async () => {
      const response = await api.get('/recruitment/ijp/my-applications');
      return response.data.data || [];
    },
  });
};

export interface ApplyInternalJobInput {
  jobId: number;
  coverLetter?: string;
  reasonForMove?: string;
  availability?: string;
  relevantExperienceYears?: number | string;
  currentProjects?: string;
  managerInformed?: boolean;
  resumeFile?: string;
  resumeName?: string;
}

export const useApplyToInternalJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApplyInternalJobInput) => {
      const response = await api.post('/recruitment/ijp/apply', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ijp-applications'] });
      queryClient.invalidateQueries({ queryKey: ['ijp-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['manager-ijp-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['resume-bank'] });
    },
  });
};

export interface ManagerIjpApprovalItem {
  id: number;
  uuid: string;
  applicationId: number;
  applicantId: number;
  approverId: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  details: {
    applicationId: number;
    jobId: number;
    jobTitle: string;
    jobCode: string;
    employeeId: number;
    employeeName: string;
    employeeEmail: string;
    employeeCode?: string;
    reasonForMove?: string;
    availability?: string;
    relevantExperienceYears?: number | string;
    currentProjects?: string;
    statementOfInterest?: string;
    resumeUrl?: string | null;
    managerInformed?: boolean;
    appliedAt: string;
    managerComments?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
  };
}

export const useManagerIjpApprovals = () => {
  return useQuery<ManagerIjpApprovalItem[]>({
    queryKey: ['manager-ijp-approvals'],
    queryFn: async () => {
      const response = await api.get('/recruitment/ijp/manager/approvals');
      return response.data.data || [];
    },
  });
};

export const useApproveIjpApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      const response = await api.post(`/recruitment/ijp/manager/approvals/${id}/approve`, { comments });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-ijp-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['my-ijp-applications'] });
      queryClient.invalidateQueries({ queryKey: ['resume-bank'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
};

export const useRejectIjpApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      const response = await api.post(`/recruitment/ijp/manager/approvals/${id}/reject`, { comments });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-ijp-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['my-ijp-applications'] });
    },
  });
};
