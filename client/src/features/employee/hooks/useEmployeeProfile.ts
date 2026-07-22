import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type {
  EmployeePersonalInfo,
  EmployeeProfessionalInfo,
  EmployeeLifecycleEntry,
} from '@/types';

/**
 * Hook to fetch employee personal info
 */
export function useEmployeePersonalInfo(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-personal-info', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/personal-info`);
      return (response.data?.data ?? null) as EmployeePersonalInfo | null;
    },
    enabled: employeeId > 0,
  });

  return {
    personalInfo: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to update (upsert) employee personal info
 */
export function useUpdatePersonalInfo(employeeId: number) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: Partial<EmployeePersonalInfo>) => {
      const response = await apiClient.put(`/employees/${employeeId}/personal-info`, data);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-personal-info', employeeId] });
    },
  });

  return {
    updatePersonalInfo: mutateAsync,
    isLoading: isPending,
    error: error ? ((error as any).response?.data?.message || 'Failed to save personal info') : null,
  };
}

/**
 * Hook to fetch employee professional info
 */
export function useEmployeeProfessionalInfo(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-professional-info', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/professional-info`);
      return (response.data?.data ?? null) as EmployeeProfessionalInfo | null;
    },
    enabled: employeeId > 0,
  });

  return {
    professionalInfo: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to update (upsert) employee professional info
 */
export function useUpdateProfessionalInfo(employeeId: number) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: Partial<EmployeeProfessionalInfo>) => {
      const response = await apiClient.put(`/employees/${employeeId}/professional-info`, data);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-professional-info', employeeId] });
    },
  });

  return {
    updateProfessionalInfo: mutateAsync,
    isLoading: isPending,
    error: error ? ((error as any).response?.data?.message || 'Failed to save professional info') : null,
  };
}

/**
 * Hook to fetch employee lifecycle history
 */
export function useEmployeeLifecycle(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-lifecycle', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/lifecycle`);
      return (response.data?.data ?? []) as EmployeeLifecycleEntry[];
    },
    enabled: employeeId > 0,
  });

  return {
    history: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to transition employee status
 */
export function useTransitionStatus(employeeId: number) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: { toStatus: string; transitionDate: string; notes?: string }) => {
      const response = await apiClient.post(`/employees/${employeeId}/lifecycle/transition`, data);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return {
    transitionStatus: mutateAsync,
    isLoading: isPending,
    error: error ? ((error as any).response?.data?.message || 'Failed to change status') : null,
  };
}
