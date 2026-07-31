import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Receipt, CheckCircle2, Clock, UploadCloud, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseClaim {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: string;
  rawAmount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export default function ExpensePage() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([
    { id: 1, date: '2026-07-18', category: 'Travel Reimbursement', description: 'Client meeting travel in Pune', amount: '₹1,250', rawAmount: 1250, status: 'Approved' },
    { id: 2, date: '2026-07-10', category: 'Internet Allowance', description: 'July broadband bills', amount: '₹800', rawAmount: 800, status: 'Pending' },
  ]);

  const [form, setForm] = useState({
    category: 'Travel Reimbursement',
    amount: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) {
      toast.error('Please enter claim amount and description.');
      return;
    }

    const numAmount = parseFloat(form.amount) || 0;
    const today = new Date().toISOString().split('T')[0];
    const newClaim: ExpenseClaim = {
      id: claims.length + 1,
      date: today,
      category: form.category,
      description: form.description,
      amount: `₹${numAmount.toLocaleString('en-IN')}`,
      rawAmount: numAmount,
      status: 'Pending',
    };

    setClaims([newClaim, ...claims]);
    toast.success('Expense claim submitted for approval.');
    setForm({ category: 'Travel Reimbursement', amount: '', description: '' });
  };

  const totalClaimed = claims.reduce((acc, curr) => acc + curr.rawAmount, 0);
  const pendingCount = claims.filter(c => c.status === 'Pending').length;
  const approvedAmount = claims.filter(c => c.status === 'Approved').reduce((acc, curr) => acc + curr.rawAmount, 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" /> Expense Claims & Reimbursement
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Reimbursements
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit and track your official travel, internet, hardware or utility expense claims.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Claimed</p>
              <p className="text-xl font-black text-foreground mt-0.5">₹{totalClaimed.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Amount</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{approvedAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Claims</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Claim Application Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Receipt className="w-4 h-4 text-primary" /> Submit Expense Claim
              </CardTitle>
              <CardDescription className="text-xs">Enter details and upload proof receipts.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs font-bold text-foreground">Claim Category</Label>
                  <select
                    id="category"
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Travel Reimbursement">Travel Reimbursement</option>
                    <option value="Internet Allowance">Internet Allowance</option>
                    <option value="Device Purchase">Device Purchase</option>
                    <option value="Client Entertainment">Client Entertainment</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amount" className="text-xs font-bold text-foreground">Claim Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    required
                    placeholder="E.g., 1500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc" className="text-xs font-bold text-foreground">Description / Justification</Label>
                  <textarea
                    id="desc"
                    rows={3}
                    required
                    placeholder="State details of expense..."
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Attach Receipt (Optional)</Label>
                  <div className="border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 rounded-lg p-3 text-center cursor-pointer transition-colors flex flex-col items-center gap-1">
                    <UploadCloud className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-medium">Click or drag receipt file to upload</span>
                  </div>
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Submit Claim
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: History Table */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-primary" /> Claims History
                </CardTitle>
                <CardDescription className="text-xs">{claims.length} submitted claim records</CardDescription>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border font-bold">
                Total: ₹{totalClaimed.toLocaleString('en-IN')}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {claims.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Receipt className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-bold text-foreground">No claims submitted yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Category</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Description</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Amount</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                        <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{c.date}</TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px]">
                            {c.category}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[180px] truncate">{c.description}</TableCell>
                        <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground">{c.amount}</TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            c.status === 'Approved' 
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                              : c.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {c.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
