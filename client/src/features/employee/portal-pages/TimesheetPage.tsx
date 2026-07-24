import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Plus, BarChart2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function TimesheetPage() {
  const [entries, setEntries] = useState([
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

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Timesheet / Daily Work Log</h2>
          <p className="text-xs text-muted-foreground">Track daily hours spent on projects and task details.</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-muted-foreground bg-muted p-3 rounded-xl border">
          <div className="flex items-center gap-1.5 border-r pr-4">
            <Clock className="w-4 h-4 text-violet-500" />
            <span>Total Logged Hours: <strong className="text-foreground">{totalHours} hrs</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-violet-500" />
            <span>Required: <strong className="text-foreground">40 hrs / week</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Log Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-violet-500" /> Log Task
              </CardTitle>
              <CardDescription>Submit task details and duration.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="project">Project</Label>
                  <select
                    id="project"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                  >
                    <option value="HRMS Development">HRMS Development</option>
                    <option value="Client Training Support">Client Training Support</option>
                    <option value="Internal Sync">Internal Sync</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hours">Hours Worked</Label>
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
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="task">Task / Description</Label>
                  <textarea
                    id="task"
                    rows={3}
                    required
                    placeholder="What did you work on today?"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.task}
                    onChange={(e) => setForm({ ...form, task: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5">
                  <Plus className="w-4 h-4" /> Save Log
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Daily Logs table */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Logged Tasks History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Project</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Task Description</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{entry.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{entry.project}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">{entry.task}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold">{entry.hours} hrs</TableCell>
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
