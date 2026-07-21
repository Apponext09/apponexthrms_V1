import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { useInstances } from '../hooks/useInstances';

export function WorkflowInstancePage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const { fetchInstance, fetchInstanceHistory } = useInstances({});

  const { data: instance, isLoading: instanceLoading } = useQuery({
    queryKey: ['workflow-instance', instanceId],
    queryFn: () => fetchInstance(parseInt(instanceId!)),
    enabled: !!instanceId,
  });

  const { data: history } = useQuery({
    queryKey: ['workflow-instance-history', instanceId],
    queryFn: () => fetchInstanceHistory(parseInt(instanceId!)),
    enabled: !!instanceId,
  });

  if (instanceLoading) {
    return <div>Loading...</div>;
  }

  if (!instance) {
    return <div>Instance not found</div>;
  }

  const statusIcon = {
    pending: <Clock className="text-yellow-500" size={20} />,
    approved: <CheckCircle className="text-green-500" size={20} />,
    rejected: <XCircle className="text-red-500" size={20} />,
    cancelled: <XCircle className="text-gray-500" size={20} />,
  };

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                {instance.entity_type} Approval
              </h1>
              <div className="flex items-center gap-2">
                {statusIcon[instance.status as keyof typeof statusIcon]}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusColor[instance.status as keyof typeof statusColor]
                  }`}
                >
                  {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                </span>
              </div>
            </div>

            {instance.metadata && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">Request Details</h3>
                <dl className="space-y-2 text-sm">
                  {Object.entries(instance.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd className="font-medium">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Approvals</p>
                <p className="text-2xl font-bold">{instance.approval_count}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Rejections</p>
                <p className="text-2xl font-bold">{instance.rejection_count}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Current Step</p>
                <p className="text-2xl font-bold">{instance.current_step_number || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Approval Timeline</h2>
            <WorkflowTimeline history={history?.items || []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Info</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-600">Started</dt>
                <dd className="font-medium">
                  {new Date(instance.started_at).toLocaleString()}
                </dd>
              </div>
              {instance.completed_at && (
                <div>
                  <dt className="text-gray-600">Completed</dt>
                  <dd className="font-medium">
                    {new Date(instance.completed_at).toLocaleString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-600">Entity ID</dt>
                <dd className="font-medium">{instance.entity_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
