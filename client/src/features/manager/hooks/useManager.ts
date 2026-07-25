import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';

export function useManager() {
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch department dashboard metrics
  const dashboardQuery = useQuery({
    queryKey: ['manager-dashboard', user?.departmentName],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/manager/dashboard');
        const data = response.data?.data;
        if (data && typeof data.headcount === 'number') {
          return data;
        }
        return { headcount: 0, pendingHiringRequests: 0, activePIPs: 0, budgetUtilization: 0 };
      } catch {
        return { headcount: 0, pendingHiringRequests: 0, activePIPs: 0, budgetUtilization: 0 };
      }
    },
  });

  // 2. Fetch department employees dynamically from backend API
  const employeesQuery = useQuery({
    queryKey: ['manager-employees', user?.departmentName],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/manager/employees');
        const list = response.data?.data || response.data;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((emp: any) => {
            const desig = (emp.designation?.name || emp.designation_name || emp.designation || emp.job_title || '').toLowerCase();
            const isLead = desig.includes('lead') || desig.includes('supervisor');
            return {
              id: emp.id,
              firstName: emp.first_name || emp.firstName || '',
              lastName: emp.last_name || emp.lastName || '',
              code: emp.employee_code || emp.code || `EMP-${emp.id}`,
              email: emp.email || emp.work_email || emp.official_email || '',
              status: emp.status ? emp.status.toLowerCase() : 'active',
              designation: emp.designation?.name || emp.designation_name || emp.designation || emp.job_title || 'Department Specialist',
              departmentName: emp.department?.name || emp.department_name || emp.departmentName || emp.department || user?.departmentName || 'Department',
              employmentType: emp.employment_type || emp.employmentType || 'Full-time',
              managerName: emp.managerName || emp.reporting_manager_name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Department Head',
              roleTag: emp.roleTag || (isLead ? 'Team Lead' : 'Employee'),
              teamLeadName: emp.teamLeadName || emp.team_lead_name || emp.team_lead || (isLead ? `${emp.first_name || emp.firstName || 'Team'} Lead` : 'Team Lead')
            };
          });
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Recommendation mutation
  const recommendationMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: 'promotion' | 'transfer'; details: string }) => {
      setError(null);
      const response = await apiClient.post('/manager/recommendations', data);
      return response.data;
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit recommendation');
    },
  });

  // 4. Hiring request mutation
  const hiringMutation = useMutation({
    mutationFn: async (data: { designationId: number; justification: string }) => {
      setError(null);
      const response = await apiClient.post('/manager/resource-requests', data);
      return response.data;
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit hiring request');
    },
  });

  const employeesData = employeesQuery.data || [];
  const dashboardData = {
    headcount: dashboardQuery.data?.headcount ?? employeesData.length,
    pendingHiringRequests: dashboardQuery.data?.pendingHiringRequests ?? 0,
    activePIPs: dashboardQuery.data?.activePIPs ?? 0,
    budgetUtilization: dashboardQuery.data?.budgetUtilization ?? 0
  };

  return {
    dashboard: dashboardData,
    isDashboardLoading: dashboardQuery.isLoading,
    employees: employeesData,
    isEmployeesLoading: employeesQuery.isLoading,
    submitRecommendation: recommendationMutation.mutateAsync,
    isSubmittingRecommendation: recommendationMutation.isPending,
    submitHiringRequest: hiringMutation.mutateAsync,
    isSubmittingHiringRequest: hiringMutation.isPending,
    error,
  };
}
