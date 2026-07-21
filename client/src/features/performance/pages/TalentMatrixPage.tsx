import React from 'react';
import { useTalentMatrix } from '../api/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export const TalentMatrixPage: React.FC = () => {
  const { data: talentMatrixData, isLoading, error } = useTalentMatrix();

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
              <p>Failed to load talent matrix</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const matrix = talentMatrixData?.data;

  // Create a 2D matrix: Y-axis = Performance, X-axis = Potential
  const matrixGrid = [
    [
      { quadrant: 'Core/Development', performance: 'Below Average', potential: 'Below Average' },
      { quadrant: 'High Potential', performance: 'Below Average', potential: 'High' }
    ],
    [
      { quadrant: 'Core/Solid', performance: 'Average/Above', potential: 'Below Average' },
      { quadrant: 'High Performer', performance: 'Average/Above', potential: 'High' }
    ]
  ];

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case 'High Performer':
        return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700';
      case 'High Potential':
        return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700';
      case 'Core/Solid':
        return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700';
      case 'Core/Development':
        return 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-700';
      default:
        return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getQuadrantTextColor = (quadrant: string) => {
    switch (quadrant) {
      case 'High Performer':
        return 'text-green-900 dark:text-green-100';
      case 'High Potential':
        return 'text-blue-900 dark:text-blue-100';
      case 'Core/Solid':
        return 'text-yellow-900 dark:text-yellow-100';
      case 'Core/Development':
        return 'text-orange-900 dark:text-orange-100';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  const getCount = (quadrant: string): number => {
    switch (quadrant) {
      case 'High Performer':
        return matrix?.highPerformers || 0;
      case 'High Potential':
        return matrix?.highPotential || 0;
      case 'Core/Solid':
        return matrix?.solidPerformers || 0;
      case 'Core/Development':
        return matrix?.needsImprovement || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Talent Matrix
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Visualize talent distribution across performance and potential
        </p>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`dark:bg-gray-800 ${getQuadrantColor('High Performer')}`}>
          <CardContent className="pt-6">
            <div className={`text-center ${getQuadrantTextColor('High Performer')}`}>
              <p className="text-sm font-semibold mb-2">High Performer</p>
              <p className="text-3xl font-bold">{matrix?.highPerformers || 0}</p>
              <p className="text-xs mt-2 opacity-75">
                High Performance & High Potential
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={`dark:bg-gray-800 ${getQuadrantColor('High Potential')}`}>
          <CardContent className="pt-6">
            <div className={`text-center ${getQuadrantTextColor('High Potential')}`}>
              <p className="text-sm font-semibold mb-2">High Potential</p>
              <p className="text-3xl font-bold">{matrix?.highPotential || 0}</p>
              <p className="text-xs mt-2 opacity-75">
                Developing & High Potential
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={`dark:bg-gray-800 ${getQuadrantColor('Core/Solid')}`}>
          <CardContent className="pt-6">
            <div className={`text-center ${getQuadrantTextColor('Core/Solid')}`}>
              <p className="text-sm font-semibold mb-2">Core Solid</p>
              <p className="text-3xl font-bold">{matrix?.solidPerformers || 0}</p>
              <p className="text-xs mt-2 opacity-75">
                High Performance & Solid Potential
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={`dark:bg-gray-800 ${getQuadrantColor('Core/Development')}`}>
          <CardContent className="pt-6">
            <div className={`text-center ${getQuadrantTextColor('Core/Development')}`}>
              <p className="text-sm font-semibold mb-2">Development</p>
              <p className="text-3xl font-bold">{matrix?.needsImprovement || 0}</p>
              <p className="text-xs mt-2 opacity-75">
                Needs Development in Both Areas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Grid */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Talent Distribution Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Y-axis label */}
            <div className="flex gap-4">
              <div className="w-32 flex items-end justify-center pb-4">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 transform -rotate-90 whitespace-nowrap">
                  Performance
                </span>
              </div>

              {/* Grid */}
              <div className="flex-1 space-y-4">
                {/* High Performance Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-6 border-2 rounded-lg ${getQuadrantColor('Core/Solid')}`}>
                    <p className={`text-sm font-semibold ${getQuadrantTextColor('Core/Solid')}`}>
                      Core / Solid Performers
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${getQuadrantTextColor('Core/Solid')}`}>
                      {matrix?.solidPerformers || 0}
                    </p>
                  </div>
                  <div className={`p-6 border-2 rounded-lg ${getQuadrantColor('High Performer')}`}>
                    <p className={`text-sm font-semibold ${getQuadrantTextColor('High Performer')}`}>
                      High Performers
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${getQuadrantTextColor('High Performer')}`}>
                      {matrix?.highPerformers || 0}
                    </p>
                  </div>
                </div>

                {/* Low Performance Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-6 border-2 rounded-lg ${getQuadrantColor('Core/Development')}`}>
                    <p className={`text-sm font-semibold ${getQuadrantTextColor('Core/Development')}`}>
                      Needs Development
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${getQuadrantTextColor('Core/Development')}`}>
                      {matrix?.needsImprovement || 0}
                    </p>
                  </div>
                  <div className={`p-6 border-2 rounded-lg ${getQuadrantColor('High Potential')}`}>
                    <p className={`text-sm font-semibold ${getQuadrantTextColor('High Potential')}`}>
                      High Potential
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${getQuadrantTextColor('High Potential')}`}>
                      {matrix?.highPotential || 0}
                    </p>
                  </div>
                </div>

                {/* X-axis label */}
                <div className="text-center mt-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Potential →
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


