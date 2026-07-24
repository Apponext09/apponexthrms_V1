import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Plus, FileText, Compass } from 'lucide-react';
import { toast } from 'sonner';

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState([
    { id: 'TKT-102', date: '2026-07-22', category: 'IT Support', subject: 'Macbook charger overheating issue', status: 'In Progress' },
    { id: 'TKT-101', date: '2026-07-15', category: 'HR Queries', subject: 'Clarification regarding health insurance specs', status: 'Resolved' },
  ]);

  const [form, setForm] = useState({
    category: 'IT Support',
    subject: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.description) {
      toast.error('Subject and description are required.');
      return;
    }

    setTickets([
      {
        id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        category: form.category,
        subject: form.subject,
        status: 'Pending',
      },
      ...tickets,
    ]);

    toast.success('Support ticket created successfully.');
    setForm({ category: 'IT Support', subject: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Helpdesk / HR Support Tickets</h2>
          <p className="text-xs text-muted-foreground">Register support queries and track IT or HR issue resolutions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Submission */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-violet-500" /> New Support Ticket
              </CardTitle>
              <CardDescription>Select category and describe the issue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="category">Support Category</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="IT Support">IT Support</option>
                    <option value="HR Queries">HR Queries</option>
                    <option value="Facilities / Access">Facilities / Access</option>
                    <option value="Finance & Payroll">Finance & Payroll</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subj">Subject Summary</Label>
                  <Input
                    id="subj"
                    placeholder="Short description of the issue"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc">Full Description</Label>
                  <textarea
                    id="desc"
                    rows={4}
                    placeholder="Explain the issue in detail..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Plus className="w-4 h-4" /> Create Ticket
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tickets History List */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-violet-500" /> Active Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Ticket ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Subject</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{t.id}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{t.category}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">{t.subject}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Resolved' 
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
