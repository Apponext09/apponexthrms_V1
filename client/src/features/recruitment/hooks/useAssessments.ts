import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useAssessments = (filters?: any) => {
  return useQuery({
    queryKey: ['assessments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);

      const response = await api.get(`/recruitment/assessments?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/assessments', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssignAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/assessments/assign', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useAssessmentAttempts = (applicationId: number) => {
  return useQuery({
    queryKey: ['assessment-attempts', applicationId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/applications/${applicationId}/assessment-attempts`);
      return response.data.data;
    },
    enabled: !!applicationId,
  });
};

