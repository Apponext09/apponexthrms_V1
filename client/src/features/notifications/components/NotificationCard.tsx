import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../hooks';

interface NotificationCardProps {
  id: number;
  subject_line?: string;
  body_text: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  read_at?: string;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'border-red-400 bg-red-50 dark:bg-red-900/10';
    case 'high':
      return 'border-orange-400 bg-orange-50 dark:bg-orange-900/10';
    case 'normal':
      return 'border-blue-400 bg-blue-50 dark:bg-blue-900/10';
    case 'low':
      return 'border-gray-400 bg-gray-50 dark:bg-gray-900/10';
    default:
      return 'border-gray-400';
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  id,
  subject_line,
  body_text,
  status,
  priority,
  created_at,
  read_at,
  onMarkAsRead,
  onDelete,
}) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const isRead = !!read_at;

  const handleMarkAsRead = () => {
    markAsRead(id);
    onMarkAsRead?.();
  };

  const handleDelete = () => {
    deleteNotification(id);
    onDelete?.();
  };

  return (
    <div
      className={`flex gap-4 p-4 border-l-4 rounded-r-lg ${getPriorityColor(priority)} ${
        isRead ? 'opacity-75' : ''
      } hover:shadow-md transition-shadow`}
    >
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {subject_line && <p className="font-semibold text-gray-900 dark:text-white">{subject_line}</p>}
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{body_text}</p>
          </div>
          {isRead && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />}
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDistanceToNow(new Date(created_at), { addSuffix: true })}</span>
          <span className="capitalize">{status}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {!isRead && (
          <button
            onClick={handleMarkAsRead}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
            title="Mark as read"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={handleDelete}
          className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1"
          title="Delete"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
