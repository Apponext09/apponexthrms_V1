import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface ApprovalItem {
  id: string;
  realId: number;
  applicant: string;
  type: string;
  details: string;
  date: string;
  category: 'regularization' | 'leave' | 'swap';
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllApprovals = async () => {
    setLoading(true);
    const combined: ApprovalItem[] = [];

    // 1. Shift Swaps
    try {
      const res = await apiClient.get('/attendance/shift-swap-requests/approvals?status=PENDING');
      const swaps = res.data?.data || [];
      swaps.forEach((s: any) => {
        combined.push({
          id: `swap-${s.id}`,
          realId: s.id,
          applicant: `${s.requesterFirstName || ''} ${s.requesterLastName || ''}`.trim() || `Employee #${s.requesterId || s.employeeId || s.id}`,
          type: 'Shift Swap Request',
          details: `Swap ${s.requestedShiftName || 'Shift'} (${new Date(s.requestShiftDate).toLocaleDateString()}) with ${s.swapShiftName || 'Shift'} (${new Date(s.swapShiftDate).toLocaleDateString()})`,
          date: s.requestShiftDate ? String(s.requestShiftDate).split('T')[0] : '--',
          category: 'swap',
        });
      });
    } catch (err) {
      console.warn('Failed to fetch swap approvals', err);
    }

    // 2. Attendance Regularizations
    try {
      const [mgrRes, hrRes] = await Promise.allSettled([
        apiClient.get('/attendance/regularization/manager-pending'),
        apiClient.get('/attendance/regularization/hr-pending'),
      ]);

      const seenRegIds = new Set<number>();
      const addRegItems = (items: any[]) => {
        items.forEach((r: any) => {
          if (seenRegIds.has(r.id)) return;
          seenRegIds.add(r.id);

          const empName = `${r.employee_first_name || r.employeeFirstName || ''} ${r.employee_last_name || r.employeeLastName || ''}`.trim() || `Employee #${r.employee_id || r.employeeId || r.id}`;
          const dateStr = r.request_date || r.requestDate ? String(r.request_date || r.requestDate).split('T')[0] : '--';
          const reason = r.reason || 'Attendance Correction';
          const comment = r.comment ? ` - ${r.comment}` : '';

          combined.push({
            id: `reg-${r.id}`,
            realId: r.id,
            applicant: empName,
            type: 'Attendance Regularization',
            details: `Date: ${dateStr} (${reason})${comment}`,
            date: dateStr,
            category: 'regularization',
          });
        });
      };

      if (mgrRes.status === 'fulfilled' && Array.isArray(mgrRes.value.data?.data)) {
        addRegItems(mgrRes.value.data.data);
      }
      if (hrRes.status === 'fulfilled' && Array.isArray(hrRes.value.data?.data)) {
        addRegItems(hrRes.value.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch regularization approvals', err);
    }

    // 3. Leave Applications
    try {
      const res = await apiClient.get('/leaves/approvals/pending');
      const leaves = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      leaves.forEach((l: any) => {
        const empName = `${l.employee_first_name || l.employeeFirstName || l.applicant_name || l.applicant || ''} ${l.employee_last_name || l.employeeLastName || ''}`.trim() || `Employee #${l.employee_id || l.employeeId || l.id}`;
        const startDate = l.start_date || l.startDate ? String(l.start_date || l.startDate).split('T')[0] : '--';
        const endDate = l.end_date || l.endDate ? String(l.end_date || l.endDate).split('T')[0] : startDate;
        const leaveType = l.leave_type_name || l.leaveTypeName || l.type || 'Leave';
        const reason = l.reason ? ` (${l.reason})` : '';

        combined.push({
          id: `leave-${l.id}`,
          realId: l.id,
          applicant: empName,
          type: 'Leave Application',
          details: `${leaveType} (${startDate} to ${endDate})${reason}`,
          date: startDate,
          category: 'leave',
        });
      });
    } catch (err) {
      console.warn('Failed to fetch leave approvals', err);
    }

    setApprovals(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllApprovals();
  }, []);

  const handleAction = async (item: ApprovalItem, actionType: 'Approved' | 'Rejected') => {
    try {
      if (item.category === 'swap') {
        const action = actionType === 'Approved' ? 'approve' : 'reject';
        await apiClient.post(`/attendance/shift-swaps/${item.realId}/${action}`, { reason: 'Actioned from Approvals page' });
        toast.success(`Shift Swap Request ${actionType.toLowerCase()} successfully.`);
      } else if (item.category === 'regularization') {
        const isApprove = actionType === 'Approved';
        try {
          const endpoint = isApprove ? `/attendance/regularization/${item.realId}/manager-approve` : `/attendance/regularization/${item.realId}/manager-reject`;
          await apiClient.post(endpoint, { comments: `Actioned as ${actionType} from Approvals Page` });
        } catch {
          // Fallback to HR endpoint if manager endpoint is not applicable
          const hrEndpoint = isApprove ? `/attendance/regularization/${item.realId}/hr-approve` : `/attendance/regularization/${item.realId}/hr-reject`;
          await apiClient.post(hrEndpoint, { comments: `Actioned as ${actionType} from Approvals Page` });
        }
        toast.success(`Attendance Regularization Request ${actionType.toLowerCase()} successfully.`);
      } else if (item.category === 'leave') {
        const isApprove = actionType === 'Approved';
        const endpoint = isApprove ? `/leaves/approvals/${item.realId}/approve` : `/leaves/approvals/${item.realId}/reject`;
        await apiClient.post(endpoint, { comments: `Actioned as ${actionType} from Approvals Page` });
        toast.success(`Leave Application ${actionType.toLowerCase()} successfully.`);
      }

      setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      fetchAllApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to process request action`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> My Approvals
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">
              {approvals.length} Pending
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage and action team requests for attendance regularization, leaves, and shift swaps.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAllApprovals}
          className="gap-1.5 text-xs font-bold rounded-xl border-border/80 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-primary" /> Pending Approval Queue
            </CardTitle>
            <CardDescription className="text-xs">Action each request to approve or reject.</CardDescription>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-0">
          {approvals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Applicant</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Request Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                    <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{a.applicant}</TableCell>
                    <TableCell className="px-4 py-3 text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          a.category === 'regularization'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : a.category === 'leave'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[280px] truncate">{a.details}</TableCell>
                    <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">{a.date}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(a, 'Approved')}
                          className="h-7 px-2.5 text-xs font-bold hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 rounded-lg"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(a, 'Rejected')}
                          className="h-7 px-2.5 text-xs font-bold hover:text-rose-600 hover:bg-rose-500/10 gap-1 rounded-lg"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="p-3.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">No pending approval requests at this time.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
