import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { WorkflowCanvas } from '../components/builder/WorkflowCanvas';
import { useWorkflowStore } from '../store/workflowStore';

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workflow, saveWorkflow } = useWorkflowStore();
  const [name, setName] = useState(workflow?.workflow_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (id) {
        await saveWorkflow(parseInt(id), { workflow_name: name });
      } else {
        // Create new workflow
        const newWorkflow = await saveWorkflow(0, {
          workflow_code: name.toLowerCase().replace(/\s+/g, '_'),
          workflow_name: name,
          type: 'leave_request',
          approval_pattern: 'sequential',
        });
        navigate(`/workflows/${newWorkflow.id}/edit`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (id) {
      navigate(`/workflows/${id}/publish`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/workflows')}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <Input
            type="text"
            placeholder="Workflow name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            <Save size={16} />
            Save
          </Button>
          {id && (
            <Button
              onClick={handlePublish}
              className="gap-2"
            >
              Publish Workflow
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas />
      </div>
    </div>
  );
}
