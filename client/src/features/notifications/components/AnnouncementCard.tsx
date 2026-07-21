import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface AnnouncementCardProps {
  id: number;
  title: string;
  content: string;
  featured_image_url?: string;
  priority: 'low' | 'normal' | 'high';
  published_at?: string;
  expires_at?: string;
  read: boolean;
  read_count?: number;
  onClick?: () => void;
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'normal':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  id,
  title,
  content,
  featured_image_url,
  priority,
  published_at,
  expires_at,
  read,
  read_count,
  onClick,
}) => {
  const preview = content.substring(0, 150) + (content.length > 150 ? '...' : '');
  const isExpired = expires_at && new Date(expires_at) < new Date();

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer ${
        read ? 'opacity-75 bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex gap-4">
        {featured_image_url && (
          <img
            src={featured_image_url}
            alt={title}
            className="w-20 h-20 rounded object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{title}</h3>
            <Badge className={getPriorityColor(priority)}>{priority}</Badge>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{preview}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {published_at && (
              <span>{formatDistanceToNow(new Date(published_at), { addSuffix: true })}</span>
            )}
            {read_count !== undefined && <span>{read_count} reads</span>}
            {isExpired && <span className="text-red-600">Expired</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
