import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Receipt, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensePage() {
  const [claims, setClaims] = useState([
    { id: 1, date: '2026-07-18', category: 'Travel Reimbursement', description: 'Client meeting travel in Pune', amount: '₹1,250', status: 'Approved' },
    { id: 2, date: '2026-07-10', category: 'Internet Allowance', description: 'July broadbrand bills', amount: '₹800', status: 'Pending' },
  ]);

  const [form, setForm] = useState({
    category: 'Travel Reimbursement',
    amount: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) {
      toast.error('Please input claim amount and reason.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setHistoryClaims([
      {
        id: claims.length + 1,
        date: today,
        category: form.category,
        description: form.description,
        amount: `₹${form.amount}`,
        status: 'Pending',
      },
      ...claims,
    ]);

    toast.success('Expense claim submitted for approval.');
    setForm({ category: 'Travel Reimbursement', amount: '', description: '' });
  };

  const setHistoryClaims = (nextClaims: any) => {
    setClaims(nextClaims);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Expense & Reimbursement</h2>
          <p className="text-xs text-muted-foreground">Submit and track your internet, travel, or device expense claims.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-violet-500" /> New Expense Claim
              </CardTitle>
              <CardDescription>Enter details and upload proof receipts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="category">Claim Category</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Travel Reimbursement">Travel Reimbursement</option>
                    <option value="Internet Allowance">Internet Allowance</option>
                    <option value="Device Purchase">Device Purchase</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amount">Claim Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    required
                    placeholder="E.g., 1500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc">Description / Justification</Label>
                  <textarea
                    id="desc"
                    rows={3}
                    required
                    placeholder="State details of expense..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Upload Receipt Receipt (Optional)</Label>
                  <div className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-violet-600 transition-colors">
                    <span className="text-xs text-muted-foreground block">Drop receipt files here</span>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Plus className="w-4 h-4" /> Submit Claim
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Claim History List */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-violet-500" /> Claims History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Submission Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{c.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{c.category}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{c.amount}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'Approved' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>{c.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
