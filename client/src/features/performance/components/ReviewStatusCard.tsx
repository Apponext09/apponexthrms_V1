import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ReviewStatusCardProps {
  cycleMonth: string;
  status: string;
  totalReviews: number;
  completedReviews: number;
  pendingReviews: number;
  averageRating?: number;
}

export const ReviewStatusCard: React.FC<ReviewStatusCardProps> = ({
  cycleMonth,
  status,
  totalReviews,
  completedReviews,
  pendingReviews,
  averageRating
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'active':
        return 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'in_review':
        return 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const completionPercentage = (completedReviews / totalReviews) * 100;

  return (
    <Card className="dark:bg-gray-800">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {cycleMonth}
            </h3>
            <Badge className={getStatusColor(status)}>
              {status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalReviews}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-2 rounded">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                Completed
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {completedReviews}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900 p-2 rounded">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {pendingReviews}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Completion</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {completionPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Average Rating */}
          {averageRating !== undefined && (
            <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Avg Rating
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {averageRating.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


