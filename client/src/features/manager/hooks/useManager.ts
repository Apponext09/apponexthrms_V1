import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';

export function useManager() {
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch department dashboard metrics dynamically for logged-in organization & department
  const dashboardQuery = useQuery({
    queryKey: ['manager-dashboard', user?.organizationId, user?.departmentName, user?.email],
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

  // 2. Fetch department employees strictly isolated by logged-in tenant organization
  const employeesQuery = useQuery({
    queryKey: ['manager-employees', user?.organizationId, user?.departmentName, user?.email],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/manager/employees');
        let list = response.data?.data || response.data;
        
        // Fallback to org employees if department list is empty
        if (!Array.isArray(list) || list.length === 0) {
          const fallbackRes = await apiClient.get('/employees', { params: { pageSize: 500 } });
          list = fallbackRes.data?.data || fallbackRes.data || [];
        }

        if (Array.isArray(list) && list.length > 0) {
          const currentEmail = (user?.email || '').toLowerCase();
          const currentName = (user?.firstName || '').toLowerCase();

          // Filter out only the manager's own record from subordinate list by email
          const subordinates = list.filter((emp: any) => {
            const email = (emp.email || emp.work_email || '').toLowerCase();
            return !currentEmail || email !== currentEmail;
          });

          const displayList = subordinates.length > 0 ? subordinates : list;

          return displayList.map((emp: any) => {
            const desigName = typeof emp.designation === 'string' ? emp.designation : (emp.designation?.name || emp.designation_name || 'Department Specialist');
            const role = (emp.roleTag || emp.role_code || emp.role || emp.accessRole || '').toLowerCase();
            const isLead = desigName.toLowerCase().includes('lead') || role.includes('lead') || (emp.email || '').toLowerCase().includes('team@');

            return {
              id: emp.id,
              firstName: emp.first_name || emp.firstName || '',
              lastName: emp.last_name || emp.lastName || '',
              code: emp.employee_code || emp.employeeCode || emp.code || `EMP-${emp.id}`,
              email: emp.email || emp.work_email || emp.official_email || '',
              status: emp.status ? emp.status.toLowerCase() : 'active',
              designation: emp.designation || desigName,
              departmentName: emp.departmentName || emp.department?.name || emp.department_name || emp.department || user?.departmentName || 'Department',
              employmentType: emp.employmentType || emp.employment_type || 'Full-time',
              managerName: emp.managerName || `${user?.firstName || 'Department'} ${user?.lastName || 'Manager'}`.trim(),
              roleTag: emp.roleTag || (isLead ? 'Team Lead' : 'Employee'),
              teamLeadName: emp.teamLeadName || (isLead ? `${emp.first_name || emp.firstName || 'Team'} Lead` : 'Team Lead')
            };
          });
        }
      } catch {
        return [];
      }

      return [];
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
