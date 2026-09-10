import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface PayrollGeneratePayload {
  payrollCycleId: number;
  runType?: string;
  companyId?: number;
  locationId?: number;
  departmentId?: number;
  salaryStructureId?: number;
  employeeStatus?: string;
  month?: string;
  employeeIds?: number[];
}

export const usePayroll = () => {
  const queryClient = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  // Queries
  const cyclesQuery = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/cycles');
      return res.data?.data || res.data || [];
    }
  });

  const locationsQuery = useQuery({
    queryKey: ['payroll-locations'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/locations');
      return res.data?.data || res.data || [];
    }
  });

  const departmentsQuery = useQuery({
    queryKey: ['payroll-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/departments');
      return res.data?.data || res.data || [];
    }
  });

  const structuresQuery = useQuery({
    queryKey: ['payroll-salary-structures'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/salary-structure');
      return res.data?.data || res.data || [];
    }
  });

  const employeesQuery = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/employees');
        return res.data?.data || res.data || [];
      } catch (err) {
        console.error('Failed to fetch Core HR employees for payroll:', err);
        return [];
      }
    }
  });

  const payrollQuery = useQuery({
    queryKey: ['payrolls', selectedCycleId],
    queryFn: async () => {
      const res = await apiClient.get('/payroll', {
        params: selectedCycleId ? { cycleId: selectedCycleId } : {}
      });
      return res.data?.data || res.data || [];
    }
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ['payroll-approvals'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/approvals');
      return res.data?.data || res.data || [];
    }
  });

  // Mutations
  const generatePayrollMutation = useMutation({
    mutationFn: (data: PayrollGeneratePayload) =>
      apiClient.post('/payroll', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const processPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const lockPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const unlockPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/unlock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const approvePayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const publishPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  return {
    payrolls: payrollQuery.data || [],
    isLoading: payrollQuery.isLoading,
    error: payrollQuery.error,
    pendingApprovals: pendingApprovalsQuery.data || [],
    cycles: cyclesQuery.data || [],
    locations: locationsQuery.data || [],
    departments: departmentsQuery.data || [],
    structures: structuresQuery.data || [],
    employees: employeesQuery.data || [],
    selectedCycleId,
    setSelectedCycleId,
    generatePayroll: generatePayrollMutation.mutateAsync,
    isGenerating: generatePayrollMutation.isPending,
    processPayroll: processPayrollMutation.mutate,
    lockPayroll: lockPayrollMutation.mutate,
    unlockPayroll: unlockPayrollMutation.mutate,
    approvePayroll: approvePayrollMutation.mutate,
    publishPayroll: publishPayrollMutation.mutate
  };
};
