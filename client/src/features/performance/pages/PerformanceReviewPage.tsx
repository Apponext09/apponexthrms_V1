import React, { useState } from 'react';
import { useReviews } from '../api/useReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus } from 'lucide-react';

export const PerformanceReviewPage: React.FC = () => {
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>();
  const { reviews, isLoading, error } = useReviews(selectedCycleId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case 'submitted':
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
              <p>Failed to load reviews</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Performance Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and conduct performance reviews
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Review
        </Button>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews && reviews.length > 0 ? (
          reviews.map((review: any) => (
            <Card key={review.id} className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Review #{review.id}
                        </h3>
                        <Badge className={getStatusColor(review.status)}>
                          {review.status.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Employee</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Employee ID: {review.employeeId}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Manager</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Manager ID: {review.managerId}
                          </p>
                        </div>
                      </div>
                    </div>
                    {review.rating && (
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Rating</p>
                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {review.rating}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">/ 5.0</p>
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Due Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(review.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    {review.submittedAt && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Submitted</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(review.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {review.overallComments && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 font-semibold">
                        Comments
                      </p>
                      <p className="text-gray-900 dark:text-white text-sm">
                        {review.overallComments}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    {review.status === 'draft' && (
                      <Button size="sm" className="flex-1">
                        Submit Review
                      </Button>
                    )}
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
                  No reviews found. Create one to get started.
                </p>
                <Button>Create Your First Review</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


