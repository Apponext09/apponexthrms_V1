import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValue?: boolean;
  onSave: (isApplicantsReportingOfficer: boolean) => void;
}

export function ReportingOfficerSettingsModal({ open, onClose, initialValue = false, onSave }: Props) {
  const [isApplicantsReportingOfficer, setIsApplicantsReportingOfficer] = useState(initialValue);

  useEffect(() => {
    setIsApplicantsReportingOfficer(initialValue);
  }, [open, initialValue]);

  const handleSave = () => {
    onSave(isApplicantsReportingOfficer);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-bold text-foreground">
            Reporting Officer Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs leading-relaxed text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> In the case of reporting Officer as an approver, Reporting officer of the previous approver is considered. If you want to change the approver as applicant's Reporting Officer then check the below checkbox.
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Checkbox
              id="applicant-ro"
              checked={isApplicantsReportingOfficer}
              onCheckedChange={(checked) => setIsApplicantsReportingOfficer(!!checked)}
            />
            <Label htmlFor="applicant-ro" className="text-sm font-semibold cursor-pointer">
              Applicant's Reporting Officer
            </Label>
          </div>
        </div>

        <div className="flex justify-start pt-3 border-t">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
