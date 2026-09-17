import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface LinkedMasterRecord {
  id: number;
  recordCode: string;
  label: string;
  data: any;
}

export interface LinkedMaster {
  id: number;
  uuid: string;
  name: string;
  pluralName?: string;
  code: string;
  description?: string;
  icon?: string;
  employeeLinkage: 'primary_assignment' | 'secondary_linkage';
  records: LinkedMasterRecord[];
}

export interface EmployeeMasterValue {
  id: number;
  masterId: number;
  masterName: string;
  masterCode: string;
  employeeLinkage: 'primary_assignment' | 'secondary_linkage';
  recordId?: number | null;
  recordIds?: number[];
  recordLabel?: string | null;
  customValue?: string | null;
}

export function useEmployeeLinkedMasters() {
  return useQuery<LinkedMaster[]>({
    queryKey: ['employee-linked-masters'],
    queryFn: async () => {
      const res = await apiClient.get('/master-builder/employee-linkages');
      return res.data?.data || [];
    },
  });
}

export function useEmployeeMasterValues(employeeId: number | string | undefined) {
  return useQuery<EmployeeMasterValue[]>({
    queryKey: ['employee-master-values', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const res = await apiClient.get(`/master-builder/employee-values/${employeeId}`);
      return res.data?.data || [];
    },
    enabled: !!employeeId,
  });
}

export function useSaveEmployeeMasterValues(employeeId: number | string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignments: Array<{
      masterId: number;
      recordId?: number | null;
      recordIds?: number[] | null;
      customValue?: string | null;
    }>) => {
      if (!employeeId) throw new Error('No employee ID specified');
      const res = await apiClient.post(`/master-builder/employee-values/${employeeId}`, {
        assignments,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-master-values', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
