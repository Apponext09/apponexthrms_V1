import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Plus, Calendar, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function TrainingPage() {
  const [trainings, setTrainings] = useState([
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
        budget: `₹${form.budget}`,
      },
      ...trainings,
    ]);

    toast.success('Training budget request submitted.');
    setForm({ name: '', provider: '', budget: '' });
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Training & Certifications</h2>
          <p className="text-xs text-muted-foreground">Register for technical bootcamps or request professional certification training budgets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Budget */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Star className="w-4.5 h-4.5 text-violet-500" /> Request Training Budget
              </CardTitle>
              <CardDescription>File requests for external courses and exam vouchers.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="tName">Course / Exam Name</Label>
                  <Input
                    id="tName"
                    placeholder="E.g., Certified Kubernetes Admin"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tProvider">Training Provider</Label>
                  <Input
                    id="tProvider"
                    placeholder="E.g., Linux Foundation, Udemy"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tBudget">Estimated Budget (₹)</Label>
                  <Input
                    id="tBudget"
                    type="number"
                    placeholder="E.g., 15000"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Plus className="w-4 h-4" /> Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Training List */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-violet-500" /> Active Certifications & Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Training Name</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Provider</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Estimated Budget</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{t.name}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{t.provider}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{t.budget}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Approved' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>{t.status}</span>
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
