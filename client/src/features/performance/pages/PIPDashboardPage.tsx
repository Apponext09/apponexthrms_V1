import React from 'react';
import { usePIPs } from '../api/usePIPs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, AlertTriangle } from 'lucide-react';

export const PIPDashboardPage: React.FC = () => {
  const { pips, isLoading, error } = usePIPs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'review':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'failed':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
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
              <p>Failed to load PIPs</p>
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
            Performance Improvement Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track performance improvement plans
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create PIP
        </Button>
      </div>

      {/* Active PIPs Warning */}
      {pips && pips.some((p: any) => p.status === 'active') && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <p>
                {pips.filter((p: any) => p.status === 'active').length} active PIPs requiring
                attention
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIPs List */}
      <div className="space-y-3">
        {pips && pips.length > 0 ? (
          pips.map((pip: any) => (
            <Card key={pip.id} className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {pip.title}
                        </h3>
                        <Badge className={getStatusColor(pip.status)}>
                          {pip.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {pip.description}
                      </p>
                    </div>
                    {pip.progressRating && (
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                          Progress
                        </p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {pip.progressRating}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Start Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(pip.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">End Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(pip.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Goals */}
                  {pip.goals && pip.goals.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                        Goals ({pip.goals.length})
                      </p>
                      {pip.goals.map((goal: any) => (
                        <p key={goal.id} className="text-gray-600 dark:text-gray-400 text-xs">
                          • {goal.title}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Risk Level */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className={`font-medium ${getRiskColor(pip.riskLevel || 'low')}`}>
                      Risk Level: {(pip.riskLevel || 'low').toUpperCase()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Add Review
                      </Button>
                    </div>
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
                  No PIPs found. Create one if needed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


