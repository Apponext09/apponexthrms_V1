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
  attendanceAnalytics?: {
    today: {
      present: number;
      late: number;
      halfDay: number;
      wfh: number;
      onLeave: number;
      absent: number;
      totalHeadcount: number;
      attendanceRate: number;
    };
    weeklyTrend: Array<{
      day: string;
      date: string;
      present: number;
      late: number;
      absent: number;
    }>;
  };
  leaveAnalytics?: {
    byType: Array<{
      leaveTypeId: number;
      name: string;
      code: string;
      color: string;
      approvedCount: number;
      pendingCount: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      applied: number;
      approved: number;
    }>;
  };
  payrollAnalytics?: {
    monthlyTrend: Array<{
      month: string;
      grossSalary: number;
      netSalary: number;
      deductions: number;
    }>;
  };
  recruitmentAnalytics?: {
    pipelineStages: Array<{
      stage: string;
      label: string;
      count: number;
    }>;
    openJobsByDept: Array<{
      departmentName: string;
      openCount: number;
    }>;
  };
  expenseAnalytics?: {
    monthlyTrend: Array<{
      month: string;
      claimedAmount: number;
      approvedAmount: number;
    }>;
    byCategory: Array<{
      categoryName: string;
      totalAmount: number;
    }>;
  };
  workforceAnalytics?: {
    byEmploymentType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    byGender: Array<{ gender: string; count: number }>;
  };
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
