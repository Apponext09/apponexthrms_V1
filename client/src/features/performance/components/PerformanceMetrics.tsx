import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export interface PerformanceMetricsProps {
  totalEmployees: number;
  averageRating: number;
  averageGoalProgress: number;
  completedReviews: number;
  activeReviews: number;
  pendingApprovals: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  totalEmployees,
  averageRating,
  averageGoalProgress,
  completedReviews,
  activeReviews,
  pendingApprovals
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalEmployees}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {averageRating.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">out of 5.0</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Goal Progress</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {averageGoalProgress}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Reviews</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {completedReviews}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Reviews</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {activeReviews}
              </p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {pendingApprovals}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


