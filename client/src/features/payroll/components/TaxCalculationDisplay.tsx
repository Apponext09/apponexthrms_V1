import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaxCalculationDisplayProps {
  grossSalaryYtd: number;
  standardDeduction: number;
  investmentsClaimed: number;
  taxableIncome: number;
  totalTaxCalculated: number;
  taxDeducted: number;
}

export const TaxCalculationDisplay: React.FC<TaxCalculationDisplayProps> = ({
  grossSalaryYtd,
  standardDeduction,
  investmentsClaimed,
  taxableIncome,
  totalTaxCalculated,
  taxDeducted
}) => {
  const taxPayable = totalTaxCalculated - taxDeducted;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Calculation Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Income Section */}
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Income</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Gross Salary (YTD)</span>
                <span>₹{grossSalaryYtd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Deduction</span>
                <span>-₹{standardDeduction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Section 80C Investments</span>
                <span>-₹{investmentsClaimed.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tax Section */}
          <div className="bg-red-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Tax Calculation</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-bold">
                <span>Taxable Income</span>
                <span>₹{taxableIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Tax Calculated</span>
                <span>₹{totalTaxCalculated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Already Deducted</span>
                <span>-₹{taxDeducted.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Tax {taxPayable >= 0 ? 'Payable' : 'Refund'}</span>
                <span className={taxPayable >= 0 ? 'text-red-600' : 'text-green-600'}>
                  ₹{Math.abs(taxPayable).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

