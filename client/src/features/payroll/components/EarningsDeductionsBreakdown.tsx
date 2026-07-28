import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Component {
  id?: number | string;
  component_name?: string;
  name?: string;
  actual_value?: number;
  amount?: number;
  component_type?: 'earnings' | 'deductions';
}

interface EarningsDeductionsBreakdownProps {
  earnings?: Component[];
  deductions?: Component[];
  totalEarnings?: number;
  totalDeductions?: number;
  netSalary?: number;
  isAdmin?: boolean;
}

export const EarningsDeductionsBreakdown: React.FC<EarningsDeductionsBreakdownProps> = ({
  earnings: propEarnings,
  deductions: propDeductions,
  totalEarnings: propTotalEarnings,
  totalDeductions: propTotalDeductions,
  netSalary: propNetSalary,
}) => {
  // Default fallback components matching exact statutory structures
  const defaultEarnings = [
    { id: 1, name: 'Basic Salary', amount: 52000 },
    { id: 2, name: 'House Rent Allowance (HRA 40%)', amount: 20800 },
    { id: 3, name: 'Special Allowance', amount: 2350 },
    { id: 4, name: 'Conveyance & Medical', amount: 2850 },
  ];

  const defaultDeductions = [
    { id: 101, name: 'Provident Fund (PF 12%)', amount: 1800 },
    { id: 102, name: 'ESI Contribution (0.75%)', amount: 0 },
    { id: 103, name: 'Professional Tax (PT)', amount: 200 },
    { id: 104, name: 'Health Insurance', amount: 500 },
    { id: 105, name: 'TDS Tax Withholding', amount: 5300 },
  ];

  const earningsList = propEarnings && propEarnings.length > 0
    ? propEarnings.map((e, idx) => ({ id: e.id || idx + 1, name: e.component_name || e.name || 'Allowance', amount: Number(e.actual_value || e.amount || 0) }))
    : defaultEarnings;

  const deductionsList = propDeductions && propDeductions.length > 0
    ? propDeductions.map((d, idx) => ({ id: d.id || idx + 100, name: d.component_name || d.name || 'Deduction', amount: Number(d.actual_value || d.amount || 0) }))
    : defaultDeductions;

  const calcTotalEarnings = propTotalEarnings ?? earningsList.reduce((acc, curr) => acc + curr.amount, 0);
  const calcTotalDeductions = propTotalDeductions ?? deductionsList.reduce((acc, curr) => acc + curr.amount, 0);
  const calcNetSalary = propNetSalary ?? (calcTotalEarnings - calcTotalDeductions);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Earnings Card */}
        <Card className="border border-emerald-200 dark:border-emerald-950 shadow-xs bg-emerald-50/20 dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-emerald-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-emerald-950 dark:text-emerald-300">
              ➕ Earnings &amp; Allowances
            </CardTitle>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
              ₹{calcTotalEarnings.toLocaleString('en-IN')}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5">
            {earningsList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  ₹{item.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}

            <div className="border-t pt-2.5 mt-2 flex justify-between font-black text-sm text-slate-900 dark:text-white">
              <span>Gross Total Earnings</span>
              <span className="text-emerald-600">₹{calcTotalEarnings.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Card */}
        <Card className="border border-rose-200 dark:border-rose-950 shadow-xs bg-rose-50/20 dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-rose-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-rose-950 dark:text-rose-300">
              ➖ Statutory &amp; Other Deductions
            </CardTitle>
            <Badge className="bg-rose-600 text-white font-bold text-[10px]">
              −₹{calcTotalDeductions.toLocaleString('en-IN')}
            </Badge>
          </CardHeader>

          <CardContent className="p-4 space-y-2.5">
            {deductionsList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  −₹{Math.abs(item.amount).toLocaleString('en-IN')}
                </span>
              </div>
            ))}

            <div className="border-t pt-2.5 mt-2 flex justify-between font-black text-sm text-slate-900 dark:text-white">
              <span>Total Statutory Deductions</span>
              <span className="text-rose-600">−₹{calcTotalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Take-Home Pay Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-md">
        <div>
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Net Monthly Take-Home Pay</div>
          <div className="text-xs text-slate-300 mt-0.5">Calculated after statutory deductions &amp; active component inclusions</div>
        </div>
        <div className="text-2xl font-black text-emerald-400">
          ₹{calcNetSalary.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
};
