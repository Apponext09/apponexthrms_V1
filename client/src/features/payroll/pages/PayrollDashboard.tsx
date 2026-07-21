import React from 'react';
import { usePayrollDashboard } from '../hooks/index';
import { PayrollStatusCard } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PayrollDashboard: React.FC = () => {
  const { payrolls, pendingApprovals, stats, isLoading } = usePayrollDashboard();

  if (isLoading) {
    return <div className="p-4">Loading payroll dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payroll Dashboard</h1>
        <Button>Generate New Payroll</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Runs</p>
              <p className="text-3xl font-bold">{stats.totalRuns}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Published This Month</p>
              <p className="text-3xl font-bold text-green-600">{stats.processedThisMonth}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Processing Time</p>
              <p className="text-3xl font-bold">2 hrs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {pendingApprovals.slice(0, 3).map((payroll: any) => (
                <PayrollStatusCard
                  key={payroll.id}
                  cycleMonth={payroll.run_month}
                  status={payroll.status}
                  totalEmployees={payroll.total_employees}
                  processedEmployees={payroll.processed_employees}
                  errorCount={payroll.error_count}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payrolls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {payrolls.slice(0, 4).map((payroll: any) => (
              <PayrollStatusCard
                key={payroll.id}
                cycleMonth={payroll.run_month}
                status={payroll.status}
                totalEmployees={payroll.total_employees}
                processedEmployees={payroll.processed_employees}
                errorCount={payroll.error_count}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDashboard;


