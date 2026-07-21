import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';

export const useLoan = (employeeId?: number) => {
  const createLoanMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/loans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    }
  });

  const loansQuery = useQuery({
    queryKey: ['loans', employeeId],
    queryFn: () =>
      apiClient.get('/payroll/loans', {
        params: { employeeId }
      }),
    enabled: !!employeeId
  });

  const activeLoansQuery = useQuery({
    queryKey: ['active-loans', employeeId],
    queryFn: () =>
      apiClient.get('/payroll/loans/active', {
        params: { employeeId }
      }),
    enabled: !!employeeId
  });

  const getEmiSchedule = async (loanId: number) => {
    const response = await apiClient.get('/payroll/loans/:id/schedule'.replace(':id', loanId.toString()));
    return response.data;
  };

  const getNextEmi = async (loanId: number) => {
    const response = await apiClient.get('/payroll/loans/:id/next-emi'.replace(':id', loanId.toString()));
    return response.data;
  };

  return {
    loans: loansQuery.data?.data || [],
    activeLoans: activeLoansQuery.data?.data || [],
    isLoading: loansQuery.isLoading || activeLoansQuery.isLoading,
    createLoan: createLoanMutation.mutate,
    getEmiSchedule,
    getNextEmi,
    refetch: loansQuery.refetch
  };
};

