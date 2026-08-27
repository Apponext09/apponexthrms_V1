import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValue?: boolean;
  onSave: (notifyBackdatedApprover: boolean) => void;
}

export function NotifyBackdatedApproverModal({ open, onClose, initialValue = false, onSave }: Props) {
  const [notifyBackdatedApprover, setNotifyBackdatedApprover] = useState(initialValue);

  useEffect(() => {
    setNotifyBackdatedApprover(initialValue);
  }, [open, initialValue]);

  const handleSave = () => {
    onSave(notifyBackdatedApprover);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-bold text-foreground">
            Notify Backdated Approver Setting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs leading-relaxed text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> If checked, then notification will be sent to the backdated approver set in the previous workflow.
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Checkbox
              id="backdated-approver"
              checked={notifyBackdatedApprover}
              onCheckedChange={(checked) => setNotifyBackdatedApprover(!!checked)}
            />
            <Label htmlFor="backdated-approver" className="text-sm font-semibold cursor-pointer">
              Notify Backdated Approver
            </Label>
          </div>
        </div>

        <div className="flex justify-start pt-3 border-t">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
