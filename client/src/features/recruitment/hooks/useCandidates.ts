import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

export const useCandidates = (filters?: any) => {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page);
      if (filters?.pageSize) params.append('pageSize', filters.pageSize);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.source) params.append('source', filters.source);

      const response = await api.get(`/recruitment/candidates?${params.toString()}`);
      return response.data;
    },
  });
};

export const useCandidate = (id: number) => {
  return useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.post('/recruitment/candidates', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
};

export const useUpdateCandidate = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: any) => {
      const response = await api.patch(`/recruitment/candidates/${candidateId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
    },
  });
};

export const useCandidateNotes = (candidateId: number) => {
  return useQuery({
    queryKey: ['candidate-notes', candidateId],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/notes`);
      return response.data.data;
    },
    enabled: !!candidateId,
  });
};

export const useAddCandidateNote = (candidateId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteText: string) => {
      const response = await api.post(`/recruitment/candidates/${candidateId}/notes`, { noteText });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidateId] });
    },
  });
};

