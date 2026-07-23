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
    }
  });

  const submitSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
    }
  });

  const approveSettlementMutation = useMutation({
    mutationFn: ({ settlementId, approverId }: { settlementId: number; approverId: number }) =>
      apiClient.post(`/payroll/settlements/${settlementId}/approve`, { approverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
    }
  });

  const processSettlementMutation = useMutation({
    mutationFn: (settlementId: number) =>
      apiClient.post(`/payroll/settlements/${settlementId}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
    }
  });

  const getSettlementQuery = (settlementId: number) =>
    useQuery({
      queryKey: ['settlement', settlementId],
      queryFn: () => apiClient.get(`/payroll/settlements/${settlementId}`),
      enabled: !!settlementId
    });

  const settlementsQuery = useQuery({
    queryKey: ['settlements'],
    queryFn: () => apiClient.get('/payroll/settlements')
  });

  return {
    settlements: settlementsQuery.data?.data || [],
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

