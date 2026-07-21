import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConditionNode({ data }: any) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg p-4 min-w-[180px] shadow-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="font-semibold text-gray-800">{data.label}</div>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={16} />
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-50">
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm">
                <Edit2 size={14} />
                Edit
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm text-red-600">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        {data.conditionType || 'No condition'}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Right} id="true" />
      <Handle type="source" position={Position.Left} id="false" />
    </div>
  );
}




