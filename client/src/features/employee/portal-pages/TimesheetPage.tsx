import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Plus, BarChart2, BookOpen, Briefcase, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TimesheetEntry {
  id: number;
  date: string;
  project: string;
  task: string;
  hours: number;
}

export default function TimesheetPage() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    { id: 1, date: '2026-07-22', project: 'HRMS Development', task: 'Created Employee Portal templates', hours: 6 },
    { id: 2, date: '2026-07-22', project: 'Internal Sync', task: 'Daily Scrum meeting', hours: 2 },
    { id: 3, date: '2026-07-21', project: 'HRMS Development', task: 'Fixed login API authentication & CORS', hours: 8 },
  ]);

  const [form, setForm] = useState({
    project: 'HRMS Development',
    task: '',
    hours: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.task || !form.hours) {
      toast.error('Task details and hours worked are required.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setEntries([
      {
        id: entries.length + 1,
        date: today,
        project: form.project,
        task: form.task,
        hours: parseFloat(form.hours),
      },
      ...entries,
    ]);
    toast.success('Timesheet entry logged successfully.');
    setForm({ project: 'HRMS Development', task: '', hours: '' });
  };

  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const weekRequired = 40;
  const pct = Math.min(100, Math.round((totalHours / weekRequired) * 100));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Timesheet / Daily Work Log
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track daily hours spent on projects and task details.
          </p>
        </div>

        {/* Hours Progress Summary */}
        <div className="flex flex-col gap-1 shrink-0 min-w-[180px]">
          <div className="flex justify-between items-center text-xs font-bold text-foreground">
            <span className="text-muted-foreground">Logged this week:</span>
            <span>{totalHours} / {weekRequired} hrs</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold text-right">{pct}% of weekly target</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Logged</p>
              <p className="text-xl font-black text-primary mt-0.5">{totalHours} <span className="text-xs text-muted-foreground font-normal">hrs</span></p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Clock className="w-4 h-4" /></div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weekly Target</p>
              <p className="text-xl font-black text-foreground mt-0.5">{weekRequired} <span className="text-xs text-muted-foreground font-normal">hrs</span></p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/60 text-muted-foreground"><BarChart2 className="w-4 h-4" /></div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Log Entries</p>
              <p className="text-xl font-black text-foreground mt-0.5">{entries.length} <span className="text-xs text-muted-foreground font-normal">tasks</span></p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Briefcase className="w-4 h-4" /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Log Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="w-4 h-4 text-primary" /> Log New Task
              </CardTitle>
              <CardDescription className="text-xs">Submit task details and duration.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="project" className="text-xs font-bold text-foreground">Project</Label>
                  <select
                    id="project"
                    className="flex h-9 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                  >
                    <option value="HRMS Development">HRMS Development</option>
                    <option value="Client Training Support">Client Training Support</option>
                    <option value="Internal Sync">Internal Sync</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hours" className="text-xs font-bold text-foreground">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    placeholder="E.g., 4"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="h-9 text-xs rounded-lg border-border bg-muted/50 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="task" className="text-xs font-bold text-foreground">Task / Description</Label>
                  <textarea
                    id="task"
                    rows={3}
                    required
                    placeholder="What did you work on today?"
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-medium"
                    value={form.task}
                    onChange={(e) => setForm({ ...form, task: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 rounded-lg gap-1.5 shadow-2xs">
                  <Plus className="w-3.5 h-3.5" /> Save Log Entry
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Logs Table */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Logged Tasks</CardTitle>
                <CardDescription className="text-xs">{entries.length} task entries recorded</CardDescription>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">{totalHours} hrs total</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Project</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Task</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                      <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{entry.date}</TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">{entry.project}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{entry.task}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground text-right">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px]">{entry.hours} hrs</span>
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
