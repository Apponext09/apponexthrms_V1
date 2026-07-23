import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  available_balance: number;
  used_balance: number;
  opening_balance: number;
  pending_balance: number;
  financial_year_start: string;
}

/**
 * Normalize balances — handles paginated or plain array
 */
function normalizeBalances(responseData: any): LeaveBalance[] {
  if (!responseData) return [];
  const inner = responseData.data ?? responseData;
  if (Array.isArray(inner)) return inner;
  if (inner?.items && Array.isArray(inner.items)) return inner.items;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

/**
 * Hook to fetch leave balances
 */
export function useLeaveBalance() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const response = await apiClient.get('/leaves/balances');
      return response.data;
    },
  });

  const balances = normalizeBalances(data);

  return {
    balances,
    isLoading,
    error: error ? (error as any).response?.data?.error?.message ?? (error as Error).message : null,
    refetch,
  };
}

/**
 * Helper: Get balance for specific leave type
 */
export function getBalanceForLeaveType(balances: LeaveBalance[], leaveTypeId: number): LeaveBalance | undefined {
  return balances.find((b) => b.leave_type_id === leaveTypeId);
}

/**
 * Helper: Check if balance is available
 */
export function hasAvailableBalance(balances: LeaveBalance[], leaveTypeId: number, daysNeeded: number): boolean {
  const balance = getBalanceForLeaveType(balances, leaveTypeId);
  return balance ? balance.available_balance >= daysNeeded : false;
}
