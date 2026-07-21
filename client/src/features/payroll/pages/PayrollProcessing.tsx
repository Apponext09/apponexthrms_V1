import React from 'react';
import { usePayroll } from '../hooks/index';
import { PayrollStatusCard } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PayrollProcessing: React.FC = () => {
  const { payrolls, isLoading, processPayroll, lockPayroll, approvePayroll, publishPayroll } = usePayroll();

  if (isLoading) {
    return <div className="p-4">Loading payroll...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Processing</h1>

      {/* Payroll Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        {payrolls.map((payroll: any) => (
          <div key={payroll.id}>
            <PayrollStatusCard
              cycleMonth={payroll.run_month}
              status={payroll.status}
              totalEmployees={payroll.total_employees}
              processedEmployees={payroll.processed_employees}
              errorCount={payroll.error_count}
            />
            <div className="mt-2 flex gap-2">
              {payroll.status === 'draft' && (
                <Button size="sm" onClick={() => processPayroll(payroll.id)}>
                  Process
                </Button>
              )}
              {payroll.status === 'processing' && (
                <Button size="sm" onClick={() => lockPayroll(payroll.id)}>
                  Lock
                </Button>
              )}
              {payroll.status === 'locked' && (
                <Button size="sm" onClick={() => approvePayroll(payroll.id)}>
                  Approve
                </Button>
              )}
              {payroll.status === 'approved' && (
                <Button size="sm" onClick={() => publishPayroll(payroll.id)}>
                  Publish
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Processing Log */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Processing logs will appear here...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollProcessing;


