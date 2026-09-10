import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';
import { useAuthStore } from '@/features/auth/store/authStore';

export const useLoan = (employeeId?: number) => {
  const { user } = useAuthStore();
  const userKey = user?.id || user?.email || 'guest';

  const createLoanMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post('/payroll/loans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['active-loans'] });
    }
  });

  const loansQuery = useQuery({
    queryKey: ['loans', employeeId, userKey],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/loans', {
        params: employeeId ? { employeeId } : undefined
      });
      return res.data?.data || res.data || [];
    },
    refetchOnWindowFocus: true
  });

  const activeLoansQuery = useQuery({
    queryKey: ['active-loans', employeeId, userKey],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/loans/active', {
        params: employeeId ? { employeeId } : undefined
      });
      return res.data?.data || res.data || [];
    },
  });

  const getEmiSchedule = async (loanId: number) => {
    const response = await apiClient.get(`/payroll/loans/${loanId}/schedule`);
    return response.data;
  };

  const getNextEmi = async (loanId: number) => {
    const response = await apiClient.get(`/payroll/loans/${loanId}/next-emi`);
    return response.data;
  };

  return {
    loans: Array.isArray(loansQuery.data) ? loansQuery.data : [],
    activeLoans: Array.isArray(activeLoansQuery.data) ? activeLoansQuery.data : [],
    isLoading: loansQuery.isLoading || activeLoansQuery.isLoading,
    createLoan: createLoanMutation.mutateAsync,
    isCreating: createLoanMutation.isPending,
    getEmiSchedule,
    getNextEmi,
    refetch: () => {
      loansQuery.refetch();
      activeLoansQuery.refetch();
    }
  };
};
