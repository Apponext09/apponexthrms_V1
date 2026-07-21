import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Component {
  id: number;
  component_name: string;
  actual_value: number;
  component_type: 'earnings' | 'deductions';
}

interface EarningsDeductionsBreakdownProps {
  earnings: Component[];
  deductions: Component[];
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
}

export const EarningsDeductionsBreakdown: React.FC<EarningsDeductionsBreakdownProps> = ({
  earnings,
  deductions,
  totalEarnings,
  totalDeductions,
  netSalary
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Earnings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {earnings.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.component_name}</span>
                <span className="font-medium">₹{item.actual_value.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Earnings</span>
              <span className="text-green-600">₹{totalEarnings.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deductions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deductions.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.component_name}</span>
                <span className="font-medium">₹{item.actual_value.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Deductions</span>
              <span className="text-red-600">₹{totalDeductions.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Salary */}
      <Card className="col-span-2 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Net Salary</span>
            <span className="text-2xl font-bold text-blue-600">₹{netSalary.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

