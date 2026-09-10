import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export interface KPI {
  id: number;
  employeeId?: number;
  departmentId?: number;
  name: string;
  description: string;
  category: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  minValue: number;
  maxValue: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  owner: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface KPIAchievement {
  id: number;
  kpiId: number;
  period: string;
  achievedValue: number;
  percentageAchievement: number;
  status: 'below_target' | 'on_track' | 'exceeded';
  notes?: string;
  createdAt: string;
}

export interface CreateKPIInput {
  employeeId?: number;
  departmentId?: number;
  name: string;
  description: string;
  category: string;
  unit: string;
  targetValue: number;
  minValue: number;
  maxValue: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  owner: number;
}

export interface UpdateKPIInput {
  name?: string;
  description?: string;
  targetValue?: number;
  minValue?: number;
  maxValue?: number;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  status?: 'active' | 'inactive' | 'archived';
}

export const useKPIs = (employeeId?: number, departmentId?: number) => {
  const kpisQuery = useQuery({
    queryKey: ['kpis', employeeId, departmentId],
    queryFn: () =>
      apiClient.get('/performance/kpis', {
        params: { employeeId, departmentId }
      }),
    enabled: !!employeeId || !!departmentId
  });

  const createKPIMutation = useMutation({
    mutationFn: (data: CreateKPIInput) =>
      apiClient.post('/performance/kpis', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });

  const updateKPIMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateKPIInput) =>
      apiClient.patch(`/performance/kpis/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });

  const deleteKPIMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/performance/kpis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });

  const recordAchievementMutation = useMutation({
    mutationFn: ({
      kpiId,
      period,
      achievedValue,
      notes
    }: {
      kpiId: number;
      period: string;
      achievedValue: number;
      notes?: string;
    }) =>
      apiClient.post(`/performance/kpis/${kpiId}/achievements`, {
        period,
        achievedValue,
        notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-achievements'] });
    }
  });

  const getKPIDetails = async (kpiId: number) => {
    const response = await apiClient.get(`/performance/kpis/${kpiId}`);
    return response.data;
  };

  return {
    kpis: kpisQuery.data?.data || [],
    isLoading: kpisQuery.isLoading,
    error: kpisQuery.error,
    createKPI: createKPIMutation.mutate,
    updateKPI: updateKPIMutation.mutate,
    deleteKPI: deleteKPIMutation.mutate,
    recordAchievement: recordAchievementMutation.mutate,
    getKPIDetails,
    refetch: kpisQuery.refetch,
    isCreating: createKPIMutation.isPending,
    isUpdating: updateKPIMutation.isPending
  };
};

export const useKPIAchievements = (kpiId?: number, period?: string) => {
  return useQuery({
    queryKey: ['kpi-achievements', kpiId, period],
    queryFn: () =>
      apiClient.get(`/performance/kpis/${kpiId}/achievements`, {
        params: { period }
      }),
    enabled: !!kpiId
  });
};

export const useKPITrends = (kpiId: number, timeframe: string = '3m') => {
  return useQuery({
    queryKey: ['kpi-trends', kpiId, timeframe],
    queryFn: () =>
      apiClient.get(`/performance/kpis/${kpiId}/trends`, {
        params: { timeframe }
      }),
    enabled: !!kpiId
  });
};

