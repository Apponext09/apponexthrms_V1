import React, { useState } from 'react';
import {
  usePerformanceTrends,
  useSkillGapAnalytics,
  useTopPerformers,
  usePerformanceReports,
  usePerformanceDashboard
} from '../api/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, TrendingUp, Award } from 'lucide-react';

export const PerformanceAnalyticsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('12m');
  const { dashboard, metrics, isLoading } = usePerformanceDashboard();
  const { data: trendsData, isLoading: trendsLoading } = usePerformanceTrends(selectedPeriod);
  const { data: skillGapsData, isLoading: skillGapsLoading } = useSkillGapAnalytics();
  const { data: topPerformersData, isLoading: topLoading } = useTopPerformers(10);

  const trends = trendsData?.data || [];
  const skillGaps = skillGapsData?.data || [];
  const topPerformers = topPerformersData?.data || [];

  const periods = [
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '12 Months', value: '12m' },
    { label: 'All Time', value: 'all' }
  ];

  if (isLoading || trendsLoading || skillGapsLoading || topLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
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
            Performance Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            In-depth insights and analytics on employee performance
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Period Selector */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Select Time Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Average Performance Rating
              </p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {metrics?.averageRating?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">out of 5.0</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Average Goal Progress
              </p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">
                {metrics?.averageGoalProgress || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">across all employees</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Review Completion Rate
              </p>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {metrics?.completedReviews && metrics?.totalEmployees
                  ? Math.round((metrics.completedReviews / metrics.totalEmployees) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {metrics?.completedReviews || 0}/{metrics?.totalEmployees || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      {trends.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.map((trend: any) => (
                <div key={trend.period} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {trend.period}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {trend.averageRating?.toFixed(2) || 'N/A'} avg rating
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(trend.averageRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPerformers.map((performer: any, idx: number) => (
                <div
                  key={performer.employeeId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900">
                      <span className="font-bold text-yellow-700 dark:text-yellow-300">
                        #{idx + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Employee #{performer.employeeId}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Avg Rating: {performer.averageRating?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{performer.department}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Critical Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skillGaps.slice(0, 5).map((gap: any) => (
                <div key={gap.competency} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {gap.competency}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Affecting {gap.employees} employees
                      </p>
                    </div>
                    <Badge
                      variant={gap.priority === 'high' ? 'destructive' : 'default'}
                    >
                      {gap.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Current: {gap.averageCurrentLevel?.toFixed(1) || 0}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Target: {gap.averageTargetLevel?.toFixed(1) || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((gap.averageCurrentLevel / gap.averageTargetLevel) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


