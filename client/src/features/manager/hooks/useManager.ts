import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export function useManager() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch department dashboard metrics
  const dashboardQuery = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/manager/dashboard');
      return response.data?.data;
    },
  });

  // 2. Fetch department employees
  const employeesQuery = useQuery({
    queryKey: ['manager-employees'],
    queryFn: async () => {
      const response = await apiClient.get('/manager/employees');
      return response.data?.data || [];
    },
  });

  // 3. Recommendation mutation
  const recommendationMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: 'promotion' | 'transfer'; details: string }) => {
      setError(null);
      const response = await apiClient.post('/manager/recommendations', data);
      return response.data;
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit recommendation');
    },
  });

  // 4. Hiring request mutation
  const hiringMutation = useMutation({
    mutationFn: async (data: { designationId: number; justification: string }) => {
      setError(null);
      const response = await apiClient.post('/manager/resource-requests', data);
      return response.data;
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit hiring request');
    },
  });

  return {
    dashboard: dashboardQuery.data || {
      headcount: 0,
      pendingHiringRequests: 0,
      activePIPs: 0,
      budgetUtilization: 0,
    },
    isDashboardLoading: dashboardQuery.isLoading,
    employees: employeesQuery.data || [],
    isEmployeesLoading: employeesQuery.isLoading,
    submitRecommendation: recommendationMutation.mutateAsync,
    isSubmittingRecommendation: recommendationMutation.isPending,
    submitHiringRequest: hiringMutation.mutateAsync,
    isSubmittingHiringRequest: hiringMutation.isPending,
    error,
  };
}
