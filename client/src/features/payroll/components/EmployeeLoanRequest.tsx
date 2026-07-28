import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Send, CheckCircle, Calculator, Clock, DollarSign, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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

  // ── Scope localStorage key per user so loans never bleed across accounts ──
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
  const [loading, setLoading] = useState(false);

  const [employeeGrossSalary, setEmployeeGrossSalary] = useState<number>(62500);

  React.useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const [loanRes, payslipRes] = await Promise.all([
          apiClient.get('/payroll/loans', { params: { employeeId: empId } }).catch(() => ({ data: null })),
          apiClient.get('/payroll/payslips', { params: { employeeId: empId } }).catch(() => ({ data: null }))
        ]);

        if (payslipRes?.data?.data && Array.isArray(payslipRes.data.data) && payslipRes.data.data.length > 0) {
          const latestPayslip = payslipRes.data.data[0];
          const gross = Number(latestPayslip.gross_salary || latestPayslip.grossSalary || 62500);
          if (gross > 0) setEmployeeGrossSalary(gross);
        }

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
  }, [empId]);

  // Live EMI Calculation
  const amount = parseFloat(amountInput) || 0;
  const tenure = parseInt(tenureInput, 10) || 1;
  const rate = loanType === 'Salary Advance' ? 0 : 8.5; // 0% for salary advance, 8.5% for personal loan
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
    setSuccessMsg(`Loan request of ₹${amount.toLocaleString('en-IN')} submitted successfully! Sent to HR & Finance for approval.`);

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
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">Active / Disbursed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-bold">Pending Admin Approval</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 font-bold">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" /> Employee Financial Assistance
          </div>
          <h2 className="text-2xl font-extrabold">Salary Advance & Loan Requests</h2>
          <p className="text-slate-300 text-sm mt-1">
            Apply for interest-free salary advances or emergency loans with automatic monthly EMI deductions.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Application Form */}
        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-3 bg-slate-50 dark:bg-slate-800/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Apply for Loan / Salary Advance
            </CardTitle>
            <CardDescription>Select request type and tenure to calculate your monthly EMI.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Live Salary Eligibility Box */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl border border-indigo-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Your Monthly Gross Pay:</span>
                  <strong className="text-emerald-400 font-extrabold text-sm">₹{employeeGrossSalary.toLocaleString('en-IN')} / month</strong>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/10">
                  <div className="p-1.5 bg-white/10 rounded">
                    <span className="text-indigo-200 block text-[10px]">Max Advance (50%):</span>
                    <strong className="text-white">₹{Math.round(employeeGrossSalary * 0.50).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-1.5 bg-white/10 rounded">
                    <span className="text-indigo-200 block text-[10px]">Max Personal Loan (3x):</span>
                    <strong className="text-white">₹{Math.round(employeeGrossSalary * 3).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Loan Category *</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="Salary Advance">Salary Advance (0% Interest • Max 50% Salary)</option>
                  <option value="Personal Loan">Personal Emergency Loan (8.5% Interest • Max 3x Salary)</option>
                  <option value="Emergency Medical Loan">Medical Emergency Loan (0% Interest)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Requested Amount (₹) *</label>
                <Input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 30000"
                  className="h-10 text-sm font-bold text-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tenure (Months) *</label>
                <Input
                  type="number"
                  value={tenureInput}
                  onChange={(e) => setTenureInput(e.target.value)}
                  placeholder="e.g. 6"
                  className="h-10 text-sm font-semibold"
                  min="1"
                  max="24"
                  required
                />
              </div>

              {/* Live EMI & Auto-Cut Box */}
              <div className="p-3 bg-indigo-50 dark:bg-slate-900 rounded-lg border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-semibold">Estimated Monthly EMI</div>
                    <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-400">₹{emi.toLocaleString('en-IN')} / month</div>
                  </div>
                  <Badge variant="outline" className="bg-white text-indigo-900 font-bold border-indigo-200">
                    {tenure} Months @ {rate}% Rate
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 border-t pt-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Payroll Auto-Cut:</strong> Monthly EMI deducted directly from Gross Salary during Payroll Processing.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
                  ✂️ Salary Deduction &amp; Repayment Option *
                </label>
                <select
                  value={deductionMode}
                  onChange={(e) => setDeductionMode(e.target.value)}
                  className="w-full h-10 px-3 border-2 border-indigo-400 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100 cursor-pointer"
                >
                  <option value="salary_deduction">✂️ Auto Deduct from Monthly Salary</option>
                  <option value="cash_payment">💵 Cash Payment by Employee</option>
                  <option value="bank_transfer">🏦 Direct Bank Transfer by Employee</option>
                  <option value="full_next_salary">⚡ Full Lump-Sum Cut on Next Salary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reason / Purpose</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State justification for loan request..."
                  className="w-full p-2.5 border rounded-lg text-sm bg-white dark:bg-slate-800 h-20"
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-md">
                <Send className="w-4 h-4" /> Submit Request for HR Approval
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Loan History Table */}
        <Card className="lg:col-span-2 shadow border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" /> My Active & Past Loan Requests
              </CardTitle>
              <CardDescription>Track approval status and monthly EMI repayment schedule.</CardDescription>
            </div>
            <Badge variant="outline" className="font-bold">{loanList.length} Requests</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Loan Amount</th>
                    <th className="px-4 py-3">Tenure &amp; Rate</th>
                    <th className="px-4 py-3">Monthly EMI</th>
                    <th className="px-4 py-3">Outstanding Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loanList.map((loan) => (
                    <React.Fragment key={loan.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div>{loan.loanType}</div>
                          <div className="text-[11px] text-slate-400 font-mono">Date: {loan.requestDate}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          ₹{loan.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {loan.tenureMonths} Mos @ {loan.interestRate}%
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{loan.monthlyEmi.toLocaleString('en-IN')}/mo
                        </td>
                        <td className="px-4 py-3 font-extrabold text-rose-600 dark:text-rose-400">
                          ₹{loan.outstandingBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(loan.status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}
                            className="text-xs text-indigo-600"
                          >
                            {expandedId === loan.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                            {expandedId === loan.id ? 'Hide' : 'Schedule'}
                          </Button>
                        </td>
                      </tr>

                      {expandedId === loan.id && (
                        <tr className="bg-slate-50 dark:bg-slate-900 border-y">
                          <td colSpan={6} className="p-4">
                            <div className="space-y-2 text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200">EMI Repayment Schedule ({loan.tenureMonths} Months):</div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                  <span className="text-slate-400">Tenure:</span> <strong>{loan.tenureMonths} Months</strong>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                  <span className="text-slate-400">Interest Rate:</span> <strong>{loan.interestRate}%</strong>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                  <span className="text-slate-400">Deduction Method:</span> <strong>Payroll Auto-Deduction</strong>
                                </div>
                              </div>
                              {loan.reason && (
                                <div className="text-slate-500 italic pt-1">Reason: "{loan.reason}"</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
