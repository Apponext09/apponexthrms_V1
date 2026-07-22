import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { AssetAllocationCreate, AssetAllocationReturn } from '@/types';

/**
 * Hook to fetch employee asset allocations
 */
export function useEmployeeAssets(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-assets', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/assets`);
      return response.data?.data ?? [];
    },
    enabled: employeeId > 0,
  });

  return {
    allocations: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to allocate asset
 */
export function useAllocateAsset() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: AssetAllocationCreate) => {
      const { employeeId, ...body } = data;
      const response = await apiClient.post(`/employees/${employeeId}/assets`, body);
      return response.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-assets', variables.employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  return {
    allocateAsset: mutateAsync,
    isLoading: isPending,
    error: error ? ((error as any).response?.data?.message || 'Failed to allocate asset') : null,
  };
}

/**
 * Hook to return asset
 */
export function useReturnAsset() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (input: { allocationId: number; data: AssetAllocationReturn }) => {
      const response = await apiClient.post(
        `/employees/asset-allocations/${input.allocationId}/return`,
        input.data
      );
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  return {
    returnAsset: mutateAsync,
    isLoading: isPending,
  };
}
