import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { useApprovals } from '../hooks/useApprovals';

interface ApprovalCardProps {
  approval: any;
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { approveStep, rejectStep } = useApprovals({});

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveStep(approval.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      const reason = await window.appPrompt('Rejection reason:');
      if (reason) {
        await rejectStep(approval.id, reason);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysWaiting = Math.floor(
    (new Date().getTime() - new Date(approval.assigned_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const urgency = daysWaiting > 3 ? 'high' : daysWaiting > 1 ? 'medium' : 'low';

  const urgencyColor = {
    high: 'border-l-4 border-l-red-500 bg-red-50',
    medium: 'border-l-4 border-l-orange-500 bg-orange-50',
    low: 'border-l-4 border-l-blue-500 bg-blue-50',
  };

  return (
    <Card className={`p-6 ${urgencyColor[urgency]}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-start gap-3 mb-3">
            <Clock size={20} className="text-gray-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">
                {approval.entity_type?.replace(/_/g, ' ')}
              </h3>
              <p className="text-sm text-gray-600">
                Step {approval.step_number} â€¢ Waiting {daysWaiting} days
              </p>
            </div>
          </div>

          {approval.approver_notes && (
            <div className="mb-3 p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-700">{approval.approver_notes}</p>
            </div>
          )}

          <div className="text-sm text-gray-600">
            Assigned: {new Date(approval.assigned_at).toLocaleDateString()}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link to={`/workflow/instances/${approval.instance_id}`}>
            <Button variant="outline" className="w-full gap-2">
              <Eye size={16} />
              View Details
            </Button>
          </Link>

          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 gap-2"
          >
            <CheckCircle size={16} />
            Approve
          </Button>

          <Button
            onClick={handleReject}
            disabled={isSubmitting}
            variant="outline"
            className="w-full text-red-600 border-red-600 hover:bg-red-50 gap-2"
          >
            <XCircle size={16} />
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}



