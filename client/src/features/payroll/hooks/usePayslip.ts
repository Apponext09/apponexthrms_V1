import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export const usePayslip = (employeeId?: number) => {
  const payslipsQuery = useQuery({
    queryKey: ['payslips', employeeId],
    queryFn: () =>
      apiClient.get('/payroll/payslips', {
        params: { employeeId }
      })
  });

  const payslipDetailsQuery = useQuery({
    queryKey: ['payslip-details'],
    queryFn: () => null,
    enabled: false
  });

  const sendPayslipMutation = useMutation({
    mutationFn: (payslipId: number) =>
      apiClient.post(`/payroll/payslips/${payslipId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    }
  });

  const lockPayslipMutation = useMutation({
    mutationFn: (payslipId: number) =>
      apiClient.post(`/payroll/payslips/${payslipId}/lock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    }
  });

  const getPayslipDetails = async (payslipId: number) => {
    const response = await apiClient.get(`/payroll/payslips/${payslipId}/details`);
    return response.data?.data;
  };

  // Safely handle response data format
  const payslips = Array.isArray(payslipsQuery.data?.data)
    ? payslipsQuery.data.data
    : (payslipsQuery.data?.data?.data && Array.isArray(payslipsQuery.data.data.data)
        ? payslipsQuery.data.data.data
        : []);

  return {
    payslips,
    isLoading: payslipsQuery.isLoading,
    error: payslipsQuery.error,
    sendPayslip: sendPayslipMutation.mutate,
    lockPayslip: lockPayslipMutation.mutate,
    getPayslipDetails,
    refetch: payslipsQuery.refetch
  };
};

