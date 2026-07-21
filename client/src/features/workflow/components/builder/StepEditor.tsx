import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X, Save } from 'lucide-react';

interface StepEditorProps {
  step?: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export function StepEditor({ step, onSave, onClose }: StepEditorProps) {
  const [formData, setFormData] = useState({
    stepName: step?.stepName || '',
    stepDescription: step?.stepDescription || '',
    approvalMode: step?.approvalMode || 'single_person',
    approverType: step?.approverType || 'specific_user',
    canDelegate: step?.canDelegate || true,
    canReject: step?.canReject || true,
    canReassign: step?.canReassign || true,
    timeoutDays: step?.timeoutDays || '',
    slaDays: step?.slaDays || '',
    isFinalStep: step?.isFinalStep || false,
    actionOnApproval: step?.actionOnApproval || 'approve_workflow',
    actionOnRejection: step?.actionOnRejection || 'terminate_workflow',
    notes: step?.notes || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Edit Step</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Step Name</label>
          <Input
            type="text"
            value={formData.stepName}
            onChange={(e) => handleChange('stepName', e.target.value)}
            placeholder="e.g., Manager Approval"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded-md p-2 text-sm"
            rows={3}
            value={formData.stepDescription}
            onChange={(e) => handleChange('stepDescription', e.target.value)}
            placeholder="Step description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Approval Mode</label>
          <select
            className="w-full border rounded-md p-2 text-sm"
            value={formData.approvalMode}
            onChange={(e) => handleChange('approvalMode', e.target.value)}
          >
            <option value="single_person">Single Person</option>
            <option value="any_one_person">Any One Person</option>
            <option value="all_people">All People</option>
            <option value="manager_chain">Manager Chain</option>
            <option value="department_head">Department Head</option>
            <option value="role_based">Role Based</option>
            <option value="dynamic_resolver">Dynamic Resolver</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Approver Type</label>
          <select
            className="w-full border rounded-md p-2 text-sm"
            value={formData.approverType}
            onChange={(e) => handleChange('approverType', e.target.value)}
          >
            <option value="specific_user">Specific User</option>
            <option value="user_role">User Role</option>
            <option value="reporting_manager">Reporting Manager</option>
            <option value="department_head">Department Head</option>
            <option value="dynamic_group">Dynamic Group</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Timeout (days)</label>
            <Input
              type="number"
              value={formData.timeoutDays}
              onChange={(e) => handleChange('timeoutDays', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SLA (days)</label>
            <Input
              type="number"
              value={formData.slaDays}
              onChange={(e) => handleChange('slaDays', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.canDelegate}
              onChange={(e) => handleChange('canDelegate', e.target.checked)}
            />
            <span className="text-sm">Allow Delegation</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.canReject}
              onChange={(e) => handleChange('canReject', e.target.checked)}
            />
            <span className="text-sm">Allow Rejection</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.canReassign}
              onChange={(e) => handleChange('canReassign', e.target.checked)}
            />
            <span className="text-sm">Allow Reassignment</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isFinalStep}
              onChange={(e) => handleChange('isFinalStep', e.target.checked)}
            />
            <span className="text-sm">This is Final Step</span>
          </label>
        </div>

        <div className="border-t pt-4 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save size={16} />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}





