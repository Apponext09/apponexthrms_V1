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

  const statsQuery = useQuery({
    queryKey: ['payroll-stats'],
    queryFn: () => apiClient.get('/payroll/stats')
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
      totalEmployees: statsQuery.data?.data?.totalEmployees || 0,
      payrollCost: statsQuery.data?.data?.payrollCost || 0,
      pfContribution: statsQuery.data?.data?.pfContribution || 0,
      taxDeducted: statsQuery.data?.data?.taxDeducted || 0,
      esiContribution: statsQuery.data?.data?.esiContribution || 0,
      totalDeductions: statsQuery.data?.data?.totalDeductions || 0,
      totalRuns: payrolls.length,
      pendingApprovals: pendingApprovals.length,
      processedThisMonth: payrolls.filter((p: any) => p.status === 'published').length,
      complianceStatus: statsQuery.data?.data?.complianceStatus || {
        pfFiled: true,
        esiFiled: true,
        taxCertificates: 'Pending',
        attendanceSynced: true
      }
    };
  };

  return {
    payrolls,
    pendingApprovals,
    stats: calculateStats(),
    isLoading: payrollsQuery.isLoading || pendingApprovalsQuery.isLoading || statsQuery.isLoading,
    error: payrollsQuery.error || pendingApprovalsQuery.error || statsQuery.error
  };
};

