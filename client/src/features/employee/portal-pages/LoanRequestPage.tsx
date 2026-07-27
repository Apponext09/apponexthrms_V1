import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, IndianRupee, Percent, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLoan } from '@/features/payroll/hooks/useLoan';

export default function LoanRequestPage() {
  const { user } = useAuthStore();
  const empId = user?.employeeId || (user as any)?.employee_id || user?.id;
  const { loans, isLoading, createLoan, isCreating, refetch } = useLoan(empId);

  const [form, setForm] = useState({
    amount: '',
    tenure: '3',
    loanType: 'personal',
    reason: '',
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid loan amount.');
      return;
    }
    if (!form.reason) {
      toast.error('Please state a reason for the loan request.');
      return;
    }

    try {
      await createLoan({
        employeeId: empId,
        loanType: form.loanType || 'personal',
        loanAmount: Number(form.amount),
        loanDate: new Date().toISOString().split('T')[0],
        tenureMonths: Number(form.tenure),
        interestRate: 0,
        reason: form.reason
      });

      toast.success(`Loan request of ₹${form.amount} submitted to ${user?.organizationName || 'Organization'} Admin.`);
      setForm({ amount: '', tenure: '3', loanType: 'personal', reason: '' });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit loan request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Loans & Welfare Requests</h2>
        <p className="text-xs text-muted-foreground">Submit interest-free loans directly to {user?.organizationName || 'your organization'} admin for approval.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Calculator & Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="w-4.5 h-4.5 text-violet-500" /> Apply for Loan
              </CardTitle>
              <CardDescription>Calculate EMI and file a welfare loan request.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="loanType">Loan Type</Label>
                  <select
                    id="loanType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.loanType}
                    onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                  >
                    <option value="personal">Personal Loan</option>
                    <option value="vehicle">Vehicle Loan</option>
                    <option value="home">Home Loan</option>
                    <option value="education">Education Loan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="amount">Required Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="E.g., 30000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tenure">Tenure (Months)</Label>
                  <select
                    id="tenure"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.tenure}
                    onChange={(e) => setForm({ ...form, tenure: e.target.value })}
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reason">Reason / Purpose</Label>
                  <textarea
                    id="reason"
                    rows={3}
                    placeholder="Medical, family expense, etc..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={isCreating} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Request to Admin
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Applied History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Landmark className="w-4.5 h-4.5 text-violet-500" /> Active & Applied Loans
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading loan requests...</div>
              ) : loans.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No loan requests submitted yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase px-6 py-4">Applied Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-6 py-4">Type</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-6 py-4">Loan Amount</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-6 py-4">Repayment terms</TableHead>
                      <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l: any) => {
                      const amount = l.loan_amount || l.loanAmount || 0;
                      const emiVal = l.emi || 0;
                      const statusVal = l.status ? String(l.status).toLowerCase() : 'active';

                      return (
                        <TableRow key={l.id || l.uuid}>
                          <TableCell className="px-6 py-4 text-xs font-semibold">{l.loan_date || l.loanDate || 'Recent'}</TableCell>
                          <TableCell className="px-6 py-4 text-xs font-medium capitalize">{l.loan_type || l.loanType || 'Personal'}</TableCell>
                          <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">₹{amount.toLocaleString()}</TableCell>
                          <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">₹{emiVal.toLocaleString()} x {l.tenure_months || l.tenureMonths || 3} mos</TableCell>
                          <TableCell className="px-6 py-4 text-xs">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              statusVal === 'active' || statusVal === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : statusVal === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>{statusVal}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="bg-muted/40 p-4 rounded-xl border flex gap-3 text-xs text-muted-foreground">
            <Percent className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground">Interest-Free Welfare Policy</h4>
              <p className="leading-relaxed mt-1">
                Apponext HRMS provides interest-free loans for employee welfare. Submitted loan requests are automatically routed to your organization administrator for approval and payroll deduction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
