import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Sliders, Settings2 } from 'lucide-react';

export interface CustomStepField {
  id: string;
  label: string;
  fieldType: 'text' | 'number' | 'checkbox' | 'select' | 'date';
  options?: string[]; // Dropdown options if select
  required?: boolean;
  value?: string | number | boolean;
  targetStep?: 'all' | 'reporting_officer' | 'employee' | 'department' | 'role';
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialFields?: CustomStepField[];
  stepName: string;
  onSave: (fields: CustomStepField[]) => void;
}

export function CustomizeStepFieldsModal({
  open,
  onClose,
  initialFields = [],
  stepName,
  onSave,
}: Props) {
  const [fields, setFields] = useState<CustomStepField[]>(initialFields);
  
  // New field draft state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'checkbox' | 'select' | 'date'>('text');
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [newTargetStep, setNewTargetStep] = useState<'all' | 'reporting_officer' | 'employee' | 'department' | 'role'>('all');

  useEffect(() => {
    setFields(initialFields);
  }, [open, initialFields]);

  const handleAddField = () => {
    if (!newLabel.trim()) return;
    const optionsArray = newType === 'select'
      ? newOptionsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const newField: CustomStepField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: newLabel.trim(),
      fieldType: newType,
      options: optionsArray,
      required: newRequired,
      targetStep: newTargetStep,
    };

    setFields((prev) => [...prev, newField]);
    setNewLabel('');
    setNewOptionsStr('');
    setNewRequired(false);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    onSave(fields);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 border rounded-xl overflow-hidden shadow-xl bg-white dark:bg-gray-900">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-gray-900 dark:text-white">
            <Sliders size={18} className="text-blue-600" />
            Customize Fields ({stepName})
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Configured Custom Fields List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Configured Custom Fields ({fields.length})
              </Label>
            </div>

            {fields.length === 0 && (
              <div className="p-6 text-center border-2 border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-800/40">
                <Settings2 size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-medium text-gray-500">No custom fields added yet.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Use the form below to create custom data fields for workflow steps.</p>
              </div>
            )}

            <div className="space-y-2.5">
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/80 dark:bg-gray-800/60 hover:border-gray-300 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{f.label}</span>
                      {f.required && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-bold">Required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>Type: <strong className="uppercase">{f.fieldType}</strong></span>
                      {f.options && f.options.length > 0 && (
                        <span>Options: {f.options.join(', ')}</span>
                      )}
                      <span>Scope: <strong className="capitalize">{f.targetStep || 'all'}</strong></span>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveField(f.id)}
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove field"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Custom Field Form */}
          <div className="border-t pt-5 space-y-4">
            <Label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              + Add New Custom Field
            </Label>

            <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/30 p-4 border rounded-xl">
              {/* Field Label */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Field Name / Label</Label>
                <Input
                  placeholder="e.g. Special Approval Reason, Max Encashment Days..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-gray-800"
                />
              </div>

              {/* Field Type & Target Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Input Type</Label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full h-9 text-xs border rounded-lg px-2.5 bg-white dark:bg-gray-800 font-medium"
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                    <option value="checkbox">Checkbox Toggle</option>
                    <option value="select">Dropdown Choice</option>
                    <option value="date">Date Picker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Step</Label>
                  <select
                    value={newTargetStep}
                    onChange={(e) => setNewTargetStep(e.target.value as any)}
                    className="w-full h-9 text-xs border rounded-lg px-2.5 bg-white dark:bg-gray-800 font-medium"
                  >
                    <option value="all">All Steps</option>
                    <option value="reporting_officer">Reporting Officer</option>
                    <option value="employee">User / Employee</option>
                    <option value="department">Department</option>
                    <option value="role">Role</option>
                  </select>
                </div>
              </div>

              {/* Dropdown Options if select */}
              {newType === 'select' && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Dropdown Choices (comma-separated)</Label>
                  <Input
                    placeholder="e.g. High Priority, Normal, Low Priority"
                    value={newOptionsStr}
                    onChange={(e) => setNewOptionsStr(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-gray-800"
                  />
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center gap-2 pt-1" onClick={() => setNewRequired(!newRequired)}>
                <Checkbox id="req-field" checked={newRequired} onCheckedChange={(v) => setNewRequired(!!v)} />
                <Label htmlFor="req-field" className="text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                  Required field
                </Label>
              </div>

              {/* Add Button */}
              <Button
                size="sm"
                onClick={handleAddField}
                disabled={!newLabel.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs gap-1.5 rounded-lg mt-2"
              >
                <Plus size={15} />
                Add Field
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t flex justify-between items-center bg-gray-50/70 dark:bg-gray-900/50">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 h-9 rounded-lg text-xs"
          >
            Save Fields
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onClose}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold px-6 h-9 rounded-lg text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
