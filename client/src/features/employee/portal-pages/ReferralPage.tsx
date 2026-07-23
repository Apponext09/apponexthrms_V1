import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Plus, Users, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralPage() {
  const [referrals, setReferrals] = useState([
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
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Employee Referral</h2>
        <p className="text-xs text-muted-foreground">Refer your friends for open positions and earn cash referral rewards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Refer Candidate */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Send className="w-4.5 h-4.5 text-violet-500" /> Refer Candidate
              </CardTitle>
              <CardDescription>Submit resume information for review.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="candName">Candidate Full Name</Label>
                  <Input
                    id="candName"
                    placeholder="E.g., Nilesh Patil"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candEmail">Candidate Email</Label>
                  <Input
                    id="candEmail"
                    type="email"
                    placeholder="E.g., nilesh@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="candRole">Referred Position</Label>
                  <select
                    id="candRole"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="Senior React Developer">Senior React Developer</option>
                    <option value="DevOps Lead">DevOps Lead</option>
                    <option value="QA Specialist">QA Specialist</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Plus className="w-4 h-4" /> Submit Candidate
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
                <Users className="w-4.5 h-4.5 text-violet-500" /> Referral Pipeline Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Candidate</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Referred Position</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Reward Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{r.name}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{r.role}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{r.reward}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Hired' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>{r.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="bg-muted/40 p-4 rounded-xl border flex gap-3 text-xs text-muted-foreground">
            <Gift className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-foreground">Earn Referral Bonus!</h4>
              <p className="leading-relaxed mt-1">
                You will be rewarded a bonus of ₹25,000 for each technical referral successfully hired and completed the 3-month probation period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
