import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, History, XCircle, Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface ApprovalItem {
  id: number;
  applicant: string;
  type: string;
  details: string;
  date: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSwapRequests = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/attendance/shift-swap-requests/approvals?status=PENDING');
        const swaps = res.data?.data || [];
        
        const mappedSwaps = swaps.map((s: any) => ({
          id: `swap-${s.id}`,
          realId: s.id, // for API calls
          applicant: `${s.requesterFirstName} ${s.requesterLastName}`,
          type: 'Shift Swap Request',
          details: `Swap ${s.requestedShiftName} (${new Date(s.requestShiftDate).toLocaleDateString()}) with your ${s.swapShiftName} (${new Date(s.swapShiftDate).toLocaleDateString()})`,
          date: s.requestShiftDate,
          isSwap: true
        }));

        setApprovals(prev => {
          const nonSwaps = prev.filter(p => !p.isSwap);
          return [...nonSwaps, ...mappedSwaps];
        });
      } catch (err) {
        console.error('Failed to fetch swap approvals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSwapRequests();
  }, []);

  const handleAction = async (item: any, status: 'Approved' | 'Rejected') => {
    if (item.isSwap) {
      try {
        const action = status === 'Approved' ? 'approve' : 'reject';
        await apiClient.post(`/attendance/shift-swaps/${item.realId}/${action}`, { reason: 'Actioned from Approvals page' });
        toast.success(`Shift Swap Request ${status.toLowerCase()} successfully.`);
        setApprovals(prev => prev.filter(a => a.id !== item.id));
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Failed to process request`);
      }
    } else {
      toast.success(`Request ${status} successfully.`);
      setApprovals(prev => prev.filter(a => a.id !== item.id));
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
            Manage and action team requests for leaves, timesheets, and reimbursements.
          </p>
        </div>
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
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground font-medium max-w-[200px] truncate">{a.details}</TableCell>
                    <TableCell className="px-4 py-3 text-xs font-mono text-muted-foreground">{a.date}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(a, 'Approved')}
                          className="h-7 px-2 text-xs font-bold hover:text-emerald-600 hover:bg-emerald-500/10 gap-1 rounded-lg"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(a, 'Rejected')}
                          className="h-7 px-2 text-xs font-bold hover:text-rose-600 hover:bg-rose-500/10 gap-1 rounded-lg"
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
