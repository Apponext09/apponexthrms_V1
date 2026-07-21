import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export const usePayrollDashboard = () => {
  const payrollsQuery = useQuery({
    queryKey: ['payrolls-dashboard'],
    queryFn: () => apiClient.get('/payroll')
  });

  const pendingApprovalsQuery = useQuery({
    queryKey: ['payroll-approvals'],
    queryFn: () => apiClient.get('/payroll/approvals')
  });

  // Safely handle response data format
  const payrolls = Array.isArray(payrollsQuery.data?.data)
    ? payrollsQuery.data.data
    : (payrollsQuery.data?.data?.data && Array.isArray(payrollsQuery.data.data.data)
        ? payrollsQuery.data.data.data
        : []);

  const pendingApprovals = Array.isArray(pendingApprovalsQuery.data?.data)
    ? pendingApprovalsQuery.data.data
    : (pendingApprovalsQuery.data?.data?.data && Array.isArray(pendingApprovalsQuery.data.data.data)
        ? pendingApprovalsQuery.data.data.data
        : []);

  const calculateStats = () => {
    return {
      totalRuns: payrolls.length,
      pendingApprovals: pendingApprovals.length,
      processedThisMonth: payrolls.filter((p: any) => p.status === 'published').length,
      averageProcessingTime: 0 // TODO: Calculate
    };
  };

  return {
    payrolls,
    pendingApprovals,
    stats: calculateStats(),
    isLoading: payrollsQuery.isLoading || pendingApprovalsQuery.isLoading,
    error: payrollsQuery.error || pendingApprovalsQuery.error
  };
};

