import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface GoalProgressCardProps {
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  onView?: () => void;
  onEdit?: () => void;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  title,
  description,
  status,
  progress,
  priority,
  dueDate,
  onView,
  onEdit
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="dark:bg-gray-800 hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {title}
              </h3>
              <Badge className={getStatusColor(status)}>
                {status}
              </Badge>
            </div>
            <p className={`text-xs font-medium ${getPriorityColor(priority)}`}>
              {priority.toUpperCase()}
            </p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`${getProgressColor(progress)} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Date */}
          {dueDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Due: {new Date(dueDate).toLocaleDateString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            {onView && (
              <button
                onClick={onView}
                className="flex-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                View
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


