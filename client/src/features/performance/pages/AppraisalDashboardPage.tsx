import React, { useState } from 'react';
import { useAppraisals, useAppraisalCycles } from '../api/useAppraisals';
import { usePerformanceDistribution } from '../api/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Star } from 'lucide-react';

export const AppraisalDashboardPage: React.FC = () => {
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>();
  const { data: cyclesData, isLoading: cyclesLoading } = useAppraisalCycles();
  const { appraisals, isLoading } = useAppraisals(selectedCycleId);
  const { data: distributionData } = usePerformanceDistribution(selectedCycleId);

  const cycles = cyclesData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700';
      case 'submitted':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900';
      case 'finalized':
        return 'bg-purple-100 dark:bg-purple-900';
      default:
        return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  if (isLoading || cyclesLoading) {
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

  const getRatingDisplay = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
        <span className="ml-2 font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Appraisal Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee appraisals and ratings
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Appraisal
        </Button>
      </div>

      {/* Cycle Selection */}
      {cycles.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Select Appraisal Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {cycles.map((cycle: any) => (
                <Button
                  key={cycle.id}
                  variant={selectedCycleId === cycle.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCycleId(cycle.id)}
                >
                  {cycle.name} ({cycle.year})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Overview */}
      {distributionData?.data && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {distributionData.data.map((item: any) => (
                <div key={item.label} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    {item.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {item.count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.percentage}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appraisals List */}
      <div className="space-y-3">
        {appraisals && appraisals.length > 0 ? (
          appraisals.map((appraisal: any) => (
            <Card key={appraisal.id} className={`dark:bg-gray-800 ${getStatusColor(appraisal.status)}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Appraisal #{appraisal.id}
                      </h3>
                      <Badge variant="outline">
                        {appraisal.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Employee ID: {appraisal.employeeId} | Manager ID: {appraisal.managerId}
                    </p>
                  </div>
                  <div className="text-right">
                    {appraisal.rating && getRatingDisplay(appraisal.rating)}
                    {appraisal.performanceGrade && (
                      <Badge className="mt-2">{appraisal.performanceGrade}</Badge>
                    )}
                  </div>
                </div>

                {appraisal.overallRating && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Overall Rating: {appraisal.overallRating}
                    </p>
                    {appraisal.successionReadiness && (
                      <Badge variant="outline">
                        Succession: {appraisal.successionReadiness}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                  {appraisal.status === 'draft' && (
                    <Button size="sm" className="flex-1">
                      Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No appraisals found. {selectedCycleId ? 'Create one to get started.' : 'Select a cycle first.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


