import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export const usePayroll = () => {
  const queryClient = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  const generatePayrollMutation = useMutation({
    mutationFn: (data: { payrollCycleId: number; runType?: string }) =>
      apiClient.post('/payroll', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });

  const processPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  const lockPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  const unlockPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/unlock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  const approvePayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  const publishPayrollMutation = useMutation({
    mutationFn: (payrollRunId: number) =>
      apiClient.post(`/payroll/${payrollRunId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  });

  const payrollQuery = useQuery({
    queryKey: ['payrolls', selectedCycleId],
    queryFn: () =>
      apiClient.get('/payroll', {
        params: { cycleId: selectedCycleId }
      }),
    enabled: !!selectedCycleId
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ['payroll-approvals'],
    queryFn: () => apiClient.get('/payroll/approvals')
  });

  return {
    payrolls: payrollQuery.data?.data || [],
    isLoading: payrollQuery.isLoading,
    error: payrollQuery.error,
    pendingApprovals: pendingApprovalsQuery.data?.data || [],
    selectedCycleId,
    setSelectedCycleId,
    generatePayroll: generatePayrollMutation.mutate,
    processPayroll: processPayrollMutation.mutate,
    lockPayroll: lockPayrollMutation.mutate,
    unlockPayroll: unlockPayrollMutation.mutate,
    approvePayroll: approvePayrollMutation.mutate,
    publishPayroll: publishPayrollMutation.mutate
  };
};

