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

  const processSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
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

  const rawData = settlementsQuery.data;
  const settlementList = Array.isArray(rawData) ? rawData : (Array.isArray((rawData as any)?.data) ? (rawData as any).data : []);

  return {
    settlements: settlementList,
    createSettlement: createSettlementMutation.mutate,
    calculateSettlement: calculateSettlementMutation.mutate,
    submitSettlement: submitSettlementMutation.mutate,
    approveSettlement: approveSettlementMutation.mutate,
    processSettlement: processSettlementMutation.mutate,
    getSettlement: getSettlementQuery,
    isLoading:
      createSettlementMutation.isPending ||
      calculateSettlementMutation.isPending ||
      submitSettlementMutation.isPending ||
      approveSettlementMutation.isPending ||
      processSettlementMutation.isPending ||
      settlementsQuery.isLoading
  };
};
