import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, History, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([
    { id: 1, applicant: 'Sneha Rao', type: 'Leave Request', details: 'Casual Leave (2 days) - Personal work', date: '2026-07-22' },
    { id: 2, applicant: 'Vikram Singh', type: 'Expense Claim', details: 'Client lunch internet bills (₹1,500)', date: '2026-07-21' },
  ]);

  const handleAction = (id: number, status: 'Approved' | 'Rejected') => {
    toast.success(`Request ${status} successfully.`);
    setApprovals(prev => prev.filter(a => a.id !== id));
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
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-violet-500" /> Pending Approvals Pipeline
          </CardTitle>
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
                        onClick={() => handleAction(a.id, 'Approved')}
                        className="h-8 hover:text-emerald-600 hover:bg-emerald-50 text-xs font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Approve
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAction(a.id, 'Rejected')}
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
