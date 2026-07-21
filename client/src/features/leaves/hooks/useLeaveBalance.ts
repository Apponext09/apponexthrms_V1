import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  availableBalance: number;
  consumedBalance: number;
  creditedBalance: number;
  carryForwardBalance: number;
  financialYearStart: string;
}

/**
 * Hook to fetch leave balances
 */
export function useLeaveBalance() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const response = await apiClient.get('/leaves/balances');
      return response.data.data;
    },
  });

  return {
    balances: (data as LeaveBalance[]) || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

/**
 * Helper: Get balance for specific leave type
 */
export function getBalanceForLeaveType(balances: LeaveBalance[], leaveTypeId: number): LeaveBalance | undefined {
  return balances.find((b) => b.leaveTypeId === leaveTypeId);
}

/**
 * Helper: Check if balance is available
 */
export function hasAvailableBalance(balances: LeaveBalance[], leaveTypeId: number, daysNeeded: number): boolean {
  const balance = getBalanceForLeaveType(balances, leaveTypeId);
  return balance ? balance.availableBalance >= daysNeeded : false;
}

