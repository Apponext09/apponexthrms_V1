import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export interface AdminDashboardData {
  companyInfo: {
    id: number | null;
    name: string;
    code?: string;
    isParent: boolean;
    location?: string;
    status?: string;
  };
  kpis: {
    totalHeadcount: number;
    activeDepartments: number;
    officeLocations: number;
    reportingOfficers: number;
    openJobs: number;
    monthlyPayrollCost: number;
    pendingApprovals: number;
    newHires: number;
    onLeaveToday: number;
  };
  growthTrend: Array<{
    month: string;
    employees: number;
  }>;
  departmentBreakdown: Array<{
    id: number;
    name: string;
    count: number;
    percentage: number;
  }>;
  recentEmployees: Array<{
    id: number;
    firstName: string;
    lastName: string;
    employeeCode: string;
    status: string;
    avatarUrl?: string;
    departmentName?: string;
  }>;
}

export function useAdminDashboard() {
  const { selectedCompanyId } = useCompanyStore();

  return useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard-stats', selectedCompanyId],
    queryFn: async () => {
      // Send the current React state explicitly. This avoids relying solely on the
      // persisted-store interceptor during an immediate company switch.
      const response = await apiClient.get('/dashboard/admin/stats', {
        headers: selectedCompanyId ? { 'X-Company-Id': String(selectedCompanyId) } : undefined,
      });
      return response.data?.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
