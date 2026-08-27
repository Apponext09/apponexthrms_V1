import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { StepFormPermissions } from '../../hooks/useWorkflowSettings';

const PERMISSION_FIELDS: Array<{ key: keyof StepFormPermissions; label: string }> = [
  { key: 'isClearanceForm', label: 'Is Clearance Form' },
  { key: 'allowAddExtraAmount', label: 'Allow To Add Extra Amount Data' },
  { key: 'allowViewPreviousExtraAmount', label: 'Allow To View Previous Level Extra Amount Data' },
  { key: 'canSeeAssets', label: 'Can See Assets Of Employee' },
  { key: 'canChangeResignationDate', label: 'Can Change Resignation Date' },
  { key: 'showNoticePeriodDetail', label: 'Show Notice Period Detail' },
  { key: 'allowEditNoticePeriodInfo', label: 'Allow To Edit Notice Period Info' },
  { key: 'showApprovalForm', label: 'Show Approval Form' },
  { key: 'includeFnfTemplate', label: 'Include FNF Template' },
  { key: 'recoveryAmount', label: 'Recovery Amount' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initialValues?: StepFormPermissions;
  stepName?: string;
  onSave: (values: StepFormPermissions) => void;
}

export function StepFormPermissionsModal({ open, onClose, initialValues = {}, stepName, onSave }: Props) {
  const [values, setValues] = useState<StepFormPermissions>(initialValues);

  const toggle = useCallback((key: keyof StepFormPermissions) => {
    setValues(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {stepName ? `${stepName} — ` : ''}Form Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {PERMISSION_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={`perm-${key}`}
                checked={!!values[key]}
                onCheckedChange={() => toggle(key)}
              />
              <Label htmlFor={`perm-${key}`} className="text-sm cursor-pointer leading-tight">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
