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
    <Card className="border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
      {/* Header Bar */}
      <CardHeader className="p-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-bold">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              {payslipNumber}
            </div>
            <CardTitle className="text-base font-extrabold mt-0.5 text-white flex items-center gap-2">
              {month}
            </CardTitle>
            {empName && (
              <div className="text-xs text-slate-300 font-medium flex items-center gap-1 mt-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>{empName}</span>
                {empCode && <span className="font-mono text-slate-400">({empCode})</span>}
                {department && <span className="text-indigo-300 text-[10px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">{department}</span>}
              </div>
            )}
          </div>
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-xs">
            Paid &amp; Issued
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Attendance Pill */}
        {attendance && (
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-3.5 h-3.5" />
              Attendance Record
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {attendance.daysPresent ?? 26} / {attendance.workingDaysInMonth ?? 26} Days Present
              {(attendance.daysAbsent ?? 0) > 0 && (
                <span className="text-rose-600 ml-1 font-bold">({attendance.daysAbsent} Days Absent · LOP ₹{attendance.lop?.toLocaleString('en-IN')})</span>
              )}
            </span>
          </div>
        )}

        {/* Core Financial Numbers */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              Gross Salary
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              ₹{currentGrossSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Basic: ₹{basicSalary.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
            <div className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Total Deductions
            </div>
            <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              −₹{currentTotalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-rose-500/80 mt-0.5">Statutory &amp; Tax PF/ESI/PT</div>
          </div>
        </div>

        {/* Net Take-Home Salary Callout */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider">Net Take-Home Salary</div>
            <div className="text-xl font-black text-white mt-0.5">
              ₹{currentNetSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
        </div>

        {/* Expandable Itemized Component Breakdown Drawer */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 py-1 border-t border-slate-100 dark:border-slate-800 transition-colors"
          >
            <span>{showDetails ? 'Hide Itemized Breakdown' : 'Show All Earnings & Deductions Breakdown'}</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in text-xs">
              {/* Earnings Breakdown */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
                    <DollarSign className="w-3.5 h-3.5" /> Earnings Components
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">₹{currentGrossSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2.5 space-y-1.5 border">
                  {rawEarnings.map((item, idx) => {
                    const isHidden = !!hiddenCardComponents[item.name];
                    if (!isAdmin && isHidden) return null;

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-xs p-1.5 rounded transition-all ${
                          isHidden
                            ? 'bg-slate-100 text-slate-400 line-through opacity-60'
                            : 'bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => toggleComponentCheckbox(item.name)}
                              className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                              title={isHidden ? 'Click to show on employee payslip' : 'Click to hide from employee payslip'}
                            />
                          )}
                          <span>{item.name}</span>
                        </label>
                        <span className={`font-bold ${isHidden ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.amount < 0 ? `−₹${Math.abs(item.amount).toLocaleString('en-IN')}` : `₹${item.amount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-rose-600 font-extrabold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Statutory Deductions
                  </span>
                  <span className="font-extrabold text-rose-600">−₹{currentTotalDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-rose-50/40 dark:bg-rose-950/20 rounded-xl p-2.5 space-y-1.5 border border-rose-100 dark:border-rose-900/40">
                  {rawDeductions.map((item, idx) => {
                    const isHidden = !!hiddenCardComponents[item.name];
                    if (!isAdmin && isHidden) return null;

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-xs p-1.5 rounded transition-all ${
                          isHidden
                            ? 'bg-rose-100/50 text-rose-300 line-through opacity-60'
                            : 'bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => toggleComponentCheckbox(item.name)}
                              className="w-3.5 h-3.5 rounded text-rose-600 accent-rose-600 cursor-pointer"
                              title={isHidden ? 'Click to show on employee payslip' : 'Click to hide from employee payslip'}
                            />
                          )}
                          <span>{item.name}</span>
                        </label>
                        <span className={`font-bold ${isHidden ? 'text-rose-300' : 'text-rose-600 dark:text-rose-400'}`}>
                          −₹{item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Eye className="w-3.5 h-3.5" /> View Statement
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
