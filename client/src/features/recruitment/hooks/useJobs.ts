import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useJobs = (filters?: any) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await api.get(`/recruitment/jobs?${params.toString()}`);
      return response.data;
    },
  });
};

export const useJob = (id: number) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/jobs/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/jobs', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const usePublishJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: number) => {
      const response = await api.post(`/recruitment/jobs/${jobId}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useCloseJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: number) => {
      const response = await api.post(`/recruitment/jobs/${jobId}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

