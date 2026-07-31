import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ClipboardList,
  Loader2,
} from 'lucide-react';
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
          checkOut: form.checkOut,
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

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--';
    }
  };

  const formatDateStr = (str: string | undefined) => {
    if (!str) return '';
    if (str.includes('T')) return str.split('T')[0];
    return str;
  };

  const pendingCount = history.filter(h => h.status === 'pending').length;
  const approvedCount = history.filter(h => h.status === 'approved').length;
  const rejectedCount = history.filter(h => h.status === 'rejected').length;

  return (
    <div className="space-y-5">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" /> Attendance Correction
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Regularization
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit correction requests for missed punch-in/out, late entries or system sync issues.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          className="gap-1.5 text-xs font-bold rounded-lg border-border shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending</p>
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rejected</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{rejectedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Request Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileCheck className="w-4 h-4 text-primary" /> Apply Correction
              </CardTitle>
              <CardDescription className="text-xs">
                Select a date and enter the requested time slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Requests are reviewed by your manager within 24–48 hours. Ensure the times are accurate.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="regDate" className="text-xs font-bold text-foreground">
                    Date of Correction
                  </Label>
                  <Input
                    id="regDate"
                    type="date"
                    required
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="regIn" className="text-xs font-bold text-foreground">
                      Check-In Time
                    </Label>
                    <Input
                      id="regIn"
                      type="time"
                      required
                      className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="regOut" className="text-xs font-bold text-foreground">
                      Check-Out Time
                    </Label>
                    <Input
                      id="regOut"
                      type="time"
                      required
                      className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="regReason" className="text-xs font-bold text-foreground">
                    Reason / Description
                  </Label>
                  <textarea
                    id="regReason"
                    rows={3}
                    required
                    placeholder="E.g., Out on site duty, forgot to punch in..."
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" /> Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: History Table */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <ClipboardList className="w-4 h-4 text-primary" /> Request History
                </CardTitle>
                <CardDescription className="text-xs">
                  {history.length} correction request{history.length !== 1 ? 's' : ''} submitted
                </CardDescription>
              </div>
              {history.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">{pendingCount} pending</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-xs font-bold">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="p-3.5 rounded-full bg-muted/50 text-muted-foreground/50">
                    <FileCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">No requests yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Submit a correction request using the form on the left.
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" /> Check-In
                        </span>
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" /> Check-Out
                        </span>
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Reason</TableHead>
                      <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h) => {
                      const dateVal = h.requestDate || h.request_date;
                      const checkInVal = h.requestedCheckInTime || h.requested_check_in_time;
                      const checkOutVal = h.requestedCheckOutTime || h.requested_check_out_time;

                      return (
                        <TableRow key={h.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                          <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">
                            {formatDateStr(dateVal)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatTime(checkInVal)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatTime(checkOutVal)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[160px] truncate">
                            {h.reason}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold capitalize border ${
                              h.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : h.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
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

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-sm p-5 rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground">
                Request Submitted!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Your attendance correction request has been recorded and is awaiting manager review.
              </DialogDescription>
            </DialogHeader>
          </div>

          {successData && (
            <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/70 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Reference ID</span>
                <span className="font-mono font-black text-primary">{successData.refNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Correction Date</span>
                <span className="font-bold text-foreground">{successData.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Time Slot</span>
                <span className="font-mono font-bold text-foreground">
                  {successData.checkIn} → {successData.checkOut}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-bold">Status</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Pending Review
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={() => setIsSuccessModalOpen(false)}
            className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 rounded-lg"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
