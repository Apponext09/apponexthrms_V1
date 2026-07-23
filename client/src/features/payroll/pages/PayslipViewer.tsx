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

  const handleDownloadPDF = (payslip: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${payslip.payslip_number}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .meta-grid { display: grid; grid-template-cols: 2fr 1fr; margin-bottom: 30px; }
            .label { color: #666; font-size: 14px; }
            .val { font-weight: bold; font-size: 16px; }
            .net-pay-box { background: #f0f4f8; padding: 15px; border-radius: 5px; text-align: center; margin-top: 40px; border: 1px solid #d0e0f0; }
            .net-pay-amount { font-size: 24px; font-weight: bold; color: #1a56db; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PAYSLIP</div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">${payslip.payslip_number}</div>
          </div>
          
          <div class="meta-grid">
            <div>
              <div class="label">Employee ID</div>
              <div class="val">#${payslip.employee_id}</div>
              <div class="label" style="margin-top: 15px;">Statement For Month</div>
              <div class="val">${new Date(payslip.payslip_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">CTC</div>
              <div class="val">₹${Number(payslip.ctc).toLocaleString('en-IN')}</div>
              <div class="label" style="margin-top: 15px;">Basic Salary</div>
              <div class="val">₹${Number(payslip.basic_salary).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div class="net-pay-box">
            <div class="label" style="font-weight: bold; text-transform: uppercase;">Net Take-Home Salary</div>
            <div class="net-pay-amount">₹${Number(payslip.net_salary).toLocaleString('en-IN')}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            month={new Date(payslip.payslip_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            basicSalary={Number(payslip.basic_salary)}
            grossSalary={Number(payslip.gross_salary)}
            totalDeductions={Number(payslip.total_deductions)}
            netSalary={Number(payslip.net_salary)}
            onView={() => handleViewPayslip(payslip.id)}
            onDownload={() => handleDownloadPDF(payslip)}
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
              totalEarnings={Number(details.payslip.gross_salary)}
              totalDeductions={Number(details.payslip.total_deductions)}
              netSalary={Number(details.payslip.net_salary)}
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleDownloadPDF(details.payslip)}>Print / Download PDF</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayslipViewer;


