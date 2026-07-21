import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useWorkflows } from '../hooks/useWorkflows';

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchWorkflow } = useWorkflows({});

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => fetchWorkflow(parseInt(id!)),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!workflow) {
    return <div>Workflow not found</div>;
  }

  return (
    <div className="space-y-6">
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
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h1 className="text-3xl font-bold mb-2">{workflow.workflow_name}</h1>
            <p className="text-gray-600 mb-4">{workflow.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Code</label>
                <p className="text-lg font-semibold">{workflow.workflow_code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="text-lg font-semibold">{workflow.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Pattern</label>
                <p className="text-lg font-semibold">{workflow.approval_pattern}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p className="text-lg font-semibold">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      workflow.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : workflow.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {workflow.status}
                  </span>
                </p>
              </div>
            </div>

            {workflow.sla_days && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm">
                  <strong>SLA:</strong> {workflow.sla_days} days
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {workflow.status === 'draft' && (
                <Button
                  onClick={() => navigate(`/workflows/${id}/edit`)}
                  variant="outline"
                  className="gap-2"
                >
                  <Edit size={16} />
                  Edit Workflow
                </Button>
              )}
              <Button variant="outline" className="gap-2">
                <Trash2 size={16} />
                Archive
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Approval Steps</h2>
            <div className="space-y-4">
              {/* Steps will be loaded and displayed here */}
              <p className="text-gray-600">Steps information will be displayed here</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-600">Created</dt>
                <dd className="font-medium">
                  {new Date(workflow.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Version</dt>
                <dd className="font-medium">v{workflow.version_number}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Escalation Levels</dt>
                <dd className="font-medium">{workflow.max_escalation_levels}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
