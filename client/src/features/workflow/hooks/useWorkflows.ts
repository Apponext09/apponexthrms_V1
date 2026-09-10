import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';

interface WorkflowListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}

export function useWorkflows(options: WorkflowListOptions) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflows', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());
      if (options.search) params.append('search', options.search);
      if (options.type) params.append('type', options.type);
      if (options.status) params.append('status', options.status);

      const res = await api.get(`/workflows?${params.toString()}`);
      return res.data;
    },
  });

  const createWorkflow = useMutation({
    mutationFn: (input: any) => api.post('/workflows', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: ({ id, input }: { id: number; input: any }) =>
      api.patch(`/workflows/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const publishWorkflow = useMutation({
    mutationFn: (id: number) => api.post(`/workflows/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: (id: number) => api.delete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const cloneWorkflow = useMutation({
    mutationFn: ({ id, newName, newCode }: { id: number; newName: string; newCode: string }) =>
      api.post(`/workflows/${id}/clone`, { newName, newCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const fetchWorkflow = async (id: number) => {
    const res = await api.get(`/workflows/${id}`);
    return res.data.data;
  };

  const saveWorkflow = async (id: number, input: any) => {
    if (id === 0) {
      const res = await api.post('/workflows', input);
      return res.data.data;
    } else {
      const res = await api.patch(`/workflows/${id}`, input);
      return res.data.data;
    }
  };

  return {
    data,
    isLoading,
    error,
    createWorkflow,
    updateWorkflow,
    publishWorkflow,
    deleteWorkflow,
    cloneWorkflow,
    fetchWorkflow,
    saveWorkflow,
  };
}

