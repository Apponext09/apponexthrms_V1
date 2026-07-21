'use client';

import { Card } from '@/components/ui/card';
import { useLeaveBalance } from '../hooks/useLeaveBalance';

const leaveTypeNames: Record<number, string> = {
  1: 'Casual Leave',
  2: 'Sick Leave',
  3: 'Earned Leave',
  4: 'Privilege Leave',
  5: 'Maternity Leave',
  6: 'Paternity Leave',
};

export function LeaveBalancePage() {
  const { balances, isLoading, error } = useLeaveBalance();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Leave Balance</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : balances.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No leave balances found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {balances.map((balance) => {
            const leaveTypeName = leaveTypeNames[balance.leaveTypeId] || `Leave Type ${balance.leaveTypeId}`;
            const percentageUsed = (balance.consumedBalance / (balance.availableBalance + balance.consumedBalance)) * 100 || 0;

            return (
              <Card key={balance.id} className="p-6">
                <h3 className="text-lg font-semibold mb-4">{leaveTypeName}</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Opening Balance</span>
                    <span className="font-semibold">{balance.creditedBalance || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available</span>
                    <span className="font-semibold text-green-600">{balance.availableBalance}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Used</span>
                    <span className="font-semibold text-orange-600">{balance.consumedBalance}</span>
                  </div>

                  {balance.carryForwardBalance > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Carry Forward</span>
                      <span className="font-semibold text-blue-600">{balance.carryForwardBalance}</span>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Usage Progress</span>
                      <span className="text-sm font-medium">{percentageUsed.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Financial Year: {balance.financialYearStart}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

