import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GitBranch, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useEmployeeLifecycle, useTransitionStatus } from '../hooks/useEmployeeProfile';

interface EmployeeLifecycleTimelineProps {
  employeeId: number;
}

const STATUSES = ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni'];

export function EmployeeLifecycleTimeline({ employeeId }: EmployeeLifecycleTimelineProps) {
  const { history, isLoading } = useEmployeeLifecycle(employeeId);
  const { transitionStatus, isLoading: isSaving } = useTransitionStatus(employeeId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    toStatus: 'active',
    transitionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleTransition = async () => {
    try {
      await transitionStatus({
        toStatus: form.toStatus,
        transitionDate: form.transitionDate,
        notes: form.notes || undefined,
      });
      showToast.success('Status updated');
      setOpen(false);
      setForm({ toStatus: 'active', transitionDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || 'Failed to change status');
    }
  };

  return (
    <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
        <div>
          <CardTitle className="text-sm font-bold">Lifecycle Timeline</CardTitle>
          <CardDescription className="text-xs">Employee status transitions and important dates</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-semibold gap-1.5 px-3"
          onClick={() => setOpen(true)}
        >
          <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
          Change Status
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {isLoading ? (
          <div className="text-xs text-muted-foreground py-6 text-center">Loading lifecycle history...</div>
        ) : history.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 text-center">
            No status transitions recorded yet.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      index === 0 ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-muted-foreground/50'
                    }`}
                  />
                  {index < history.length - 1 && (
                    <div className="w-px flex-1 bg-border/60 mt-1" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="font-semibold text-xs text-foreground capitalize">
                    {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                    {entry.toStatus}
                  </p>
                  {entry.notes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{entry.notes}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {entry.transitionDate
                      ? new Date(entry.transitionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Employee Status</DialogTitle>
            <DialogDescription>
              Record a lifecycle transition for this employee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="toStatus">New Status</Label>
              <select
                id="toStatus"
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
                value={form.toStatus}
                onChange={(e) => setForm((p) => ({ ...p, toStatus: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="transitionDate">Transition Date</Label>
              <Input
                id="transitionDate"
                type="date"
                className="mt-1"
                value={form.transitionDate}
                onChange={(e) => setForm((p) => ({ ...p, transitionDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                className="mt-1"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleTransition} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
