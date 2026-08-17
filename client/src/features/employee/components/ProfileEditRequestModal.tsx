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
import { Lock, Send, AlertCircle, ShieldAlert, FileText } from 'lucide-react';
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

  const [targetArea, setTargetArea] = useState('Personal Details & Address');
  const [reason, setReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) {
        throw new Error('Please provide the reason for this edit request.');
      }

      const res = await apiClient.post('/employees/profile-update-requests', {
        employeeId: employee.id,
        requestType: 'personal_info',
        targetArea,
        reason: reason.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Profile edit request submitted successfully! Sent to CEO & HR for approval.');
      queryClient.invalidateQueries({ queryKey: ['employee-all-requests'] });
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
              Request Profile Edit
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Direct editing is locked to preserve official record integrity. Submit your requested updates along with your reason for CEO & HR review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">
          {/* Target Section Dropdown */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">Profile Section / Category</label>
            <select
              value={targetArea}
              onChange={(e) => setTargetArea(e.target.value)}
              className="w-full h-9 rounded-xl bg-background border border-border px-3 font-semibold text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="Basic Information">Basic Information</option>
              <option value="Personal Details & Address">Personal Details & Address</option>
              <option value="Professional & Education Info">Professional & Education Info</option>
              <option value="Statutory & Banking Details">Statutory & Banking Details</option>
              <option value="Profile Photo">Profile Photo</option>
            </select>
          </div>



          {/* Reason for Edit */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">
              Reason for Request <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide the official reason for requesting this edit (e.g. Relocation to new house, new SIM card, typo correction)..."
              className="w-full rounded-xl bg-background border border-border p-3 text-xs text-foreground font-medium placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          {/* Note alert */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Your request will be routed to CEO & HR under <strong>HR Operations → Requests</strong> for approval before changes take effect.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl font-semibold px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="h-9 text-xs rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 px-4 shadow-sm"
            >
              {submitMutation.isPending ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Submit Request to CEO & HR
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
