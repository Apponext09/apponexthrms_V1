import React from 'react';
import { usePayroll } from '../hooks/index';
import { PayrollStatusCard } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/config/api';

export const PayrollProcessing: React.FC = () => {
  const { payrolls, isLoading, processPayroll, lockPayroll, approvePayroll, publishPayroll } = usePayroll();

  const handleDownloadBankTransfer = async (id: number) => {
    try {
      const response = await apiClient.get(`/payroll/${id}/bank-transfer`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bank_transfer_run_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download bank transfer sheet:', err);
    }
  };

  const handleDownloadCompliance = async (id: number) => {
    try {
      const response = await apiClient.get(`/payroll/${id}/compliance`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance_run_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download compliance report:', err);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading payroll...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Processing</h1>

      {/* Payroll Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        {payrolls.map((payroll: any) => (
          <div key={payroll.id} className="border p-4 rounded-lg shadow-sm bg-white space-y-4">
            <PayrollStatusCard
              cycleMonth={payroll.run_month}
              status={payroll.status}
              totalEmployees={payroll.total_employees}
              processedEmployees={payroll.processed_employees}
              errorCount={payroll.error_count}
            />
            <div className="flex flex-wrap gap-2 pt-2">
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
              {payroll.status === 'published' && (
                <div className="flex flex-col gap-2 w-full">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadBankTransfer(payroll.id)}>
                    Export Bank Transfer Sheet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadCompliance(payroll.id)}>
                    Export Statutory Compliance
                  </Button>
                </div>
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


