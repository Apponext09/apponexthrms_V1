import React, { useState } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const PayslipViewer: React.FC = () => {
  const { payslips, isLoading, getPayslipDetails } = usePayslip();
  const [details, setDetails] = useState<any>(null);

  const handleViewPayslip = async (payslipId: number) => {
    const payslipDetails = await getPayslipDetails(payslipId);
    setDetails(payslipDetails);
  };

  if (isLoading) {
    return <div className="p-4">Loading payslips...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Payslips</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {payslips.map((payslip: any) => (
          <PayslipSummary
            key={payslip.id}
            payslipNumber={payslip.payslip_number}
            month={payslip.payslip_month}
            basicSalary={payslip.basic_salary}
            grossSalary={payslip.gross_salary}
            totalDeductions={payslip.total_deductions}
            netSalary={payslip.net_salary}
            onView={() => handleViewPayslip(payslip.id)}
            onDownload={() => window.open(`/payslips/${payslip.id}/download`)}
          />
        ))}
      </div>

      {/* Payslip Detail View */}
      {details && (
        <Card>
          <CardHeader>
            <CardTitle>{details.payslip.payslip_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EarningsDeductionsBreakdown
              earnings={details.earnings}
              deductions={details.deductions}
              totalEarnings={details.payslip.gross_salary}
              totalDeductions={details.payslip.total_deductions}
              netSalary={details.payslip.net_salary}
            />

            <div className="flex gap-2">
              <Button variant="outline">Download PDF</Button>
              <Button variant="outline">Share</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayslipViewer;


