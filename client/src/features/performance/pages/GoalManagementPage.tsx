import React, { useState } from 'react';
import { useGoals } from '../api/useGoals';
import { usePerformanceStore } from '../store/performanceStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, MoreVertical, Trash2, Edit } from 'lucide-react';

export const GoalManagementPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>();
  const { goals, isLoading, error, createGoal, updateGoal, deleteGoal } = useGoals(selectedEmployeeId);
  const { uiState, openCreateModal, closeCreateModal, openDeleteModal } = usePerformanceStore();

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
              <p>Failed to load goals</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Goal Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and track employee goals
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals && goals.length > 0 ? (
          goals.map((goal: any) => (
            <Card key={goal.id} className="dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {goal.title}
                      </h3>
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status}
                      </Badge>
                      <span className={`text-sm font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {goal.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {goal.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${goal.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="flex gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Start: {new Date(goal.startDate).toLocaleDateString()}</span>
                      <span>End: {new Date(goal.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                  No goals found. Create one to get started.
                </p>
                <Button onClick={openCreateModal}>Create Your First Goal</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


