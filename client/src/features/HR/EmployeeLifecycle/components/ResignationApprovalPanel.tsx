import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/toast';
import { lifecycleApi } from '../api/lifecycleApi';

type Resignation = { id: number; firstName: string; lastName: string; employeeCode: string; subject: string; reason: string; description: string; lastWorkingDay: string };

export function ResignationApprovalPanel({ onReviewed }: { onReviewed?: () => void }) {
  const [requests, setRequests] = useState<Resignation[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const load = async () => { try { setRequests(await lifecycleApi.getPendingResignations()); } catch { setRequests([]); } };
  useEffect(() => { void load(); }, []);
  const review = async (request: Resignation, decision: 'approved' | 'rejected') => {
    const note = notes[request.id] || '';
    if (decision === 'rejected' && !note.trim()) return showToast.error('Rejection reason required');
    try { await lifecycleApi.reviewResignation(request.id, decision, note); showToast.success(`Resignation ${decision}`); await load(); onReviewed?.(); }
    catch (error: any) { showToast.error('Review failed', error?.response?.data?.message || 'Please try again.'); }
  };
  return <Card className="border-amber-200 bg-amber-50/40"><CardHeader className="pb-3"><CardTitle className="text-base">Pending resignation approvals</CardTitle></CardHeader><CardContent className="space-y-4">{!requests.length ? <p className="text-sm text-muted-foreground">No employee resignation requests are waiting for review.</p> : requests.map((request) => <div key={request.id} className="rounded-lg border bg-background p-4"><p className="font-semibold">{request.firstName} {request.lastName} <span className="text-xs text-muted-foreground">({request.employeeCode})</span></p><p className="text-sm font-medium">{request.subject}</p><p className="mt-2 text-sm"><b>Reason:</b> {request.reason}</p><p className="text-sm text-muted-foreground">{request.description}</p><p className="mt-1 text-xs text-muted-foreground">Last working day: {request.lastWorkingDay}</p><Textarea className="mt-3" value={notes[request.id] || ''} onChange={(e) => setNotes({ ...notes, [request.id]: e.target.value })} placeholder="Approval note optional; rejection reason required" /><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => review(request, 'approved')}>Approve</Button><Button size="sm" variant="destructive" onClick={() => review(request, 'rejected')}>Reject</Button></div></div>)}</CardContent></Card>;
}
