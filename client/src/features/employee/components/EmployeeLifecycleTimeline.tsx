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
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Lifecycle Timeline</CardTitle>
          <CardDescription>Employee status transitions and important dates</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <GitBranch className="w-4 h-4" />
          Change Status
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            No status transitions recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                      index === 0 ? 'bg-green-500' : 'bg-muted-foreground'
                    }`}
                  />
                  {index < history.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="font-semibold capitalize">
                    {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                    {entry.toStatus}
                  </p>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.transitionDate
                      ? new Date(entry.transitionDate).toLocaleDateString()
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
