import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export interface RecruitmentDashboardFilters {
  departmentId?: string | number;
  jobId?: string | number;
  gradeId?: string | number;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export const useDashboard = (filters?: RecruitmentDashboardFilters) => {
  return useQuery({
    queryKey: ['recruitment-dashboard', filters],
    queryFn: async () => {
      const response = await api.get('/recruitment/dashboard', { params: filters });
      return response.data.data;
    },
    refetchOnMount: 'always',
  });
};

export const useMetrics = (filters?: RecruitmentDashboardFilters) => {
  return useQuery({
    queryKey: ['recruitment-metrics', filters],
    queryFn: async () => {
      const response = await api.get('/recruitment/metrics', { params: filters });
      return response.data.data;
    },
  });
};

