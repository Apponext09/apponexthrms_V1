import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useApplications = (filters?: any) => {
  return useQuery({
    queryKey: ['applications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.jobId) params.append('jobId', filters.jobId);

      const response = await api.get(`/recruitment/applications?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/applications', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export const useMoveApplicationStage = (applicationId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.patch(
        `/recruitment/applications/${applicationId}/move-stage`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export const useApplicationStageHistory = (applicationId: number) => {
  return useQuery({
    queryKey: ['application-history', applicationId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/applications/${applicationId}/history`);
      return response.data.data;
    },
    enabled: !!applicationId,
  });
};

