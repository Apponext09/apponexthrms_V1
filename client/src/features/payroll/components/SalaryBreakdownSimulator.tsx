import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calculator,
  Sliders,
  TrendingUp,
  Award,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Zap,
  Info,
  Building,
  UserCheck,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  Percent,
  Layers
} from 'lucide-react';

export type EmployeeType = 'regular' | 'intern' | 'contractor';
export type ScopeLevel = 'global' | 'location' | 'department' | 'employee';

export interface CalculatedComponentItem {
  name: string;
  type: 'earning' | 'deduction';
  calcType: 'fixed' | 'derived';
  detail?: string;
  amount: number;
  isStatutory: boolean;
}

export interface PayComponentCalc {
  id: string;
  name: string;
  type: 'earning' | 'deduction';
  calcType: 'fixed' | 'derived';
  value: number; // For fixed, exact amount; for derived, percentage or formula factor
  description?: string;
  isStatutory?: boolean;
}

interface SalaryBreakdownSimulatorProps {
  initialCtc?: number;
  initialEmployeeType?: EmployeeType;
  scopeLevel?: ScopeLevel;
  scopeTargetName?: string;
  onApplyStructure?: (breakdown: any) => void;
}

export const SalaryBreakdownSimulator: React.FC<SalaryBreakdownSimulatorProps> = ({
  initialCtc = 600000,
  initialEmployeeType = 'regular',
  scopeLevel = 'global',
  scopeTargetName = 'All Employees',
  onApplyStructure
}) => {
  const [annualCtc, setAnnualCtc] = useState<number>(initialCtc);
  const [employeeType, setEmployeeType] = useState<EmployeeType>(initialEmployeeType);
  const [daysInMonth, setDaysInMonth] = useState<number>(30);
  const [daysWorked, setDaysWorked] = useState<number>(30);
  const [selectedLocation, setSelectedLocation] = useState<string>('Maharashtra');

  const monthlyCtc = useMemo(() => annualCtc / 12, [annualCtc]);
  const proRataRatio = useMemo(() => (daysInMonth > 0 ? daysWorked / daysInMonth : 1), [daysWorked, daysInMonth]);

  // Derived vs Fixed Salary Calculation Logic
  const calculation = useMemo(() => {
    // Intern / Trainee Stipend Rule
    if (employeeType === 'intern') {
      const fixedStipend = Math.min(monthlyCtc, 30000);
      const earnedStipend = fixedStipend * proRataRatio;
      const compList: CalculatedComponentItem[] = [
        { name: 'Stipend (Fixed Value)', type: 'earning', calcType: 'fixed', detail: 'Tax-Free Stipend', amount: earnedStipend, isStatutory: false }
      ];
      return {
        grossEarnings: earnedStipend,
        basic: earnedStipend,
        hra: 0,
        specialAllowance: 0,
        pfEmployee: 0,
        pfEmployer: 0,
        esiEmployee: 0,
        pt: 0,
        tds: 0,
        totalDeductions: 0,
        netPay: earnedStipend,
        isTaxExempt: true,
        components: compList
      };
    }

    // Contractor Rule (TDS only, no PF/ESI/PT)
    if (employeeType === 'contractor') {
      const gross = monthlyCtc * proRataRatio;
      const tdsRate = 0.10; // 10% TDS under 194J
      const tds = gross * tdsRate;
      const compList: CalculatedComponentItem[] = [
        { name: 'Professional Fees (Fixed Value)', type: 'earning', calcType: 'fixed', detail: 'Gross Contract Pay', amount: gross, isStatutory: false },
        { name: 'TDS (10% u/s 194J Derived)', type: 'deduction', calcType: 'derived', detail: 'Professional TDS', amount: tds, isStatutory: true }
      ];
      return {
        grossEarnings: gross,
        basic: gross,
        hra: 0,
        specialAllowance: 0,
        pfEmployee: 0,
        pfEmployer: 0,
        esiEmployee: 0,
        pt: 0,
        tds,
        totalDeductions: tds,
        netPay: gross - tds,
        isTaxExempt: false,
        components: compList
      };
    }

    // Regular Employee Standard 50-40-10 & Statutory Rules
    const unadjustedBasic = monthlyCtc * 0.50; // Derived 50%
    const unadjustedHra = unadjustedBasic * 0.40; // Derived 40% of Basic
    const unadjustedSpecial = Math.max(0, monthlyCtc - (unadjustedBasic + unadjustedHra));

    // Attendance Pro-Rata Earned
    const basicEarned = unadjustedBasic * proRataRatio;
    const hraEarned = unadjustedHra * proRataRatio;
    const specialEarned = unadjustedSpecial * proRataRatio;
    const grossEarnings = basicEarned + hraEarned + specialEarned;

    // Statutory Deductions
    // PF: 12% of Basic (Capped at 15,000 wage ceiling if standard, or actual)
    const pfWage = Math.min(basicEarned, 15000);
    const pfEmployee = Math.round(pfWage * 0.12);

    // PT (Professional Tax based on state)
    let pt = 0;
    if (grossEarnings > 15000) {
      pt = selectedLocation === 'Maharashtra' ? 200 : 200;
    } else if (grossEarnings > 10000) {
      pt = 150;
    }

    // ESI (If gross <= 21,000 per month)
    let esiEmployee = 0;
    if (monthlyCtc <= 21000) {
      esiEmployee = Math.ceil(grossEarnings * 0.0075);
    }

    // TDS Estimate (New Tax Regime approx)
    let tds = 0;
    const annualGross = grossEarnings * 12;
    if (annualGross > 700000) {
      const taxable = annualGross - 75000; // Standard deduction 75k
      if (taxable > 1500000) tds = (taxable * 0.20) / 12;
      else if (taxable > 1000000) tds = (taxable * 0.15) / 12;
      else if (taxable > 700000) tds = (taxable * 0.10) / 12;
    }

    const totalDeductions = pfEmployee + pt + esiEmployee + tds;
    const netPay = Math.max(0, grossEarnings - totalDeductions);

    const compList: CalculatedComponentItem[] = [
      { name: 'Basic Salary', type: 'earning', calcType: 'derived', detail: '50% of CTC Formula', amount: basicEarned, isStatutory: true },
      { name: 'HRA (House Rent)', type: 'earning', calcType: 'derived', detail: '40% of Basic Formula', amount: hraEarned, isStatutory: true },
      { name: 'Special Allowance', type: 'earning', calcType: 'derived', detail: 'Auto Balancing', amount: specialEarned, isStatutory: false },
      { name: 'PF (Provident Fund)', type: 'deduction', calcType: 'derived', detail: '12% of Basic Formula', amount: pfEmployee, isStatutory: true },
      { name: 'Professional Tax (PT)', type: 'deduction', calcType: 'fixed', detail: `${selectedLocation} Fixed Slab`, amount: pt, isStatutory: true },
      ...(esiEmployee > 0 ? [{ name: 'ESI', type: 'deduction' as const, calcType: 'derived' as const, detail: '0.75% Gross Formula', amount: esiEmployee, isStatutory: true }] : []),
      ...(tds > 0 ? [{ name: 'Estimated TDS', type: 'deduction' as const, calcType: 'derived' as const, detail: 'Income Tax Slab', amount: tds, isStatutory: true }] : [])
    ];

    return {
      grossEarnings,
      basic: basicEarned,
      hra: hraEarned,
      specialAllowance: specialEarned,
      pfEmployee,
      pfEmployer: pfEmployee,
      esiEmployee,
      pt,
      tds,
      totalDeductions,
      netPay,
      isTaxExempt: false,
      components: compList
    };
  }, [annualCtc, monthlyCtc, employeeType, proRataRatio, selectedLocation]);

  const netPayPercent = useMemo(() => {
    return calculation.grossEarnings > 0
      ? Math.round((calculation.netPay / calculation.grossEarnings) * 100)
      : 0;
  }, [calculation]);

  return (
    <Card className="border border-indigo-100 dark:border-slate-800 bg-linear-to-br from-white via-slate-50/50 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-md">
      <CardHeader className="pb-3 border-b border-indigo-100/60 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Salary Calculator & Breakdown
                <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                  Visual Simulator
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Simulate CTC breakdown, fixed vs. derived formulas, and tax rules in real-time.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Scope: <span className="capitalize text-indigo-600 dark:text-indigo-400 ml-1 font-bold">{scopeLevel}</span> ({scopeTargetName})
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* TOP CONTROLS: CTC Slider, Employee Type & Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          {/* Annual CTC Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Annual CTC (₹)</span>
              <span className="text-indigo-600 font-extrabold">₹{annualCtc.toLocaleString('en-IN')}/yr</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <Input
                type="number"
                value={annualCtc}
                onChange={(e) => setAnnualCtc(Number(e.target.value) || 0)}
                className="pl-7 h-9 text-xs font-bold"
                step={50000}
              />
            </div>
            <input
              type="range"
              min={100000}
              max={3000000}
              step={25000}
              value={annualCtc}
              onChange={(e) => setAnnualCtc(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>₹1 Lakh</span>
              <span>₹15 Lakhs</span>
              <span>₹30 Lakhs</span>
            </div>
          </div>

          {/* Employee Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Employee Type (Tax Rules)
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setEmployeeType('regular')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  employeeType === 'regular'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Briefcase className="w-3 h-3" /> Regular
              </button>

              <button
                type="button"
                onClick={() => setEmployeeType('intern')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  employeeType === 'intern'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <GraduationCap className="w-3 h-3" /> Intern
              </button>

              <button
                type="button"
                onClick={() => setEmployeeType('contractor')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  employeeType === 'contractor'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <UserCheck className="w-3 h-3" /> Contract
              </button>
            </div>
            {employeeType === 'intern' && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Tax-free Stipend: PF, PT & TDS Exempted.
              </p>
            )}
            {employeeType === 'contractor' && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Info className="w-3 h-3" /> Professional Fees: 10% TDS (u/s 194J), No PF/ESI.
              </p>
            )}
          </div>

          {/* Attendance Pro-Rata Days */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Attendance / Days Worked</span>
              <span className="text-indigo-600 font-bold">{daysWorked}/{daysInMonth} Days</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={daysInMonth}
                value={daysWorked}
                onChange={(e) => setDaysWorked(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 w-12 text-right">
                {Math.round(proRataRatio * 100)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Pro-rata factor for LWP (Loss of Pay) simulation.
            </p>
          </div>
        </div>

        {/* SUMMARY CARDS SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
              Monthly Gross CTC
            </span>
            <div className="text-xl font-extrabold text-indigo-950 dark:text-indigo-100 mt-1">
              ₹{Math.round(calculation.grossEarnings).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 font-medium">
              ₹{Math.round(monthlyCtc).toLocaleString('en-IN')}/mo full
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
              Statutory & Tax Deductions
            </span>
            <div className="text-xl font-extrabold text-rose-950 dark:text-rose-100 mt-1">
              ₹{Math.round(calculation.totalDeductions).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400 font-medium">
              {calculation.grossEarnings > 0 ? Math.round((calculation.totalDeductions / calculation.grossEarnings) * 100) : 0}% of Gross
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
              Net Take-Home Salary
            </span>
            <div className="text-xl font-extrabold text-emerald-950 dark:text-emerald-100 mt-1">
              ₹{Math.round(calculation.netPay).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 font-extrabold">
              {netPayPercent}% in-hand take home
            </span>
          </div>
        </div>

        {/* VISUAL BREAKDOWN PROGRESS BAR */}
        <div className="space-y-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" /> Component Composition Breakdown
            </span>
            <span className="text-emerald-600 font-extrabold">Take Home: {netPayPercent}%</span>
          </div>

          {/* Multi-segment progress bar */}
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            {employeeType === 'regular' && (
              <>
                <div style={{ width: '45%' }} className="bg-indigo-600 h-full" title="Basic (Derived 50%)" />
                <div style={{ width: '18%' }} className="bg-indigo-400 h-full" title="HRA (Derived 40% of Basic)" />
                <div style={{ width: '25%' }} className="bg-indigo-300 h-full" title="Special Allowance (Derived)" />
                <div style={{ width: `${Math.max(2, 100 - netPayPercent)}%` }} className="bg-rose-500 h-full" title="PF/PT Deductions" />
              </>
            )}
            {employeeType === 'intern' && (
              <div style={{ width: '100%' }} className="bg-emerald-500 h-full" title="Tax-Free Stipend (Fixed 100%)" />
            )}
            {employeeType === 'contractor' && (
              <>
                <div style={{ width: '90%' }} className="bg-emerald-500 h-full" title="Professional Fees" />
                <div style={{ width: '10%' }} className="bg-rose-500 h-full" title="TDS 10%" />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Basic
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> HRA
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-300 inline-block" /> Special Allowance
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Statutory Cuts
              </span>
            </div>
            <span className="text-slate-400 font-medium text-[10px]">
              Hover components for formula details
            </span>
          </div>
        </div>

        {/* DETAILED COMPONENTS TABLE WITH FIXED VS DERIVED BADGES */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
            <span>Pay Components Breakdown ({calculation.components.length})</span>
            <span className="text-[11px] font-normal text-slate-500">
              📌 Fixed Value | 🧮 Derived Formula
            </span>
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {calculation.components.map((comp, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-center gap-2.5">
                  {comp.calcType === 'fixed' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-1.5 py-0.5">
                      📌 Fixed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold px-1.5 py-0.5">
                      🧮 Derived
                    </Badge>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{comp.name}</span>
                    {comp.detail && (
                      <span className="text-[10px] text-slate-400 ml-2 font-medium">
                        ({comp.detail})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-extrabold ${comp.type === 'earning' ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {comp.type === 'earning' ? '+' : '-'} ₹{Math.round(comp.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* APPLY BUTTON */}
        {onApplyStructure && (
          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => onApplyStructure(calculation)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 h-9 shadow-sm gap-2"
            >
              <Zap className="w-4 h-4" /> Apply Structure to Scope ({scopeTargetName})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
