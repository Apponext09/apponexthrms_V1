import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  const earningsList = propEarnings && propEarnings.length > 0
    ? propEarnings
        .filter(e => Number(e.actual_value || e.amount || 0) > 0)
        .map((e, idx) => ({ id: e.id || idx + 1, name: e.component_name || e.name || 'Allowance', amount: Number(e.actual_value || e.amount || 0) }))
    : [];

  const deductionsList = propDeductions && propDeductions.length > 0
    ? propDeductions
        .filter(d => Number(d.actual_value || d.amount || 0) !== 0)
        .map((d, idx) => ({ id: d.id || idx + 100, name: d.component_name || d.name || 'Deduction', amount: Number(d.actual_value || d.amount || 0) }))
    : [];

  const calcTotalEarnings = propTotalEarnings ?? earningsList.reduce((acc, curr) => acc + curr.amount, 0);
  const calcTotalDeductions = propTotalDeductions ?? deductionsList.reduce((acc, curr) => acc + curr.amount, 0);
  const calcNetSalary = propNetSalary ?? (calcTotalEarnings - calcTotalDeductions);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Earnings Card */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Earnings & Allowances
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
              ₹{calcTotalEarnings.toLocaleString('en-IN')}
            </Badge>
          </CardHeader>

          <CardContent className="p-3.5 space-y-2">
            {earningsList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/20 border border-border/60"
              >
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="font-bold text-emerald-600">
                  ₹{item.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}

            <div className="border-t border-border/60 pt-2.5 mt-2 flex justify-between font-bold text-xs text-foreground">
              <span>Gross Total Earnings</span>
              <span className="text-emerald-600 font-black">₹{calcTotalEarnings.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Card */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-600" /> Statutory & Other Deductions
            </CardTitle>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">
              −₹{calcTotalDeductions.toLocaleString('en-IN')}
            </Badge>
          </CardHeader>

          <CardContent className="p-3.5 space-y-2">
            {deductionsList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/20 border border-border/60"
              >
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="font-bold text-rose-600">
                  −₹{Math.abs(item.amount).toLocaleString('en-IN')}
                </span>
              </div>
            ))}

            <div className="border-t border-border/60 pt-2.5 mt-2 flex justify-between font-bold text-xs text-foreground">
              <span>Total Statutory Deductions</span>
              <span className="text-rose-600 font-black">−₹{calcTotalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Take-Home Pay Banner */}
      <div className="bg-primary/10 border border-primary/20 text-foreground rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
        <div>
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Net Monthly Take-Home Pay</div>
          <div className="text-xs text-muted-foreground mt-0.5">Calculated after statutory deductions & active component inclusions</div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div className="text-xl font-black text-foreground">
            ₹{calcNetSalary.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};
