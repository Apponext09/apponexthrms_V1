import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, History, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

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
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Approvals</h2>
          <p className="text-xs text-muted-foreground">Manage and action team requests for leaves, timesheets, and reimbursements.</p>
        </div>
      </div>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-violet-500" /> Pending Approvals Pipeline
          </CardTitle>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-0">
          {approvals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Applicant</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Request Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="px-6 py-4 text-xs font-semibold">{a.applicant}</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{a.type}</TableCell>
                    <TableCell className="px-6 py-4 text-xs text-muted-foreground">{a.details}</TableCell>
                    <TableCell className="px-6 py-4 text-xs text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAction(a, 'Approved')}
                        className="h-8 hover:text-emerald-600 hover:bg-emerald-50 text-xs font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Approve
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAction(a, 'Rejected')}
                        className="h-8 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold"
                      >
                        <XCircle className="w-4 h-4 mr-1 text-rose-500" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground font-semibold">
              No pending team approval requests.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
