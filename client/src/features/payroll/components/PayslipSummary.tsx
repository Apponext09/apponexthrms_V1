import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PayslipSummaryProps {
  payslipNumber: string;
  month: string;
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  onView?: () => void;
  onDownload?: () => void;
}

export const PayslipSummary: React.FC<PayslipSummaryProps> = ({
  payslipNumber,
  month,
  basicSalary,
  grossSalary,
  totalDeductions,
  netSalary,
  onView,
  onDownload
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{payslipNumber}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{month}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Basic Salary</span>
            <span className="font-medium">₹{basicSalary.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Gross Salary</span>
            <span className="font-medium">₹{grossSalary.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Deductions</span>
            <span className="font-medium text-red-600">-₹{totalDeductions.toFixed(2)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Net Salary</span>
            <span className="text-green-600">₹{netSalary.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              View
            </Button>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

