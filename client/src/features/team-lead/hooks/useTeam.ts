import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export function useTeam() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch team dashboard metrics
  const dashboardQuery = useQuery({
    queryKey: ['team-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/team-lead/dashboard');
      return response.data?.data;
    },
  });

  // 2. Fetch direct reports
  const membersQuery = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const response = await apiClient.get('/team-lead/members');
      return response.data?.data || [];
    },
  });

  // 3. Fetch pending approvals
  const approvalsQuery = useQuery({
    queryKey: ['team-approvals'],
    queryFn: async () => {
      const response = await apiClient.get('/team-lead/approvals');
      return response.data?.data || [];
    },
  });

  // 4. Decide approval mutation
  const decideMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: 'approved' | 'rejected'; comment?: string }) => {
      setError(null);
      const response = await apiClient.post(`/team-lead/approvals/${id}/decide`, { status, comment });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-approvals'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit approval decision');
    },
  });

  return {
    dashboard: dashboardQuery.data || {
      totalTeamMembers: 0,
      activeToday: 0,
      onLeave: 0,
      pendingApprovals: 0,
      teamAttendanceRate: 100,
    },
    isDashboardLoading: dashboardQuery.isLoading,
    members: membersQuery.data || [],
    isMembersLoading: membersQuery.isLoading,
    approvals: approvalsQuery.data || [],
    isApprovalsLoading: approvalsQuery.isLoading,
    decideApproval: decideMutation.mutateAsync,
    isDeciding: decideMutation.isPending,
    error,
  };
}
