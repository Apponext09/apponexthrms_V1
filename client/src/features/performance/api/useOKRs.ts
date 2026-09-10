import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface KeyResult {
  id: number;
  okrId: number;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface OKR {
  id: number;
  employeeId: number;
  departmentId?: number;
  title: string;
  description: string;
  objective: string;
  cycleId: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  owner: number;
  collaborators?: number[];
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  overallProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOKRInput {
  employeeId?: number;
  departmentId?: number;
  title: string;
  objective: string;
  description: string;
  cycleId: number;
  priority: 'high' | 'medium' | 'low';
  owner: number;
  collaborators?: number[];
  startDate: string;
  endDate: string;
  keyResults: Array<{
    title: string;
    targetValue: number;
    unit: string;
    weight: number;
  }>;
}

export interface UpdateOKRInput {
  title?: string;
  description?: string;
  status?: 'draft' | 'active' | 'completed' | 'archived';
  priority?: 'high' | 'medium' | 'low';
  collaborators?: number[];
}

export const useOKRs = (employeeId?: number, cycleId?: number) => {
  const okrsQuery = useQuery({
    queryKey: ['okrs', employeeId, cycleId],
    queryFn: () =>
      apiClient.get('/performance/okrs', {
        params: { employeeId, cycleId }
      }),
    enabled: !!cycleId
  });

  const createOKRMutation = useMutation({
    mutationFn: (data: CreateOKRInput) =>
      apiClient.post('/performance/okrs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    }
  });

  const updateOKRMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateOKRInput) =>
      apiClient.patch(`/performance/okrs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    }
  });

  const deleteOKRMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/performance/okrs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    }
  });

  const updateKeyResultMutation = useMutation({
    mutationFn: ({
      keyResultId,
      currentValue
    }: {
      keyResultId: number;
      currentValue: number;
    }) =>
      apiClient.patch(`/performance/key-results/${keyResultId}`, {
        currentValue
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okrs'] });
    }
  });

  const getOKRDetails = async (okrId: number) => {
    const response = await apiClient.get(`/performance/okrs/${okrId}`);
    return response.data;
  };

  return {
    okrs: okrsQuery.data?.data || [],
    isLoading: okrsQuery.isLoading,
    error: okrsQuery.error,
    createOKR: createOKRMutation.mutate,
    updateOKR: updateOKRMutation.mutate,
    deleteOKR: deleteOKRMutation.mutate,
    updateKeyResult: updateKeyResultMutation.mutate,
    getOKRDetails,
    refetch: okrsQuery.refetch,
    isCreating: createOKRMutation.isPending,
    isUpdating: updateOKRMutation.isPending
  };
};

export const useOKRCycles = () => {
  return useQuery({
    queryKey: ['okr-cycles'],
    queryFn: () => apiClient.get('/performance/okr-cycles')
  });
};

export const useOKRAlignment = (employeeId: number) => {
  return useQuery({
    queryKey: ['okr-alignment', employeeId],
    queryFn: () =>
      apiClient.get(`/performance/okrs/${employeeId}/alignment`),
    enabled: !!employeeId
  });
};

