import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, LifeBuoy, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  date: string;
  category: string;
  subject: string;
  status: 'In Progress' | 'Resolved' | 'Pending';
}

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([
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

  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const pendingCount = tickets.filter(t => t.status !== 'Resolved').length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary" /> Helpdesk & Support Tickets
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              IT & HR Support
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register support queries and track IT or HR issue resolution status.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Tickets</p>
              <p className="text-xl font-black text-foreground mt-0.5">{tickets.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Open / Pending</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resolved</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{resolvedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket Submission Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Plus className="w-4 h-4 text-primary" /> New Support Ticket
              </CardTitle>
              <CardDescription className="text-xs">Select category and describe the issue.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs font-bold text-foreground">Support Category</Label>
                  <select
                    id="category"
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <Label htmlFor="subj" className="text-xs font-bold text-foreground">Subject Summary</Label>
                  <Input
                    id="subj"
                    placeholder="Short description of the issue"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc" className="text-xs font-bold text-foreground">Full Description</Label>
                  <textarea
                    id="desc"
                    rows={4}
                    placeholder="Explain the issue in detail..."
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Create Ticket
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MessageSquare className="w-4 h-4 text-primary" /> Active Support Tickets
              </CardTitle>
              <CardDescription className="text-xs">{tickets.length} ticket(s) submitted</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Ticket ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Subject</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground">{t.id}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                          {t.category}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[180px] truncate">{t.subject}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : t.status === 'In Progress'
                            ? 'bg-primary/10 text-primary border-primary/20'
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
