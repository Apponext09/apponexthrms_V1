import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, AlertTriangle, FileCheck, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface RegularizationRequest {
  id: number;
  request_date?: string;
  requestDate?: string;
  requested_check_in_time?: string | null;
  requestedCheckInTime?: string | null;
  requested_check_out_time?: string | null;
  requestedCheckOutTime?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function RegularizationPage() {
  const [history, setHistory] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Success Modal Dialog State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<{
    refNo: string;
    date: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  const [form, setForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    reason: '',
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance/regularization');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setHistory(items);
    } catch (err) {
      console.error('Failed to load regularization requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.checkIn || !form.checkOut || !form.reason) {
      toast.error('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/attendance/regularization', {
        date: form.date,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        reason: form.reason,
      });

      if (res.data?.success || res.status === 201) {
        const reqId = res.data?.data?.id || Math.floor(1000 + Math.random() * 9000);
        
        setSuccessData({
          refNo: `#REG-2026-${String(reqId).padStart(4, '0')}`,
          date: form.date,
          checkIn: form.checkIn,
          checkOut: form.checkOut
        });
        
        setIsSuccessModalOpen(true);
        setForm({ date: '', checkIn: '', checkOut: '', reason: '' });
        fetchHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit regularization request');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format ISO Date/Time safely
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '--';
    }
  };

  const formatDateStr = (str: string | undefined) => {
    if (!str) return '';
    if (str.includes('T')) return str.split('T')[0];
    return str;
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-violet-600" /> Attendance Correction & Regularization
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit correction requests for missed punch-in/out, late entry or system synchronization issues.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-1.5 text-xs font-bold rounded-xl">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <FileCheck className="w-4.5 h-4.5 text-violet-500" /> Apply Regularization
              </CardTitle>
              <CardDescription className="text-xs">Select the date and request log corrections.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="regDate" className="text-xs font-bold text-muted-foreground">Date of Correction</Label>
                  <Input
                    id="regDate"
                    type="date"
                    required
                    className="rounded-xl h-11 text-xs font-semibold"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="regIn" className="text-xs font-bold text-muted-foreground">Requested In</Label>
                    <Input
                      id="regIn"
                      type="time"
                      required
                      className="rounded-xl h-11 text-xs font-semibold"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="regOut" className="text-xs font-bold text-muted-foreground">Requested Out</Label>
                    <Input
                      id="regOut"
                      type="time"
                      required
                      className="rounded-xl h-11 text-xs font-semibold"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regReason" className="text-xs font-bold text-muted-foreground">Reason Description</Label>
                  <textarea
                    id="regReason"
                    rows={3}
                    required
                    placeholder="E.g., Out on site duty, Forgot punch card..."
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 text-foreground"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl gap-2 shadow-md">
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Request Tracker */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm bg-card">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <Clock className="w-4.5 h-4.5 text-violet-500" /> Regularization Requests History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                  <p className="text-xs font-bold">Loading history from database...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold">No correction requests submitted yet.</p>
                </div>
              ) : (
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
                    {history.map((h) => {
                      const dateVal = h.requestDate || h.request_date;
                      const checkInVal = h.requestedCheckInTime || h.requested_check_in_time;
                      const checkOutVal = h.requestedCheckOutTime || h.requested_check_out_time;

                      return (
                        <TableRow key={h.id} className="hover:bg-muted/30">
                          <TableCell className="px-6 py-4 text-xs font-bold text-foreground">
                            {formatDateStr(dateVal)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                            {formatTime(checkInVal)} to {formatTime(checkOutVal)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs text-muted-foreground font-semibold">
                            {h.reason}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black capitalize ${
                              h.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : h.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                              {h.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Confirmation Modal Popup Dialog */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border bg-card shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-1.5 justify-center">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" /> Request Submitted Successfully!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Your attendance regularization request has been successfully recorded in the central database.
              </DialogDescription>
            </DialogHeader>
          </div>

          {successData && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-bold uppercase tracking-wider">Reference ID:</span>
                <span className="font-mono font-black text-violet-600 dark:text-violet-400">{successData.refNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Correction Date:</span>
                <span className="font-black text-foreground">{successData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Punch Time Slot:</span>
                <span className="font-mono font-black text-foreground">
                  {successData.checkIn} to {successData.checkOut}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">Approval Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  Pending Review
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl py-5"
            >
              Back to Regularization Panel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
