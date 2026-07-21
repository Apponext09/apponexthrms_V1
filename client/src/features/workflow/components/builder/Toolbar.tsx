import { Button } from '@/components/ui/button';
import { Plus, GitBranch, RotateCcw, Save } from 'lucide-react';

interface ToolbarProps {
  onAddStep: () => void;
  onAddCondition: () => void;
}

export function Toolbar({ onAddStep, onAddCondition }: ToolbarProps) {
  return (
    <div className="border-r bg-gray-50 p-4 flex flex-col gap-2 w-48">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">Tools</h3>

      <Button
        onClick={onAddStep}
        variant="outline"
        className="justify-start gap-2 w-full"
      >
        <Plus size={16} />
        Add Step
      </Button>

      <Button
        onClick={onAddCondition}
        variant="outline"
        className="justify-start gap-2 w-full"
      >
        <GitBranch size={16} />
        Add Condition
      </Button>

      <div className="border-t my-4" />

      <h3 className="font-semibold text-sm text-gray-700 mb-2">Canvas</h3>

      <Button
        variant="outline"
        className="justify-start gap-2 w-full"
      >
        <RotateCcw size={16} />
        Reset View
      </Button>

      <div className="border-t my-4" />

      <h3 className="font-semibold text-sm text-gray-700 mb-2">Help</h3>

      <div className="text-xs text-gray-600 space-y-2">
        <p>
          <strong>Drag</strong> to move nodes
        </p>
        <p>
          <strong>Connect</strong> handles to create edges
        </p>
        <p>
          <strong>Right-click</strong> for options
        </p>
      </div>
    </div>
  );
}

