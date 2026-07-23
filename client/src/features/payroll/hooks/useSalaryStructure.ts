import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export const useSalaryStructure = () => {
  const queryClient = useQueryClient();

  const structuresQuery = useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const response = await apiClient.get('/payroll/salary-structure');
      return response.data?.data || [];
    }
  });

  const createStructureMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/salary-structure', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
    }
  });

  return {
    structures: structuresQuery.data || [],
    isLoading: structuresQuery.isLoading,
    createStructure: createStructureMutation.mutateAsync,
    isCreating: createStructureMutation.isPending
  };
};
