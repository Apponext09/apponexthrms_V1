import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Send, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, Calculator, Wallet, Landmark, Printer, FileText, X } from 'lucide-react';
import { apiClient } from '@/config/api';
import { queryClient } from '@/config/query';
import { useAuthStore } from '@/features/auth/store/authStore';

interface LoanItem {
  id: number;
  loanType: string;
  amount: number;
  tenureMonths: number;
  interestRate: number;
  monthlyEmi: number;
  outstandingBalance: number;
  status: 'pending' | 'approved' | 'active' | 'rejected';
  requestDate: string;
  reason: string;
  repaymentOption?: string;
}

export const EmployeeLoanRequest: React.FC = () => {
  const { user } = useAuthStore();
  const empId = user?.employeeId || (user as any)?.employee_id || user?.id;

  const loanStorageKey = `shared_hr_loans_${user?.id || user?.email || 'unknown'}`;

  const [loanList, setLoanList] = useState<LoanItem[]>([]);
  const [loanType, setLoanType] = useState('Salary Advance');
  const [amountInput, setAmountInput] = useState('30000');
  const [tenureInput, setTenureInput] = useState('6');
  const [deductionMode, setDeductionMode] = useState('salary_deduction');
  const [reason, setReason] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activePrintLoan, setActivePrintLoan] = useState<{ loan: LoanItem; formType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [employeeGrossSalary, setEmployeeGrossSalary] = useState<number>(0);
  const [dynamicLoanTypes, setDynamicLoanTypes] = useState<Array<{ name: string; rate: number }>>([]);

  React.useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const [loanRes, payslipRes, structRes, empRes, loanTypesRes] = await Promise.all([
          apiClient.get('/payroll/loans', { params: { employeeId: empId } }).catch(() => ({ data: null })),
          apiClient.get('/payroll/payslips', { params: { employeeId: empId } }).catch(() => ({ data: null })),
          apiClient.get('/payroll/structures').catch(() => ({ data: null })),
          apiClient.get('/employees').catch(() => ({ data: null })),
          apiClient.get('/payroll/loan-types').catch(() => ({ data: null }))
        ]);

        const fetchedTypes = loanTypesRes?.data?.data || loanTypesRes?.data || [];
        if (Array.isArray(fetchedTypes) && fetchedTypes.length > 0) {
          const mappedTypes = fetchedTypes.map((t: any) => ({
            name: t.name || t.loan_type_name || 'Loan',
            rate: Number(t.interestRate || t.interest_rate || 0)
          }));
          setDynamicLoanTypes(mappedTypes);
          if (mappedTypes.length > 0) {
            setLoanType(mappedTypes[0].name);
          }
        }

        let resolvedGross = 0;
        if (payslipRes?.data?.data && Array.isArray(payslipRes.data.data) && payslipRes.data.data.length > 0) {
          const latestPayslip = payslipRes.data.data[0];
          resolvedGross = Number(latestPayslip.gross_salary || latestPayslip.grossSalary || 0);
        }

        if (resolvedGross === 0 && structRes?.data?.data && Array.isArray(structRes.data.data)) {
          const myStruct = structRes.data.data.find((s: any) =>
            String(s.employee_id || s.empId || s.employeeId) === String(empId) ||
            (user?.email && s.email === user.email)
          );
          if (myStruct) {
            resolvedGross = Number(myStruct.gross_monthly || myStruct.grossMonthly || myStruct.gross || (myStruct.annualCtc ? Math.round(myStruct.annualCtc / 12) : 0));
          }
        }

        if (resolvedGross === 0 && empRes?.data?.data && Array.isArray(empRes.data.data)) {
          const myEmp = empRes.data.data.find((e: any) =>
            String(e.id) === String(empId) ||
            (user?.email && e.email === user.email)
          );
          if (myEmp) {
            resolvedGross = Number(myEmp.gross_salary || myEmp.gross || 0);
          }
        }

        setEmployeeGrossSalary(resolvedGross);

        if (loanRes?.data?.data && Array.isArray(loanRes.data.data)) {
          const rawList: any[] = loanRes.data.data;
          const userEmpIdStr = String(empId);
          const myLoansRaw = rawList.filter((l: any) =>
            String(l.employee_id || l.employeeId || '') === userEmpIdStr ||
            (user?.email && (l.email === user.email || l.employee_email === user.email))
          );

          const mapped: LoanItem[] = myLoansRaw.map((l: any) => ({
            id: l.id || l.uuid,
            loanType: l.loan_type || l.loanType || 'Personal Loan',
            amount: Number(l.amount || l.loan_amount || l.loanAmount || 0),
            tenureMonths: Number(l.tenure_months || l.tenureMonths || 1),
            interestRate: Number(l.interest_rate || l.interestRate || 0),
            monthlyEmi: Number(l.monthly_emi || l.emi || 0),
            outstandingBalance: Number(l.outstanding_amount || l.outstandingBalance || l.amount || 0),
            status: (l.status || 'pending').toLowerCase() as any,
            requestDate: (l.created_at || l.loan_date || '2026-07-27').slice(0, 10),
            reason: l.reason || 'Personal Financial Request'
          }));
          setLoanList(mapped);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [empId, user?.email]);

  // Live EMI Calculation
  const amount = parseFloat(amountInput) || 0;
  const tenure = parseInt(tenureInput, 10) || 1;
  const rate = loanType === 'Salary Advance' ? 0 : 8.5;
  const emi = rate > 0
    ? Math.round((amount * (1 + (rate / 100))) / tenure)
    : Math.round(amount / tenure);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (amount <= 0) {
      setErrorMsg('Please enter a valid loan amount.');
      return;
    }
    if (tenure <= 0) {
      setErrorMsg('Please enter a valid tenure in months.');
      return;
    }

    const newLoanPayload = {
      id: Date.now(),
      employee_id: user?.employeeId || user?.id || 44,
      employee_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'PP Manager',
      employee_code: (user as any)?.employeeCode || '432',
      department_name: (user as any)?.department || 'Operations & IT',
      loan_type: loanType,
      loan_amount: amount,
      tenure_months: tenure,
      interest_rate: rate,
      monthly_emi: emi,
      outstanding_amount: amount,
      status: 'pending',
      loan_date: new Date().toISOString().slice(0, 10),
      reason: reason || 'Personal Financial Request',
      email: user?.email || 'pp@gmail.com',
      repaymentOption: deductionMode
    };

    const newLoan: LoanItem = {
      id: newLoanPayload.id,
      loanType,
      amount,
      tenureMonths: tenure,
      interestRate: rate,
      monthlyEmi: emi,
      outstandingBalance: amount,
      status: 'pending',
      requestDate: newLoanPayload.loan_date,
      reason: newLoanPayload.reason,
      repaymentOption: deductionMode
    };

    try {
      const stored = JSON.parse(localStorage.getItem(loanStorageKey) || '[]');
      localStorage.setItem(loanStorageKey, JSON.stringify([newLoanPayload, ...stored]));
    } catch {}

    setLoanList([newLoan, ...loanList]);
    setSuccessMsg(`Loan request of ₹${amount.toLocaleString('en-IN')} submitted successfully! Sent for HR & Finance approval.`);

    try {
      await apiClient.post('/payroll/loans', {
        employeeId: user?.employeeId || user?.id,
        loanType: loanType.toLowerCase().replace(' ', '_'),
        loanAmount: amount,
        tenureMonths: tenure,
        interestRate: rate,
        loanDate: new Date().toISOString().slice(0, 10),
        reason,
        repaymentOption: deductionMode
      });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } catch (err) { }

    setReason('');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">Active / Disbursed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px] font-bold">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold">{status}</Badge>;
    }
  };

  const totalOutstanding = loanList.filter(l => l.status === 'active' || l.status === 'approved').reduce((acc, curr) => acc + curr.outstandingBalance, 0);
  const activeCount = loanList.filter(l => l.status === 'active' || l.status === 'approved').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5 text-indigo-400" /> Employee Loan & Financial Assistance Portal
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              Payroll Integrated
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Apply for interest-free salary advances, medical emergency loans, or personal credit with automated monthly EMI payroll deductions.
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Monthly Pay</p>
              <p className="text-xl font-black text-foreground mt-0.5">
                {employeeGrossSalary > 0 ? `₹${employeeGrossSalary.toLocaleString('en-IN')}` : '₹0'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Loans</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Outstanding</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Horizontal Loan Application Form Card */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <CreditCard className="w-4 h-4 text-primary" /> Apply for Advance / Loan
            </CardTitle>
            <CardDescription className="text-xs">
              Select request type, amount, and tenure to calculate your monthly EMI and submit for HR approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              
              {/* Top Summary Bar: Eligibility & Live EMI Estimate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Eligibility Box */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2 text-xs flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Gross Salary:</span>
                    <span className="text-foreground font-extrabold font-mono text-sm">
                      {employeeGrossSalary > 0 ? `₹${employeeGrossSalary.toLocaleString('en-IN')}/mo` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-card rounded-lg border border-border/60">
                      <span className="text-muted-foreground block font-medium">Max Advance (50%):</span>
                      <span className="text-foreground font-bold font-mono">
                        {employeeGrossSalary > 0 ? `₹${Math.round(employeeGrossSalary * 0.50).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                    <div className="p-2 bg-card rounded-md border border-border/60">
                      <span className="text-muted-foreground block font-medium">Max Personal (3x):</span>
                      <span className="text-foreground font-bold font-mono">
                        {employeeGrossSalary > 0 ? `₹${Math.round(employeeGrossSalary * 3).toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live EMI Estimate */}
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-1.5 text-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Estimated Monthly EMI</span>
                      <span className="text-lg font-black text-primary font-mono mt-0.5 block">₹{emi.toLocaleString('en-IN')} / mo</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {tenure} Mos @ {rate}% p.a.
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 pt-1.5 border-t border-primary/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto-deducted directly from monthly gross salary during payroll run.</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Inputs Grid Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="loanType" className="text-xs font-bold text-foreground">Loan Category *</Label>
                  <select
                    id="loanType"
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {dynamicLoanTypes.length > 0 ? (
                      dynamicLoanTypes.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} {t.rate > 0 ? `(${t.rate}% Interest)` : '(0% Interest)'}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Advance">Advance (0% Interest)</option>
                        <option value="Personal loan">Personal loan (8.5% p.a.)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-bold text-foreground">Requested Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 30000"
                    className="h-9 text-xs font-bold text-primary rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tenure" className="text-xs font-bold text-foreground">Tenure (Months) *</Label>
                  <Input
                    id="tenure"
                    type="number"
                    value={tenureInput}
                    onChange={(e) => setTenureInput(e.target.value)}
                    placeholder="e.g. 6"
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    min="1"
                    max="24"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deductionMode" className="text-xs font-bold text-foreground">Repayment Option *</Label>
                  <select
                    id="deductionMode"
                    value={deductionMode}
                    onChange={(e) => setDeductionMode(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="salary_deduction">Auto Deduct from Salary</option>
                    <option value="cash_payment">Cash Payment</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="full_next_salary">Full Cut on Next Salary</option>
                  </select>
                </div>
              </div>

              {/* Bottom Row: Reason Textarea + Submit Button */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-1">
                <div className="md:col-span-3 space-y-1.5">
                  <Label htmlFor="reason" className="text-xs font-bold text-foreground">Reason / Justification</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide justification or medical/personal reason for loan request..."
                    className="h-9 text-xs font-medium text-foreground rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                  />
                </div>

                <div className="md:col-span-1">
                  <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                    <Send className="w-3.5 h-3.5" /> Submit Application
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Loan History Table (Full Width Below) */}
        <Card className="w-full border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Clock className="w-4 h-4 text-primary" /> Loan Requests History
              </CardTitle>
              <CardDescription className="text-xs">Track approval status and monthly EMI repayments.</CardDescription>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border font-bold">
              {loanList.length} Requests
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loanList.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground flex flex-col items-center gap-2">
                <CreditCard className="w-8 h-8 opacity-40" />
                <p className="text-xs font-bold text-foreground">No loan requests submitted yet</p>
                <p className="text-[11px] text-muted-foreground">Use the application form above to submit a request.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Tenure & Rate</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Monthly EMI</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Outstanding</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Schedule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanList.map((loan) => (
                    <React.Fragment key={loan.id}>
                      <TableRow className="hover:bg-muted/20 transition-colors border-b border-border/50">
                        <TableCell className="px-4 py-3 text-xs font-bold text-foreground">
                          <div>{loan.loanType}</div>
                          <div className="text-[10px] text-muted-foreground font-mono font-normal">Date: {loan.requestDate}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground">
                          ₹{loan.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          {loan.tenureMonths} Mos @ {loan.interestRate}%
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-primary">
                          ₹{loan.monthlyEmi.toLocaleString('en-IN')}/mo
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{loan.outstandingBalance.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          {getStatusBadge(loan.status)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const formType = loan.status === 'pending' ? 'Loan Request Form'
                                : loan.status === 'rejected' ? 'Loan Rejection Form'
                                : loan.status === 'active' || loan.status === 'approved' ? 'Loan Disbursement Form'
                                : 'Loan Approval Form';
                              setActivePrintLoan({ loan, formType });
                            }}
                            className="text-[11px] font-bold h-7 px-2.5 gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <FileText className="w-3.5 h-3.5" /> Form
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}
                            className="text-xs text-primary font-bold h-7 px-2"
                          >
                            {expandedId === loan.id ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                            {expandedId === loan.id ? 'Hide' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expandedId === loan.id && (
                        <TableRow className="bg-muted/30 border-b border-border/60">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-2 text-xs">
                              <div className="font-bold text-foreground">Repayment Schedule Details ({loan.tenureMonths} Months):</div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-card rounded-md border border-border/60">
                                  <span className="text-muted-foreground text-[10px] block">Tenure:</span>
                                  <strong className="text-foreground">{loan.tenureMonths} Months</strong>
                                </div>
                                <div className="p-2 bg-card rounded-md border border-border/60">
                                  <span className="text-muted-foreground text-[10px] block">Interest Rate:</span>
                                  <strong className="text-foreground">{loan.interestRate}%</strong>
                                </div>
                                <div className="p-2 bg-card rounded-md border border-border/60">
                                  <span className="text-muted-foreground text-[10px] block">Method:</span>
                                  <strong className="text-foreground capitalize">{loan.repaymentOption ? loan.repaymentOption.replace('_', ' ') : 'Salary Deduction'}</strong>
                                </div>
                              </div>
                              {loan.reason && (
                                <div className="text-muted-foreground italic text-[11px] bg-muted/40 p-2 rounded-md border border-border/50">Reason: "{loan.reason}"</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Printable Stage Form Modal */}
      {activePrintLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{activePrintLoan.formType}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Official HRMS Enterprise Document Voucher</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePrintLoan(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Letterhead Body */}
            <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 space-y-4 text-xs font-serif">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-sans">APPONEXT HRMS ENTERPRISE</h4>
                  <p className="text-[10px] text-slate-500 font-sans">Human Resources & Financial Operations Department</p>
                </div>
                <div className="text-right font-sans">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    REF #{activePrintLoan.loan.id}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">Date: {activePrintLoan.loan.requestDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-sans text-xs pt-1">
                <div><span className="text-slate-500 font-semibold">Employee Name:</span> <strong className="block text-slate-900 dark:text-slate-100">{user?.firstName || 'Employee'} {user?.lastName || ''}</strong></div>
                <div><span className="text-slate-500 font-semibold">Employee Code:</span> <strong className="block text-slate-900 dark:text-slate-100">{(user as any)?.employeeCode || 'EMP-104'}</strong></div>
                <div><span className="text-slate-500 font-semibold">Loan Category:</span> <strong className="block text-slate-900 dark:text-slate-100">{activePrintLoan.loan.loanType}</strong></div>
                <div><span className="text-slate-500 font-semibold">Sanction Amount:</span> <strong className="block text-emerald-600 font-extrabold font-mono text-sm">₹{activePrintLoan.loan.amount.toLocaleString('en-IN')}</strong></div>
                <div><span className="text-slate-500 font-semibold">Repayment Tenure:</span> <strong className="block text-slate-900 dark:text-slate-100">{activePrintLoan.loan.tenureMonths} Months ({activePrintLoan.loan.interestRate}% p.a.)</strong></div>
                <div><span className="text-slate-500 font-semibold">Monthly EMI:</span> <strong className="block text-indigo-600 font-extrabold font-mono text-sm">₹{activePrintLoan.loan.monthlyEmi.toLocaleString('en-IN')}/mo</strong></div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 font-sans space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Justification & Remarks:</span>
                <p className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic text-xs">
                  "{activePrintLoan.loan.reason || 'Personal Financial Assistance'}"
                </p>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 text-[10px] font-sans border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="h-8 border-b border-slate-300 dark:border-slate-700"></div>
                  <span className="font-bold text-slate-600 dark:text-slate-400">Employee Signature</span>
                </div>
                <div className="text-right">
                  <div className="h-8 border-b border-slate-300 dark:border-slate-700"></div>
                  <span className="font-bold text-slate-600 dark:text-slate-400">HR & Finance Officer Authorization</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400 font-bold">Status: {activePrintLoan.loan.status.toUpperCase()}</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="font-bold text-xs gap-1.5 h-8"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Voucher
                </Button>
                <Button
                  type="button"
                  onClick={() => setActivePrintLoan(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
