import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar, Palmtree, AlertCircle, PlusCircle, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';

export default function LeavePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [history, setHistory] = useState([
    { id: 1, type: 'Casual Leave', startDate: '2026-08-10', endDate: '2026-08-11', days: 2, status: 'Pending', reason: 'Personal work' },
    { id: 2, type: 'Sick Leave', startDate: '2026-07-05', endDate: '2026-07-05', days: 1, status: 'Approved', reason: 'Fever' },
  ]);

  const [newLeave, setNewLeave] = useState({
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const balances = [
    { name: 'Casual Leave', code: 'CL', balance: 10, total: 12, color: 'text-amber-500 bg-amber-50' },
    { name: 'Sick Leave', code: 'SL', balance: 8, total: 10, color: 'text-emerald-500 bg-emerald-50' },
    { name: 'Earned Leave', code: 'EL', balance: 15, total: 15, color: 'text-violet-500 bg-violet-50' },
    { name: 'Compensatory Off', code: 'CO', balance: 2, total: 2, color: 'text-rose-500 bg-rose-50' },
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
      toast.error('All fields are required.');
      return;
    }

    const start = new Date(newLeave.startDate);
    const end = new Date(newLeave.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const formattedType = newLeave.type === 'casual' ? 'Casual Leave' : newLeave.type === 'sick' ? 'Sick Leave' : 'Earned Leave';

    setHistory([
      {
        id: history.length + 1,
        type: formattedType,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        days: diffDays,
        status: 'Pending',
        reason: newLeave.reason,
      },
      ...history,
    ]);

    toast.success('Leave application submitted successfully.');
    setIsModalOpen(false);
    setNewLeave({ type: 'casual', startDate: '', endDate: '', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-3 border-b">
        <div>
          <h2 className="text-lg font-bold text-foreground">Leave Management</h2>
          <p className="text-xs text-muted-foreground">Monitor leave requests, balance tracking, and history.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5 rounded-xl shadow">
              <PlusCircle className="w-4.5 h-4.5" /> Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-violet-600" /> Apply for Leave
              </DialogTitle>
              <DialogDescription>
                Enter dates and request reasons. Your reporting manager will review it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApply} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="leaveType">Leave Type</Label>
                <select
                  id="leaveType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    required
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reason">Reason / Comments</Label>
                <textarea
                  id="reason"
                  rows={3}
                  required
                  placeholder="State the reason for leave"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-bold">Submit Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balances Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((b) => (
          <Card key={b.name} className="border rounded-2xl shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${b.color}`}>
                {b.code}
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{b.name}</span>
                <span className="text-xl font-extrabold text-foreground mt-0.5 block">{b.balance} / {b.total} Days</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Requests History */}
      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-violet-500" /> Leave Requests History
          </CardTitle>
          <CardDescription>Track the approval status of your current and past leave submissions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Leave Type</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Duration</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Days</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Reason</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{log.type}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-medium">{log.startDate} to {log.endDate}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{log.days} {log.days > 1 ? 'Days' : 'Day'}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{log.reason}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'Approved' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
