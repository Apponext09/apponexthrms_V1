import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, AlertTriangle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function RegularizationPage() {
  const [history, setHistory] = useState([
    { id: 1, date: '2026-07-15', actualIn: '--', actualOut: '--', requestedIn: '09:00 AM', requestedOut: '06:00 PM', status: 'Approved', reason: 'System punch issue' },
    { id: 2, date: '2026-07-10', actualIn: '11:30 AM', actualOut: '06:00 PM', requestedIn: '09:00 AM', requestedOut: '06:00 PM', status: 'Pending', reason: 'Forgot to punch in' },
  ]);

  const [form, setForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.checkIn || !form.checkOut || !form.reason) {
      toast.error('Please fill in all fields.');
      return;
    }

    setHistory([
      {
        id: history.length + 1,
        date: form.date,
        actualIn: '--',
        actualOut: '--',
        requestedIn: form.checkIn,
        requestedOut: form.checkOut,
        status: 'Pending',
        reason: form.reason,
      },
      ...history,
    ]);

    toast.success('Regularization request submitted.');
    setForm({ date: '', checkIn: '', checkOut: '', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Attendance Regularization</h2>
        <p className="text-xs text-muted-foreground">Request regularizations for missed punches or system sync issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-violet-500" /> Apply Regularization
              </CardTitle>
              <CardDescription>Select the date and request log corrections.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="regDate">Date of Correction</Label>
                  <Input
                    id="regDate"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="regIn">Requested In</Label>
                    <Input
                      id="regIn"
                      type="time"
                      required
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="regOut">Requested Out</Label>
                    <Input
                      id="regOut"
                      type="time"
                      required
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regReason">Reason</Label>
                  <textarea
                    id="regReason"
                    rows={3}
                    required
                    placeholder="E.g., Out on site duty, Forgot card..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold">
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Request Tracker */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-violet-500" /> Regularization Requests History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Correction Time</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Reason</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{h.date}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-medium">{h.requestedIn} to {h.requestedOut}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-muted-foreground">{h.reason}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'Approved' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {h.status}
                        </span>
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
