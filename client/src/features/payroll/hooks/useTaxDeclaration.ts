import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export const useTaxDeclaration = (employeeId?: number) => {
  const createDeclarationMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/tax-declarations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
    }
  });

  const addInvestmentMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/tax-declarations/:id/investments'.replace(':id', data.declarationId.toString()), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-investments'] });
    }
  });

  const finalizeDeclarationMutation = useMutation({
    mutationFn: (declarationId: number) =>
      apiClient.post(`/payroll/tax-declarations/${declarationId}/finalize`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
    }
  });

  const declarationsQuery = useQuery({
    queryKey: ['tax-declarations', employeeId],
    queryFn: () =>
      apiClient.get('/payroll/tax-declarations', {
        params: { employeeId }
      }),
    enabled: !!employeeId
  });

  const calculateTDS = async (data: { employeeId: number; financialYear: string; grossSalaryYtd: number }) => {
    const response = await apiClient.post('/payroll/tax/calculate-tds', data);
    return response.data;
  };

  return {
    declarations: declarationsQuery.data?.data || [],
    isLoading: declarationsQuery.isLoading,
    createDeclaration: createDeclarationMutation.mutate,
    addInvestment: addInvestmentMutation.mutate,
    finalizeDeclaration: finalizeDeclarationMutation.mutate,
    calculateTDS,
    refetch: declarationsQuery.refetch
  };
};

