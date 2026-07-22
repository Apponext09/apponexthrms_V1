import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import type { EmployeeDocument, EmployeeDocumentCreate } from '@/types';

/**
 * Hook to fetch employee documents
 */
export function useEmployeeDocuments(employeeId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${employeeId}/documents`);
      return (response.data?.data ?? []) as EmployeeDocument[];
    },
    enabled: employeeId > 0,
  });

  return {
    documents: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Hook to upload employee document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async (data: EmployeeDocumentCreate) => {
      const { employeeId, ...body } = data;
      const response = await apiClient.post(`/employees/${employeeId}/documents`, body);
      return response.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['employee-documents', variables.employeeId],
      });
    },
  });

  return {
    uploadDocument: mutateAsync,
    isLoading: isPending,
    error: error ? ((error as any).response?.data?.message || 'Failed to upload document') : null,
  };
}

/**
 * Hook to verify employee document
 */
export function useVerifyDocument() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (input: { documentId: number; approved: boolean; reason?: string }) => {
      const response = await apiClient.post(
        `/employees/documents/${input.documentId}/verify`,
        { approved: input.approved, reason: input.reason }
      );
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
    },
  });

  return {
    verifyDocument: mutateAsync,
    isLoading: isPending,
  };
}

/**
 * Hook to delete employee document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (documentId: number) => {
      await apiClient.delete(`/employees/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] });
    },
  });

  return {
    deleteDocument: mutateAsync,
    isLoading: isPending,
  };
}
