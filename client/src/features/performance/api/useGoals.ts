import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface Goal {
  id: number;
  employeeId: number;
  title: string;
  description: string;
  type: 'strategic' | 'departmental' | 'individual';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  endDate: string;
  targetValue?: number;
  currentValue?: number;
  progressPercentage: number;
  alignedTo?: number; // parent goal ID
  owners?: number[];
  contributors?: number[];
  keyResults?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  employeeId: number;
  title: string;
  description: string;
  type: 'strategic' | 'departmental' | 'individual';
  priority: 'high' | 'medium' | 'low';
  startDate: string;
  endDate: string;
  targetValue?: number;
  alignedTo?: number;
  owners?: number[];
  contributors?: number[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  targetValue?: number;
  currentValue?: number;
  owners?: number[];
  contributors?: number[];
}

export const useGoals = (employeeId?: number, filters?: any) => {
  const goalsQuery = useQuery({
    queryKey: ['goals', employeeId, filters],
    queryFn: () =>
      apiClient.get('/performance/goals', {
        params: { ...(employeeId ? { employeeId } : {}), ...filters }
      }),
  });

  const rawGoals = goalsQuery.data?.data;
  const goalsList: Goal[] = Array.isArray(rawGoals?.data)
    ? rawGoals.data
    : Array.isArray(rawGoals)
    ? rawGoals
    : [];

  const createGoalMutation = useMutation({
    mutationFn: (data: CreateGoalInput) =>
      apiClient.post('/performance/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateGoalInput) =>
      apiClient.patch(`/performance/goals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/performance/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ goalId, currentValue }: { goalId: number; currentValue: number }) =>
      apiClient.patch(`/performance/goals/${goalId}/progress`, { currentValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const getGoalDetails = async (goalId: number) => {
    const response = await apiClient.get(`/performance/goals/${goalId}`);
    return response.data;
  };

  return {
    goals: goalsList,
    isLoading: goalsQuery.isLoading,
    error: goalsQuery.error,
    createGoal: createGoalMutation.mutate,
    updateGoal: updateGoalMutation.mutate,
    deleteGoal: deleteGoalMutation.mutate,
    updateProgress: updateProgressMutation.mutate,
    getGoalDetails,
    refetch: goalsQuery.refetch,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    isDeleting: deleteGoalMutation.isPending
  };
};

export const useGoalAlignment = (employeeId: number) => {
  return useQuery({
    queryKey: ['goal-alignment', employeeId],
    queryFn: () =>
      apiClient.get(`/performance/goals/${employeeId}/alignment`),
    enabled: !!employeeId
  });
};

export const useGoalHistory = (goalId: number) => {
  return useQuery({
    queryKey: ['goal-history', goalId],
    queryFn: () =>
      apiClient.get(`/performance/goals/${goalId}/history`),
    enabled: !!goalId
  });
};

