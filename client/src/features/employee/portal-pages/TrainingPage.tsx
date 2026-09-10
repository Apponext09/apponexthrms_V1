import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, Calendar, Star, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TrainingRequest {
  id: number;
  name: string;
  provider: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  budget: string;
}

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<TrainingRequest[]>([
    { id: 1, name: 'AWS Cloud Practitioner Certification', provider: 'Amazon Web Services', date: '2026-08-25', status: 'Approved', budget: '₹12,500' },
  ]);

  const [form, setForm] = useState({
    name: '',
    provider: '',
    budget: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.provider || !form.budget) {
      toast.error('All fields are required.');
      return;
    }

    setTrainings([
      {
        id: trainings.length + 1,
        name: form.name,
        provider: form.provider,
        date: '--',
        status: 'Pending',
        budget: `₹${parseFloat(form.budget).toLocaleString('en-IN')}`,
      },
      ...trainings,
    ]);

    toast.success('Training budget request submitted.');
    setForm({ name: '', provider: '', budget: '' });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Training & Certifications
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Workshops
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register for technical bootcamps or request professional certification training budgets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Request Budget Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Star className="w-4 h-4 text-primary" /> Request Training Budget
              </CardTitle>
              <CardDescription className="text-xs">File requests for external courses and exams.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="tName" className="text-xs font-bold text-foreground">Course / Exam Name</Label>
                  <Input
                    id="tName"
                    placeholder="E.g., Certified Kubernetes Admin"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tProvider" className="text-xs font-bold text-foreground">Training Provider</Label>
                  <Input
                    id="tProvider"
                    placeholder="E.g., Linux Foundation, Udemy"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tBudget" className="text-xs font-bold text-foreground">Estimated Budget (₹)</Label>
                  <Input
                    id="tBudget"
                    type="number"
                    placeholder="E.g., 15000"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Training List */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Award className="w-4 h-4 text-primary" /> Active Certifications & Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Training Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Provider</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Estimated Budget</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{t.name}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                          {t.provider}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground">{t.budget}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          t.status === 'Approved' 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {t.status}
                        </Badge>
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
