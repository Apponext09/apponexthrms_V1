import { CheckCircle2, XCircle, ArrowRight, Clock, Share2 } from 'lucide-react';

interface TimelineEvent {
  id: number;
  action: string;
  actor_id?: number;
  actor_name?: string;
  actor_role?: string;
  timestamp: string;
  comments?: string;
  entity_changes?: Record<string, any>;
}

interface WorkflowTimelineProps {
  history?: TimelineEvent[];
}

export function WorkflowTimeline({ history = [] }: WorkflowTimelineProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle2 className="text-green-500" size={24} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={24} />;
      case 'delegated':
        return <Share2 className="text-blue-500" size={24} />;
      case 'escalated':
        return <ArrowRight className="text-orange-500" size={24} />;
      case 'step_assigned':
        return <Clock className="text-gray-500" size={24} />;
      default:
        return <Clock className="text-gray-400" size={24} />;
    }
  };

  const getActionLabel = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {history.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            {getActionIcon(event.action)}
            {index < history.length - 1 && (
              <div className="w-1 h-8 bg-gray-200 mt-2" />
            )}
          </div>

          <div className="flex-1 pb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold">
                  {getActionLabel(event.action)}
                </h4>
                <span className="text-sm text-gray-600">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>

              {event.actor_name && (
                <p className="text-sm text-gray-600 mb-2">
                  by <span className="font-medium">{event.actor_name}</span>
                  {event.actor_role && ` (${event.actor_role})`}
                </p>
              )}

              {event.comments && (
                <p className="text-sm text-gray-700 italic mb-2">
                  "{event.comments}"
                </p>
              )}

              {event.entity_changes && Object.keys(event.entity_changes).length > 0 && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {Object.entries(event.entity_changes).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

