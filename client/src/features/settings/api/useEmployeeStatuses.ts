import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

export interface EmployeeStatus {
  id: number;
  uuid: string;
  organizationId: number;
  name: string;
  isProbationStatus: boolean;
  probationPeriodValue: number | null;
  probationPeriodUnit: string | null;
  notifyOnCompletion: boolean;
  isConfirmationStatus: boolean;
  isResignationStatus: boolean;
  inactiveOnStatusChange: boolean;
  statusColor: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface EmployeeStatusCreate {
  name: string;
  isProbationStatus?: boolean;
  probationPeriodValue?: number | null;
  probationPeriodUnit?: string | null;
  notifyOnCompletion?: boolean;
  isConfirmationStatus?: boolean;
  isResignationStatus?: boolean;
  inactiveOnStatusChange?: boolean;
  statusColor?: string | null;
  status?: 'active' | 'inactive';
}

export const useEmployeeStatuses = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['employeeStatuses'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/settings/employee-statuses');
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeStatusCreate) => {
      const res = await apiClient.post('/settings/employee-statuses', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeStatuses'] });
      toast.success('Employee status created successfully');
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || 'Failed to create employee status';
      toast.error(errMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<EmployeeStatusCreate> }) => {
      const res = await apiClient.patch(`/settings/employee-statuses/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeStatuses'] });
      toast.success('Employee status updated successfully');
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || 'Failed to update employee status';
      toast.error(errMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiClient.delete(`/settings/employee-statuses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeStatuses'] });
      toast.success('Employee status deleted successfully');
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || 'Failed to delete employee status';
      toast.error(errMsg);
    },
  });

  return {
    employeeStatuses: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createEmployeeStatus: createMutation.mutateAsync,
    updateEmployeeStatus: updateMutation.mutateAsync,
    deleteEmployeeStatus: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
