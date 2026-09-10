import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

interface LeaveBalance {
  id: number | null;
  employee_id: number;
  leave_type_id: number;
  available_balance: number;
  used_balance?: number;
  opening_balance?: number;
  pending_balance?: number;
  financial_year_start?: string;
  
  // Extra fields returned by backend
  allocated_balance?: number;
  consumed_balance?: number;
  pending_approval_balance?: number;
  leave_name?: string;
  leave_code?: string;
  description?: string;
  paid_type?: string;
  allow_negative_balance?: boolean;
  negative_balance_action?: string;
  pool_from_leave_type_id?: number | null;
  gender_applicable?: string;
  genderApplicable?: string;
  probation_excluded?: boolean;
  probationExcluded?: boolean;
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
    employee: data?.employee || null,
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
