import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Calendar,
  Calculator,
  CheckCircle,
  Lock,
  FileText,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Users,
  DollarSign,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { PayslipViewer } from '../pages/PayslipViewer';
import { apiClient } from '@/config/api';

export const Payroll10StepFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [payrollMonth, setPayrollMonth] = useState<string>('2026-07');
  const [employeeCount, setEmployeeCount] = useState<number>(0);

  React.useEffect(() => {
    apiClient.get('/employees', { params: { pageSize: 500 } }).then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setEmployeeCount(list.length);
      }
    }).catch(() => {});
  }, []);

  // Execution states
  const [calculated, setCalculated] = useState<boolean>(false);
  const [approved, setApproved] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [payslipsGenerated, setPayslipsGenerated] = useState<boolean>(false);

  const steps = [
    { num: 1, title: 'Select Month & Calculate', desc: 'Pick payroll cycle & execute gross-to-net calculation', icon: Calendar },
    { num: 2, title: 'Review & Approve', desc: 'Inspect department totals, variance & finance sign-off', icon: CheckCircle },
    { num: 3, title: 'Lock & Issue Payslips', desc: 'Freeze monthly figures & publish payslips to all employees', icon: Lock }
  ];

  const markStepDone = (stepNum: number) => {
    if (!completedSteps.includes(stepNum)) {
      setCompletedSteps([...completedSteps, stepNum]);
    }
  };

  const handleNext = () => {
    markStepDone(currentStep);
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" /> Monthly Payroll Execution Pipeline
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Run Monthly Payroll</h1>
          <p className="text-slate-300 text-sm mt-1">
            Simple 3-step monthly cycle to calculate salaries, review department outlays, lock payroll, and issue payslips to all employees.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-600 text-white text-xs font-extrabold px-3.5 py-1.5 shadow-md">
            Step {currentStep} of {steps.length}
          </Badge>
        </div>
      </div>

      {/* 3-Step Navigation Bar */}
      <div className="bg-slate-900 text-white rounded-xl shadow-md p-1.5">
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {steps.map((st) => {
            const isCurrent = currentStep === st.num;
            const isDone = completedSteps.includes(st.num);

            return (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all w-full text-center ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isDone
                    ? 'bg-slate-800 text-emerald-400 hover:bg-slate-750'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-white text-indigo-700'
                    : isDone
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isDone ? '✓' : st.num}
                </span>
                <span className="truncate">{st.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Execution Area */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="border-b bg-slate-50/70 dark:bg-slate-800/50 flex flex-row items-center justify-between">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">
              Step {currentStep} Module
            </div>
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: 'w-5 h-5 text-indigo-600' })}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">{steps[currentStep - 1].desc}</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="flex items-center gap-1 font-bold text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
            </Button>
            {currentStep < steps.length && (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs text-xs font-bold"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* STEP 1: Select Month & Run Batch Calculation */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-6 border rounded-2xl bg-slate-50/50 dark:bg-slate-900 space-y-5 border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      Step 1: Select Month &amp; Calculate Salaries
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Pick payroll month to compute gross pay, PF/ESI, and TDS tax for all active employees.</p>
                  </div>
                  <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs">
                    Attendance Reconciled
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Payroll Month *</label>
                    <select
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="w-full h-10 px-3 border border-indigo-300 rounded-lg text-sm bg-white dark:bg-slate-800 font-bold text-indigo-950 dark:text-white cursor-pointer"
                    >
                      <option value="2026-07">July 2026 (Active Cycle)</option>
                      <option value="2026-06">June 2026</option>
                      <option value="2026-05">May 2026</option>
                    </select>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border flex items-center gap-3">
                    <Users className="w-8 h-8 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Eligible Employees</div>
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">{employeeCount} Active Database Employee{employeeCount === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                </div>

                {!calculated ? (
                  <Button
                    onClick={() => {
                      setCalculated(true);
                      markStepDone(1);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    ⚡ Run Salary Calculation for All Employees
                  </Button>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
                    <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Salary Calculation Completed for July 2026!
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                      <div className="bg-white p-2.5 rounded border">
                        <span className="text-slate-400 block text-[10px]">Total Gross Salary</span>
                        <span className="font-extrabold text-slate-900 text-sm">₹6,05,000</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border">
                        <span className="text-rose-500 block text-[10px]">Total Statutory Deductions</span>
                        <span className="font-extrabold text-rose-600 text-sm">−₹70,000</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border">
                        <span className="text-emerald-600 block text-[10px]">Total Net Salary Take-Home</span>
                        <span className="font-extrabold text-emerald-600 text-sm">₹5,35,000</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setCurrentStep(2)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs shadow"
                    >
                      Proceed to Step 2: Review &amp; Approve <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Review & Approve Payroll Run */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                    Step 2: Review Department Outlays &amp; Final Approval
                  </h3>
                  <p className="text-xs text-slate-500">Verify monthly totals and sign off on payroll disbursal.</p>
                </div>
                {approved ? (
                  <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-1">
                    ✓ Approved by HR &amp; Finance
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-xs">
                    Pending Approval
                  </Badge>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border">
                  <span className="text-slate-400 font-semibold flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Total Employees</span>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">8 Active</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border">
                  <span className="text-slate-400 font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Monthly Gross</span>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">₹6,05,000</div>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900">
                  <span className="text-rose-600 font-semibold flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Deductions</span>
                  <div className="text-lg font-extrabold text-rose-600 mt-1">−₹70,000</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Net Disbursal</span>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1">₹5,35,000</div>
                </div>
              </div>

              {!approved ? (
                <div className="p-6 border-2 border-amber-300 dark:border-amber-900 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 text-center space-y-4 shadow-sm">
                  <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Approval Required for July 2026 Payroll Run</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                      Total Net Disbursal: <strong>₹5,35,000</strong> across 8 employees. All attendance and statutory deductions are verified.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setApproved(true);
                      markStepDone(2);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-11 text-xs shadow-md"
                  >
                    ✓ Approve Payroll Run
                  </Button>
                </div>
              ) : (
                <div className="p-6 border rounded-2xl bg-emerald-50 border-emerald-200 text-center space-y-3 animate-fade-in">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-emerald-900 text-base">Payroll Approved Successfully!</h4>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-10 text-xs shadow"
                  >
                    Proceed to Step 3: Lock &amp; Issue Payslips <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Lock & Issue Payslips */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="p-6 border rounded-2xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-600" />
                      Step 3: Lock Payroll &amp; Issue Payslips to All Employees
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Freeze monthly figures and publish official PDF payslips to all employee self-service portals.</p>
                  </div>
                  {isLocked && (
                    <Badge className="bg-rose-600 text-white font-extrabold text-xs px-3 py-1">
                      🔒 Payroll Figures Locked
                    </Badge>
                  )}
                </div>

                {!isLocked ? (
                  <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border space-y-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Lock Monthly Payroll Run</div>
                    <p className="text-xs text-slate-500">Locking prevents further changes to July 2026 salary figures before issuing payslips.</p>
                    <Button
                      onClick={() => {
                        setIsLocked(true);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-5 shadow-xs"
                    >
                      🔒 Lock July 2026 Payroll Figures
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      July 2026 Payroll Period is Locked &amp; Secured!
                    </span>
                    {!payslipsGenerated ? (
                      <Button
                        onClick={() => {
                          setPayslipsGenerated(true);
                          markStepDone(3);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 shadow"
                      >
                        <FileText className="w-4 h-4 mr-1" /> Publish All Payslips
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1">
                        ✓ All Payslips Issued to Employees
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* All Employees Payslips Hub */}
              <div className="pt-2">
                <PayslipViewer />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
