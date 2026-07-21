import React from 'react';
import { usePendingFeedback, useFeedbackSummary } from '../api/useFeedback';
import { useFeedbackStore } from '../store/feedbackStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Send } from 'lucide-react';

export const FeedbackPortalPage: React.FC = () => {
  const currentUserId = 1; // Replace with actual user ID from context
  const { data: pendingFeedback, isLoading: pendingLoading } = usePendingFeedback(currentUserId);
  const { data: feedbackSummary, isLoading: summaryLoading } = useFeedbackSummary(currentUserId);
  const { activeTab, setActiveTab } = useFeedbackStore();

  const tabs = [
    { id: 'pending', label: 'Pending', icon: '⏳' },
    { id: 'submitted', label: 'Submitted', icon: '✓' },
    { id: 'received', label: 'Received', icon: '📥' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }
  ];

  const isLoading = pendingLoading || summaryLoading;

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Feedback Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Give and receive feedback from colleagues
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Request Feedback
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingFeedback?.data && pendingFeedback.data.length > 0 ? (
            pendingFeedback.data.map((request: any) => (
              <Card key={request.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Feedback Request from Employee {request.employeeId}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          Type: {request.feedbackType}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Due: {new Date(request.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      {request.isAnonymous && (
                        <Badge variant="default">Anonymous</Badge>
                      )}
                    </div>
                    <Button className="w-full gap-2">
                      <Send className="h-4 w-4" />
                      Provide Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No pending feedback requests
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'received' && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Feedback Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackSummary?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      Average Rating
                    </p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {feedbackSummary.data.averageRating?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      Total Responses
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {feedbackSummary.data.totalResponses || 0}
                    </p>
                  </div>
                </div>

                {feedbackSummary.data.strengths && (
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Key Strengths
                    </h4>
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      {feedbackSummary.data.strengths}
                    </p>
                  </div>
                )}

                {feedbackSummary.data.areasForImprovement && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      Areas for Improvement
                    </h4>
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      {feedbackSummary.data.areasForImprovement}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No feedback summary available yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'analytics' && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Feedback Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                Detailed analytics coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


