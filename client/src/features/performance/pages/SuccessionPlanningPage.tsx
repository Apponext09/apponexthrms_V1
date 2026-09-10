import React, { useState } from 'react';
import { useSuccessionPositions, useHighRiskPositions } from '../api/useSuccession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Plus } from 'lucide-react';

export const SuccessionPlanningPage: React.FC = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>();
  const { positions, isLoading, error } = useSuccessionPositions(selectedDepartmentId);
  const { data: highRiskData, isLoading: highRiskLoading } = useHighRiskPositions(selectedDepartmentId);

  const highRiskPositions = highRiskData?.data || [];

  if (isLoading || highRiskLoading) {
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
              <p>Failed to load succession positions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case 'ready':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'ready_with_development':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'not_ready':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Succession Planning
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage successor pipeline and readiness
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* High Risk Positions */}
      {highRiskPositions.length > 0 && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-200 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                  High Risk Positions
                </h3>
                <p className="text-red-800 dark:text-red-300 text-sm">
                  {highRiskPositions.length} critical position(s) may have succession gap(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions Grid */}
      <div className="space-y-3">
        {positions && positions.length > 0 ? (
          positions.map((position: any) => (
            <Card key={position.id} className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {position.positionTitle}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Current: Employee #{position.currentHolderId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                        Criticality
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {position.criticalityScore}
                      </p>
                    </div>
                  </div>

                  {/* Successors */}
                  {position.successors && position.successors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                        Successors ({position.successors.length})
                      </h4>
                      {position.successors.map((successor: any) => (
                        <div
                          key={successor.id}
                          className="bg-gray-50 dark:bg-gray-700 p-3 rounded flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Employee #{successor.employeeId}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Position {successor.sequenceOrder}
                            </p>
                          </div>
                          <Badge className={getReadinessColor(successor.readinessLevel)}>
                            {successor.readinessLevel.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {successor.readinessPercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Development Needs */}
                  {position.developmentNeeds && position.developmentNeeds.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded">
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm mb-2">
                        Development Needs
                      </p>
                      {position.developmentNeeds.map((need: string, idx: number) => (
                        <p key={idx} className="text-yellow-800 dark:text-yellow-200 text-xs">
                          • {need}
                        </p>
                      ))}
                    </div>
                  )}

                  <Button variant="outline" className="w-full">
                    Manage Successors
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No positions found. Add a position to start planning.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


