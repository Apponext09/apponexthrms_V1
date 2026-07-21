import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type {  Asset, AssetAllocationCreate, AssetAllocationReturn  } from '@/types';

/**
 * Hook to fetch employee assets
 */
export function useEmployeeAssets(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-assets', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/assets/allocations/employee/${employeeId}`
      );
      return response.data;
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

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (data: AssetAllocationCreate) => {
      const response = await apiClient.post('/assets/allocations', data);
      return response.data;
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
        `/assets/allocations/${input.allocationId}/return`,
        input.data
      );
      return response.data;
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


