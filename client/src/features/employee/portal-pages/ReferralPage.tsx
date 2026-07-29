import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Gift, Plus, Users, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ReferralItem {
  id: number;
  name: string;
  role: string;
  date: string;
  status: 'Hired' | 'Resume Screen' | 'Interview' | 'Rejected';
  reward: string;
}

export default function ReferralPage() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([
    { id: 1, name: 'Sanjay Deshmukh', role: 'Fullstack Engineer', date: '2026-07-15', status: 'Hired', reward: '₹25,000' },
  ]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Senior React Developer',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Candidate name and email are required.');
      return;
    }

    setReferrals([
      {
        id: referrals.length + 1,
        name: form.name,
        role: form.role,
        date: new Date().toISOString().split('T')[0],
        status: 'Resume Screen',
        reward: 'Pending',
      },
      ...referrals,
    ]);

    toast.success(`Referral submitted for ${form.name}.`);
    setForm({ name: '', email: '', role: 'Senior React Developer' });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" /> Employee Referrals
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Rewards
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Refer your friends and colleagues for open positions to earn cash rewards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Refer Candidate Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Send className="w-4 h-4 text-primary" /> Refer Candidate
              </CardTitle>
              <CardDescription className="text-xs">Submit candidate contact info for review.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="candName" className="text-xs font-bold text-foreground">Candidate Full Name</Label>
                  <Input
                    id="candName"
                    placeholder="E.g., Nilesh Patil"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candEmail" className="text-xs font-bold text-foreground">Candidate Email</Label>
                  <Input
                    id="candEmail"
                    type="email"
                    placeholder="E.g., nilesh@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candRole" className="text-xs font-bold text-foreground">Referred Position</Label>
                  <select
                    id="candRole"
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="Senior React Developer">Senior React Developer</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="QA Specialist">QA Specialist</option>
                  </select>
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Submit Candidate
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Applied History & Reward Note */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-primary" /> Referral Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Candidate</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Position</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Reward</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{r.name}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                          {r.role}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.reward}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          r.status === 'Hired' 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-3 text-xs">
            <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-foreground">Earn Referral Bonus!</h4>
              <p className="text-muted-foreground leading-relaxed mt-0.5">
                Earn ₹25,000 for each technical referral successfully hired after completing probation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
