import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export interface PayslipSummaryProps {
  payslipNumber: string;
  month: string;
  empName?: string;
  empCode?: string;
  department?: string;
  basicSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  earnings?: Array<{ name: string; amount: number }>;
  deductions?: Array<{ name: string; amount: number }>;
  attendance?: {
    workingDaysInMonth?: number;
    daysPresent?: number;
    daysAbsent?: number;
    lop?: number;
  };
  onView?: () => void;
  onDownload?: () => void;
  isAdmin?: boolean;
}

export const PayslipSummary: React.FC<PayslipSummaryProps> = ({
  payslipNumber,
  month,
  empName,
  empCode,
  department,
  basicSalary,
  grossSalary: initialGrossSalary,
  totalDeductions: initialTotalDeductions,
  netSalary: initialNetSalary,
  earnings,
  deductions,
  attendance,
  onView,
  onDownload,
  isAdmin = false
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const compVisibilityKey = `payslip_comp_vis_${payslipNumber || `${empCode || 'emp'}_${month}`}`;

  const [hiddenCardComponents, setHiddenCardComponents] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(compVisibilityKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const toggleComponentCheckbox = (name: string) => {
    setHiddenCardComponents(prev => {
      const isCurrentlyHidden = !!prev[name];
      const updated = { ...prev, [name]: !isCurrentlyHidden };
      try {
        localStorage.setItem(compVisibilityKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Compute fallback earnings if not provided
  const hra = Math.round(basicSalary * 0.40);
  const special = Math.max(0, initialGrossSalary - basicSalary - hra - 2850);
  const rawEarnings = earnings && earnings.length > 0 ? earnings : [
    { name: 'Basic Salary', amount: basicSalary },
    { name: 'House Rent Allowance (HRA 40%)', amount: hra },
    { name: 'Special Allowance', amount: special > 0 ? special : Math.round(basicSalary * 0.20) },
    { name: 'Conveyance & Medical', amount: 2850 }
  ];

  // Compute fallback deductions if not provided
  const pf = Math.round(Math.min(basicSalary, 15000) * 0.12);
  const esi = initialGrossSalary <= 21000 ? Math.round(initialGrossSalary * 0.0075) : 0;
  const pt = initialGrossSalary > 15000 ? 200 : 150;
  const hi = 500;
  const tds = initialTotalDeductions > (pf + esi + pt + hi) ? initialTotalDeductions - (pf + esi + pt + hi) : (initialGrossSalary > 50000 ? Math.round(initialGrossSalary * 0.05) : 0);

  const rawDeductions = deductions && deductions.length > 0 ? deductions : [
    { name: 'Provident Fund (PF 12%)', amount: pf },
    { name: 'ESI Contribution (0.75%)', amount: esi },
    { name: 'Professional Tax (PT)', amount: pt },
    { name: 'Health Insurance', amount: hi },
    ...(tds > 0 ? [{ name: 'TDS Tax Withholding', amount: tds }] : [])
  ];

  const activeEarnings = rawEarnings.filter(item => isAdmin || !hiddenCardComponents[item.name]);
  const activeDeductions = rawDeductions.filter(item => isAdmin || !hiddenCardComponents[item.name]);

  const currentGrossSalary = activeEarnings.reduce((acc, curr) => acc + curr.amount, 0);
  const currentTotalDeductions = activeDeductions.reduce((acc, curr) => acc + curr.amount, 0);
  const currentNetSalary = currentGrossSalary - currentTotalDeductions;

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
      {/* Sleek Header Bar */}
      <CardHeader className="p-3.5 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-mono font-bold">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              {payslipNumber}
              {department && <span className="text-slate-300 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-normal">{department}</span>}
            </div>
            <CardTitle className="text-sm font-extrabold mt-0.5 text-white flex items-center gap-2">
              {month}
              {empName && (
                <span className="text-xs text-slate-300 font-semibold font-sans">
                  · {empName} {empCode && <span className="font-mono text-slate-400">({empCode})</span>}
                </span>
              )}
            </CardTitle>
          </div>
          <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase px-2 py-0.5 shadow-xs">
            Paid
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        {/* Simple 3-Metric Summary Bar */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <div className="text-slate-400 text-[10px] font-semibold uppercase">Gross Pay</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
              ₹{currentGrossSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div className="text-rose-500 text-[10px] font-semibold uppercase">Deductions</div>
            <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              −₹{currentTotalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-md border border-emerald-200 dark:border-emerald-900">
            <div className="text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase">Net Salary</div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{currentNetSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Expandable Breakdown Toggle (Optional) */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 py-0.5 transition-colors"
          >
            <span>{showDetails ? 'Hide Breakdown' : 'Show Component Breakdown'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs animate-fade-in">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-md space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 border-b pb-0.5">Earnings</div>
                  {rawEarnings.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                      <span className="font-bold">₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-md space-y-1">
                  <div className="font-bold text-rose-700 dark:text-rose-400 border-b pb-0.5">Deductions</div>
                  {rawDeductions.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                      <span className="font-bold text-rose-600">−₹{item.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Eye className="w-3.5 h-3.5" /> View Details
            </Button>
          )}
          {onDownload && (
            <Button
              variant="default"
              size="sm"
              onClick={onDownload}
              className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 h-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
