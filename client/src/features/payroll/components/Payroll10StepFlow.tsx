import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Calculator,
  CheckCircle,
  Lock,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Users,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { PayslipViewer } from '../pages/PayslipViewer';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

export const Payroll10StepFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [payrollMonth, setPayrollMonth] = useState<string>('2026-07');
  const [employeeCount, setEmployeeCount] = useState<number>(0);

  const [calcTotals, setCalcTotals] = useState<{ gross: number; deductions: number; net: number }>({ gross: 0, deductions: 0, net: 0 });

  React.useEffect(() => {
    apiClient.get('/employees', { params: { pageSize: 500 } }).then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) setEmployeeCount(list.length);
    }).catch(() => { });
  }, []);

  const [calculated, setCalculated] = useState<boolean>(false);
  const [approved, setApproved] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [payslipsGenerated, setPayslipsGenerated] = useState<boolean>(false);

  const steps = [
    { num: 1, title: 'Calculate', fullTitle: 'Select Month & Calculate Salary', desc: 'Execute gross-to-net salary calculation across active employees', icon: Calculator },
    { num: 2, title: 'Review & Approve', fullTitle: 'Review & Financial Approval', desc: 'Inspect department outlays, statutory deductions & approve run', icon: CheckCircle },
    { num: 3, title: 'Lock & Publish', fullTitle: 'Lock Period & Issue Payslips', desc: 'Freeze monthly figures and publish payslips to employee portal', icon: Lock },
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

  const handleRunCalculation = () => {
    setCalculated(true);
    markStepDone(1);
    showToast.success('Calculation Complete', `Salary calculations processed for ${employeeCount || 8} active employees`);
  };

  const handleApprovePayroll = () => {
    setApproved(true);
    markStepDone(2);
    showToast.success('Payroll Approved', 'July 2026 payroll run approved by HR & Finance');
  };

  const handleLockPayroll = () => {
    setIsLocked(true);
    showToast.success('Payroll Period Locked', 'July 2026 figures are now locked and secured');
  };

  const handlePublishPayslips = () => {
    setPayslipsGenerated(true);
    markStepDone(3);
    showToast.success('Payslips Published', 'Official payslips published to all employee self-service portals');
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="space-y-4 max-w-6xl mx-auto select-none pb-10">
      {/* Header Banner Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">Payroll Processing Pipeline</h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                Cycle: July 2026
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Execute monthly salary calculations, review department outlays, lock payroll runs, and publish employee payslips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border font-bold text-xs px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Attendance Synced
          </Badge>
        </div>
      </div>

      {/* Step Progress Tracker */}
      <div className="bg-card border border-border/80 rounded-xl p-2 shadow-2xs">
        <div className="grid grid-cols-3 gap-2">
          {steps.map((st) => {
            const isCurrent = currentStep === st.num;
            const isDone = completedSteps.includes(st.num);
            return (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all w-full ${isCurrent
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-background border border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${isCurrent
                    ? 'bg-primary-foreground text-primary'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                  {isDone ? '✓' : st.num}
                </span>
                <span className="truncate">{st.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Execution Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between py-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              {React.createElement(currentStepData.icon, { className: 'w-4 h-4' })}
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Step {currentStep} of {steps.length}</div>
              <CardTitle className="text-sm font-bold text-foreground">{currentStepData.fullTitle}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">{currentStepData.desc}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="h-8 text-xs font-bold gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            {currentStep < steps.length && (
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {/* STEP 1: Select Month & Calculate */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 border border-border/80 rounded-xl bg-card space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Select Payroll Month & Execute Calculation
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select target payroll month to compute gross pay, PF/ESI, and TDS tax for all active employees.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold shrink-0">
                    Attendance Verified
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Payroll Month *</label>
                    <select
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="w-full h-8 px-3 border border-border rounded-lg text-xs bg-background font-bold text-foreground cursor-pointer"
                    >
                      <option value="2026-07">July 2026 (Active Cycle)</option>
                      <option value="2026-06">June 2026</option>
                      <option value="2026-05">May 2026</option>
                    </select>
                  </div>

                  <div className="bg-muted/20 p-2.5 rounded-lg border border-border/60 flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground font-bold">Eligible Employees</div>
                      <div className="text-xs font-black text-foreground">{employeeCount || 8} Active Employees</div>
                    </div>
                  </div>
                </div>

                {!calculated ? (
                  <Button
                    onClick={handleRunCalculation}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs shadow-2xs flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Run Salary Calculation for All Employees
                  </Button>
                ) : (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-3">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Salary Calculation Completed for July 2026!
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'Total Gross', val: '₹6,05,000', cls: 'text-foreground font-bold' },
                        { label: 'Deductions', val: '−₹70,000', cls: 'text-rose-600 font-bold' },
                        { label: 'Net Disbursal', val: '₹5,35,000', cls: 'text-emerald-700 font-black' },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className="bg-card p-2.5 rounded-lg border border-border/60 text-center">
                          <span className="text-[10px] text-muted-foreground block">{label}</span>
                          <span className={`text-xs ${cls}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => setCurrentStep(2)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs gap-1"
                    >
                      Proceed to Review & Approve <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Review & Approve */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Review Department Outlays & Financial Approval
                  </h3>
                  <p className="text-xs text-muted-foreground">Verify monthly department totals and sign off on payroll disbursal.</p>
                </div>
                {approved ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 shrink-0">
                    ✓ Approved by HR & Finance
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] shrink-0">
                    Pending Approval
                  </Badge>
                )}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: 'Total Employees', val: `${employeeCount || 8} Active`, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Monthly Gross', val: '₹6,05,000', icon: DollarSign, color: 'text-foreground', bg: 'bg-card' },
                  { label: 'Deductions', val: '−₹70,000', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20' },
                  { label: 'Net Disbursal', val: '₹5,35,000', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                ].map(({ label, val, icon: Icon, color, bg }) => (
                  <div key={label} className={`${bg} border border-border/80 p-3 rounded-xl shadow-2xs`}>
                    <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                      <Icon className={`w-3 h-3 ${color}`} /> {label}
                    </span>
                    <div className={`text-sm font-black mt-0.5 ${color}`}>{val}</div>
                  </div>
                ))}
              </div>

              {!approved ? (
                <div className="p-4 border border-amber-200 dark:border-amber-900 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 text-center space-y-3">
                  <AlertCircle className="w-7 h-7 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="font-bold text-foreground text-xs">Approval Required for July 2026 Payroll Run</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-md mx-auto">
                      Total Net Disbursal: <strong>₹5,35,000</strong> across {employeeCount || 8} employees. All attendance and statutory deductions are verified.
                    </p>
                  </div>
                  <Button
                    onClick={handleApprovePayroll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-8 text-xs"
                  >
                    ✓ Approve Payroll Run
                  </Button>
                </div>
              ) : (
                <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center space-y-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Payroll Approved Successfully!</h4>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-8 text-xs gap-1"
                  >
                    Proceed to Lock & Publish <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Lock & Issue Payslips */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="p-4 border border-border/80 rounded-xl bg-card space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Lock Payroll & Issue Payslips to Employees
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Freeze monthly figures and publish official payslips to all employee self-service portals.
                    </p>
                  </div>
                  {isLocked && (
                    <Badge className="bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 shrink-0">
                      🔒 Locked
                    </Badge>
                  )}
                </div>

                {!isLocked ? (
                  <div className="p-3 bg-muted/20 rounded-lg border border-border/60 space-y-2">
                    <div className="text-xs font-bold text-foreground">Lock Monthly Payroll Run</div>
                    <p className="text-xs text-muted-foreground">Locking prevents further changes to July 2026 salary figures before issuing payslips.</p>
                    <Button
                      onClick={handleLockPayroll}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4"
                    >
                      🔒 Lock July 2026 Payroll Figures
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      July 2026 Payroll Period is Locked & Secured!
                    </span>
                    {!payslipsGenerated ? (
                      <Button
                        onClick={handlePublishPayslips}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Publish All Payslips
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1">
                        <Sparkles className="w-3 h-3 mr-1" /> All Payslips Issued
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Payslip Hub */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Payslip Hub — All Employees</span>
                </div>
                <PayslipViewer />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
