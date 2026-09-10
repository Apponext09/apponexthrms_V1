import React, { useState } from 'react';
import { useCompetencies, useCompetencyFrameworks, useCompetencyAssessments } from '../api/useCompetencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus } from 'lucide-react';

export const CompetencyDashboardPage: React.FC = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>();
  const { data: competenciesData, isLoading: competenciesLoading } = useCompetencies();
  const { frameworks, isLoading: frameworksLoading } = useCompetencyFrameworks();
  const { assessments, isLoading: assessmentsLoading } = useCompetencyAssessments(selectedEmployeeId);

  const isLoading = competenciesLoading || frameworksLoading || assessmentsLoading;
  const competencies = competenciesData?.data || [];

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
            Competency Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage competency frameworks and assessments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Frameworks */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Competency Frameworks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frameworks && frameworks.length > 0 ? (
            frameworks.map((framework: any) => (
              <Card key={framework.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {framework.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {framework.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {framework.competencies?.length || 0} competencies
                    </Badge>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="dark:bg-gray-800 md:col-span-2 lg:col-span-3">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No frameworks found. Create one to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Competencies */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Available Competencies
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competencies && competencies.length > 0 ? (
            competencies.map((competency: any) => (
              <Card key={competency.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {competency.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {competency.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="default">{competency.category}</Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {competency.levels?.length || 0} levels
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="dark:bg-gray-800 md:col-span-2">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No competencies configured yet
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assessments */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Assessments
        </h2>
        <div className="space-y-3">
          {assessments && assessments.length > 0 ? (
            assessments.map((assessment: any) => (
              <Card key={assessment.id} className="dark:bg-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        Assessment #{assessment.id}
                      </p>
                      <Badge variant={assessment.status === 'completed' ? 'default' : 'outline'}>
                        {assessment.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        Score
                      </p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {assessment.overallScore}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="dark:bg-gray-800">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No assessments found
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};


