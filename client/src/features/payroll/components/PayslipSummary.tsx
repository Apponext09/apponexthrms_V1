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
    } catch { }
    return {};
  });

  const toggleComponentCheckbox = (name: string) => {
    setHiddenCardComponents(prev => {
      const isCurrentlyHidden = !!prev[name];
      const updated = { ...prev, [name]: !isCurrentlyHidden };
      try {
        localStorage.setItem(compVisibilityKey, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // Compute fallback earnings if not provided
  const hra = Math.round(basicSalary * 0.40);
  const special = Math.max(0, initialGrossSalary - basicSalary - hra);
  const rawEarnings = earnings && earnings.length > 0 ? earnings : [
    { name: 'Basic Salary', amount: basicSalary },
    { name: 'House Rent Allowance (HRA 40%)', amount: hra },
    { name: 'Special Allowance', amount: special > 0 ? special : Math.round(basicSalary * 0.20) }
  ];

  // Compute fallback deductions if not provided
  const pf = Math.round(Math.min(basicSalary, 15000) * 0.12);
  const esi = initialGrossSalary <= 21000 ? Math.round(initialGrossSalary * 0.0075) : 0;
  const pt = initialGrossSalary > 15000 ? 200 : (initialGrossSalary > 0 ? 150 : 0);
  const tds = initialTotalDeductions > (pf + esi + pt) ? initialTotalDeductions - (pf + esi + pt) : (initialGrossSalary > 50000 ? Math.round(initialGrossSalary * 0.05) : 0);

  const rawDeductions = deductions && deductions.length > 0 ? deductions : [
    { name: 'Provident Fund (PF 12%)', amount: pf },
    ...(esi > 0 ? [{ name: 'ESI Contribution (0.75%)', amount: esi }] : []),
    { name: 'Professional Tax (PT)', amount: pt },
    ...(tds > 0 ? [{ name: 'TDS Tax Withholding', amount: tds }] : [])
  ];

  const activeEarnings = rawEarnings.filter(item => isAdmin || !hiddenCardComponents[item.name]);
  const activeDeductions = rawDeductions.filter(item => isAdmin || !hiddenCardComponents[item.name]);

  const currentGrossSalary = activeEarnings.reduce((acc, curr) => acc + curr.amount, 0);
  const currentTotalDeductions = activeDeductions.reduce((acc, curr) => acc + curr.amount, 0);
  const currentNetSalary = currentGrossSalary - currentTotalDeductions;

  return (
    <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all bg-card rounded-xl overflow-hidden">
      {/* Header Bar */}
      <CardHeader className="p-3.5 bg-muted/20 border-b border-border/60">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="flex items-center gap-1 text-primary text-[10px] font-mono font-bold">
              <FileText className="w-3 h-3 text-primary" />
              {payslipNumber}
              {department && <span className="text-slate-300 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-normal">{department}</span>}
            </div>
            <CardTitle className="text-sm font-black mt-0.5 text-foreground flex items-center gap-2">
              {month}
              {empName && (
                <span className="text-xs text-slate-300 font-semibold font-sans">
                  · {empName} {empCode && <span className="font-mono text-slate-400">({empCode})</span>}
                </span>
              )}
            </CardTitle>
            {empName && (
              <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="font-bold text-foreground">{empName}</span>
                {empCode && <span className="font-mono text-muted-foreground">({empCode})</span>}
                {department && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{department}</span>}
              </div>
            )}
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 shrink-0">
            Paid & Issued
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        {/* Attendance Pill */}
        {attendance && (
          <div className="bg-muted/30 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border border-border/60">
            <span className="flex items-center gap-1 text-primary">
              <Calendar className="w-3 h-3 text-primary" />
              Attendance
            </span>
            <span className="font-bold text-foreground">
              {attendance.daysPresent ?? 26} / {attendance.workingDaysInMonth ?? 26} Days
              {(attendance.daysAbsent ?? 0) > 0 && (
                <span className="text-rose-600 ml-1 font-bold">({attendance.daysAbsent} LOP)</span>
              )}
            </span>
          </div>
        )}

        {/* Core Financial Numbers */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-muted/20 p-2.5 rounded-lg border border-border/60">
            <div className="text-muted-foreground font-semibold text-[10px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              Gross Salary
            </div>
            <div className="text-sm font-black text-foreground mt-0.5">
              ₹{currentGrossSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Basic: ₹{basicSalary.toLocaleString('en-IN')}</div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40">
            <div className="text-rose-600 font-semibold text-[10px] flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-500" />
              Total Deductions
            </div>
            <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
              −₹{currentTotalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[9px] text-rose-500/80 mt-0.5">Statutory PF/ESI/PT</div>
          </div>
        </div>

        {/* Net Take-Home Salary Callout */}
        <div className="bg-primary/10 border border-primary/20 text-foreground rounded-lg p-3 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-[9px] font-bold text-primary uppercase tracking-wider">Net Take-Home Salary</div>
            <div className="text-lg font-black text-foreground mt-0.5">
              ₹{currentNetSalary.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
        </div>

        {/* Expandable Breakdown Toggle (Optional) */}
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-primary hover:text-primary/80 py-1 border-t border-border/60 transition-colors"
          >
            <span>{showDetails ? 'Hide Itemized Breakdown' : 'Show Earnings & Deductions Breakdown'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-2 pt-2 border-t border-border/60 space-y-2 text-xs">
              {/* Earnings Breakdown */}
              <div className="space-y-1">
                <div className="font-bold text-foreground text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
                    <DollarSign className="w-3 h-3" /> Earnings Components
                  </span>
                  <span className="font-bold text-foreground">₹{currentGrossSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 space-y-1 border border-border/60">
                  {rawEarnings.map((item, idx) => {
                    const isHidden = !!hiddenCardComponents[item.name];
                    if (!isAdmin && isHidden) return null;

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-[11px] p-1 rounded transition-all ${isHidden
                            ? 'bg-muted text-muted-foreground line-through opacity-60'
                            : 'bg-background'
                          }`}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-foreground font-medium">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => toggleComponentCheckbox(item.name)}
                              className="w-3 h-3 rounded text-primary accent-primary cursor-pointer"
                              title={isHidden ? 'Click to show on employee payslip' : 'Click to hide from employee payslip'}
                            />
                          )}
                          <span>{item.name}</span>
                        </label>
                        <span className={`font-bold ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {item.amount < 0 ? `−₹${Math.abs(item.amount).toLocaleString('en-IN')}` : `₹${item.amount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-1">
                <div className="font-bold text-foreground text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-rose-600 font-extrabold">
                    <ShieldCheck className="w-3 h-3" /> Statutory Deductions
                  </span>
                  <span className="font-bold text-rose-600">−₹{currentTotalDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-rose-50/30 dark:bg-rose-950/20 rounded-lg p-2 space-y-1 border border-rose-200/50 dark:border-rose-900/40">
                  {rawDeductions.map((item, idx) => {
                    const isHidden = !!hiddenCardComponents[item.name];
                    if (!isAdmin && isHidden) return null;

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center text-[11px] p-1 rounded transition-all ${isHidden
                            ? 'bg-rose-100/50 text-rose-300 line-through opacity-60'
                            : 'bg-background'
                          }`}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-foreground font-medium">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={() => toggleComponentCheckbox(item.name)}
                              className="w-3 h-3 rounded text-rose-600 accent-rose-600 cursor-pointer"
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
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 h-7"
            >
              <Eye className="w-3 h-3" /> View
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              onClick={onDownload}
              className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 h-7 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="w-3 h-3" /> Download PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
