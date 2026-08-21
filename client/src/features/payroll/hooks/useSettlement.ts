import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export const useSettlement = () => {
  const createSettlementMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/settlements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const calculateSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/calculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const submitSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const approveSettlementMutation = useMutation({
    mutationFn: ({ settlementId, approverId }: { settlementId: number; approverId: number }) =>
      apiClient.post(`/payroll/settlements/${settlementId}/approve`, { approverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  // Admin-only approval action
  const adminApproveSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/admin-approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  // Admin-only reject action
  const adminRejectSettlementMutation = useMutation({
    mutationFn: ({ settlementId, reason }: { settlementId: number; reason?: string }) =>
      apiClient.post(`/payroll/settlements/${settlementId}/admin-reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const processSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  // Exit request mutation (Employee / Manager / Team Lead)
  const submitExitRequestMutation = useMutation({
    mutationFn: (data: { employeeId: number; exitDate: string; reason: string; noticePeriodDays?: number }) =>
      apiClient.post('/payroll/settlements/exit-request', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['exit-requests'] });
    }
  });

  const getSettlementQuery = (settlementId: number) =>
    useQuery({
      queryKey: ['settlement', settlementId],
      queryFn: async () => {
        const res = await apiClient.get(`/payroll/settlements/${settlementId}`);
        return res.data?.data || res.data || null;
      },
      enabled: !!settlementId
    });

  const settlementsQuery = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/settlements');
        const items = res.data?.data || res.data;
        return Array.isArray(items) ? items : [];
      } catch (err) {
        console.error('Failed to fetch settlements:', err);
        return [];
      }
    }
  });

  // Pending exit requests (for HR to see)
  const exitRequestsQuery = useQuery({
    queryKey: ['exit-requests'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/settlements/exit-requests');
        const items = res.data?.data || res.data;
        return Array.isArray(items) ? items : [];
      } catch (err) {
        return [];
      }
    }
  });

  const rawData = settlementsQuery.data;
  const settlementList = Array.isArray(rawData) ? rawData : (Array.isArray((rawData as any)?.data) ? (rawData as any).data : []);

  return {
    settlements: settlementList,
    exitRequests: exitRequestsQuery.data || [],
    createSettlement: createSettlementMutation.mutate,
    calculateSettlement: calculateSettlementMutation.mutate,
    calculateSettlementAsync: calculateSettlementMutation.mutateAsync,
    submitSettlement: submitSettlementMutation.mutate,
    approveSettlement: approveSettlementMutation.mutate,
    adminApproveSettlement: adminApproveSettlementMutation.mutate,
    adminApproveSettlementAsync: adminApproveSettlementMutation.mutateAsync,
    adminRejectSettlement: adminRejectSettlementMutation.mutate,
    adminRejectSettlementAsync: adminRejectSettlementMutation.mutateAsync,
    processSettlement: processSettlementMutation.mutate,
    submitExitRequest: submitExitRequestMutation.mutate,
    submitExitRequestAsync: submitExitRequestMutation.mutateAsync,
    createSettlementAsync: createSettlementMutation.mutateAsync,
    getSettlement: getSettlementQuery,
    refetch: settlementsQuery.refetch,
    isLoading:
      createSettlementMutation.isPending ||
      calculateSettlementMutation.isPending ||
      submitSettlementMutation.isPending ||
      approveSettlementMutation.isPending ||
      adminApproveSettlementMutation.isPending ||
      adminRejectSettlementMutation.isPending ||
      processSettlementMutation.isPending ||
      submitExitRequestMutation.isPending ||
      settlementsQuery.isLoading
  };
};
