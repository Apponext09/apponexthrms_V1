import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, IndianRupee, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function LoanRequestPage() {
  const [loans, setLoans] = useState([
    { id: 1, date: '2026-06-01', amount: '₹50,000', type: 'Salary Advance', emi: '₹10,000 x 5 months', status: 'Active' },
  ]);

  const [form, setForm] = useState({
    amount: '',
    tenure: '3',
    reason: '',
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.reason) {
      toast.error('Please input request amount and reason.');
      return;
    }

    const calculatedEmi = Math.round(parseFloat(form.amount) / parseInt(form.tenure));

    setLoans([
      {
        id: loans.length + 1,
        date: new Date().toISOString().split('T')[0],
        amount: `₹${form.amount}`,
        type: 'Salary Advance',
        emi: `₹${calculatedEmi} x ${form.tenure} months`,
        status: 'Pending',
      },
      ...loans,
    ]);

    toast.success('Salary advance request submitted.');
    setForm({ amount: '', tenure: '3', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Salary Advance & Loans</h2>
        <p className="text-xs text-muted-foreground">Calculate interest-free salary advances or apply for company welfare loans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Calculator & Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IndianRupee className="w-4.5 h-4.5 text-violet-500" /> Apply Salary Advance
              </CardTitle>
              <CardDescription>Calculate EMI and file a welfare loan request.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApply} className="space-y-4">
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
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reason">Reason / Emergency Cause</Label>
                  <textarea
                    id="reason"
                    rows={3}
                    placeholder="Medical, family expense, etc..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold">
                  Apply Request
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Applied Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Loan Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Repayment terms</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{l.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{l.amount}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{l.emi}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>{l.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="bg-muted/40 p-4 rounded-xl border flex gap-3 text-xs text-muted-foreground">
            <Percent className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground">Interest-Free Welfare Policy</h4>
              <p className="leading-relaxed mt-1">
                Apponext HRMS provides interest-free salary advances up to 1 month's basic pay for employee welfare. Repayments are directly deducted from monthly payroll cycles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
