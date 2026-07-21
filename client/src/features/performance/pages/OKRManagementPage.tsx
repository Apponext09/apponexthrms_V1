import React, { useState } from 'react';
import { useOKRs, useOKRCycles } from '../api/useOKRs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus } from 'lucide-react';

export const OKRManagementPage: React.FC = () => {
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>();
  const { data: cyclesData, isLoading: cyclesLoading } = useOKRCycles();
  const { okrs, isLoading, error } = useOKRs(undefined, selectedCycleId);
  const cycles = cyclesData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
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

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load OKRs</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">OKR Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage Objectives and Key Results
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create OKR
        </Button>
      </div>

      {/* Cycle Selection */}
      {cycles && cycles.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Select Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {cycles.map((cycle: any) => (
                <Button
                  key={cycle.id}
                  variant={selectedCycleId === cycle.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCycleId(cycle.id)}
                >
                  {cycle.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OKRs List */}
      <div className="space-y-3">
        {okrs && okrs.length > 0 ? (
          okrs.map((okr: any) => (
            <Card key={okr.id} className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {okr.title}
                        </h3>
                        <Badge className={getStatusColor(okr.status)}>
                          {okr.status}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {okr.objective}
                      </p>
                    </div>
                  </div>

                  {/* Key Results */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      Key Results
                    </h4>
                    {okr.keyResults && okr.keyResults.map((kr: any) => (
                      <div key={kr.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {kr.title}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {kr.currentValue}/{kr.targetValue}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${(kr.currentValue / kr.targetValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall Progress */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Overall Progress
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {okr.overallProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${okr.overallProgress}%` }}
                      />
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
                  {selectedCycleId ? 'No OKRs found for this cycle' : 'Select a cycle to view OKRs'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


