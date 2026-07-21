import React from 'react';
import { useReviewCycles, useReviewProgress } from '../api/useReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Calendar } from 'lucide-react';

export const ReviewCyclesPage: React.FC = () => {
  const { cycles, isLoading, error } = useReviewCycles();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'in_review':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      default:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load review cycles</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Review Cycles</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage performance review cycles
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Cycle
        </Button>
      </div>

      {/* Cycles List */}
      <div className="space-y-3">
        {cycles && cycles.length > 0 ? (
          cycles.map((cycle: any) => (
            <Card key={cycle.id} className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {cycle.name}
                        </h3>
                        <Badge className={getStatusColor(cycle.status)}>
                          {cycle.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{cycle.cycleType}</Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Cycle Type: {cycle.cycleType}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Start Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(cycle.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Review Deadline</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(cycle.reviewDeadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">End Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(cycle.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" size="sm" className="flex-1">
                      Manage Reviews
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Progress
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No review cycles found. Create one to get started.
                </p>
                <Button>Create Your First Cycle</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


