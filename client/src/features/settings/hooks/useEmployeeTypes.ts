import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface EmployeeType {
  id: string | number;
  name: string;
  status: 'active' | 'inactive';
}

export function useEmployeeTypes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employee_types'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/employment-types?limit=1000');
      const responseBody = data.data || data;
      return (responseBody.items || responseBody || []) as EmployeeType[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<EmployeeType>) => {
      const { data } = await apiClient.post('/settings/employment-types', payload);
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_types'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<EmployeeType> }) => {
      const res = await apiClient.patch(`/settings/employment-types/${id}`, data);
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_types'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await apiClient.delete(`/settings/employment-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_types'] });
    },
  });

  return {
    employeeTypes: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createEmployeeType: createMutation.mutateAsync,
    updateEmployeeType: updateMutation.mutateAsync,
    deleteEmployeeType: deleteMutation.mutateAsync,
  };
}
