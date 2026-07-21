import React, { useState } from 'react';
import { useKPIs } from '../api/useKPIs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, TrendingUp } from 'lucide-react';

export const KPIManagementPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>();
  const { kpis, isLoading, error } = useKPIs(selectedEmployeeId);

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
              <p>Failed to load KPIs</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeColor = (achievement: number) => {
    if (achievement >= 100) {
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    } else if (achievement >= 80) {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    } else {
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KPI Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track Key Performance Indicators
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create KPI
        </Button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis && kpis.length > 0 ? (
          kpis.map((kpi: any) => {
            const achievement = (kpi.currentValue / kpi.targetValue) * 100;
            return (
              <Card key={kpi.id} className="dark:bg-gray-800 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {kpi.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {kpi.category}
                        </p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>

                    {/* Achievement */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Achievement</span>
                        <Badge className={getStatusBadgeColor(achievement)}>
                          {achievement.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(achievement, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Current</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {kpi.currentValue}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Target</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {kpi.targetValue}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Unit</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {kpi.unit}
                        </p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      Update Achievement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="dark:bg-gray-800 md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No KPIs found. Create one to get started.
                </p>
                <Button>Create Your First KPI</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


