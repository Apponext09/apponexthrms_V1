import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';

interface ConditionBuilderProps {
  condition?: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

export function ConditionBuilder({ condition, onSave, onClose }: ConditionBuilderProps) {
  const [formData, setFormData] = useState({
    conditionType: condition?.conditionType || 'field_value',
    fieldName: condition?.fieldName || '',
    operator: condition?.operator || 'equals',
    value: condition?.value || '',
    description: condition?.description || '',
  });

  const conditionTypes = [
    'field_value',
    'numeric_comparison',
    'date_comparison',
    'approval_count',
  ];

  const operators = [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'in_list',
    'contains',
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave?.(formData);
  };

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6 max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Build Condition</h2>
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
          <label className="block text-sm font-medium mb-1">Condition Type</label>
          <select
            className="w-full border rounded-md p-2 text-sm"
            value={formData.conditionType}
            onChange={(e) => handleChange('conditionType', e.target.value)}
          >
            {conditionTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Field Name</label>
          <Input
            type="text"
            value={formData.fieldName}
            onChange={(e) => handleChange('fieldName', e.target.value)}
            placeholder="e.g., leave_type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Operator</label>
          <select
            className="w-full border rounded-md p-2 text-sm"
            value={formData.operator}
            onChange={(e) => handleChange('operator', e.target.value)}
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {op.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Value</label>
          <Input
            type="text"
            value={formData.value}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder="Condition value"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded-md p-2 text-sm"
            rows={2}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe this condition..."
          />
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
            <Plus size={16} />
            Add Condition
          </Button>
        </div>
      </div>
    </div>
  );
}





