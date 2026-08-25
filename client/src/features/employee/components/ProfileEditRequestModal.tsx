import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Send, AlertCircle, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '@/types';

interface ProfileEditRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

export function ProfileEditRequestModal({
  open,
  onOpenChange,
  employee,
}: ProfileEditRequestModalProps) {
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error('Please provide the reason for this edit request.');
      }

      const res = await apiClient.post('/employees/profile-update-requests', {
        employeeId: employee.id,
        requestType: 'personal_info',
        targetArea: 'Complete Profile (All Sections)',
        reason: reason.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Profile edit request submitted to HR! Once approved, your entire profile will unlock for editing.');
      queryClient.invalidateQueries({ queryKey: ['employee-all-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-edit-permission'] });
      setReason('');
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit request';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 shadow-2xl border">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
              <Lock className="w-5 h-5" />
            </span>
            <DialogTitle className="text-base font-black text-foreground">
              Request Full Profile Edit Approval
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Submit a single request to HR for approval to unlock your entire profile for editing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">
          {/* Information Banner explaining Whole Profile Unlock */}
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
            <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              This request asks HR for approval to unlock your <strong>Complete Profile</strong> (Personal Info, Address, Emergency Contacts, Statutory Parameters & Profile Photo). Upon HR approval, your whole profile can be edited.
            </span>
          </div>

          {/* Reason for Request */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">
              Reason for Request <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide the reason for requesting profile edit (e.g. Relocation, updated phone number, address change, typo correction)..."
              className="w-full rounded-xl bg-background border border-border p-3 text-xs text-foreground font-medium placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          {/* HR Routing Note */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Your request will be routed to HR under <strong>HR Operations → Requests</strong>. Once approved, all sections unlock automatically.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl font-semibold px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="h-9 text-xs rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 px-4 shadow-sm cursor-pointer"
            >
              {submitMutation.isPending ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Request to HR
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
