import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface TalentMatrixCardProps {
  quadrant: string;
  count: number;
  description: string;
  color: 'green' | 'blue' | 'yellow' | 'orange';
}

export const TalentMatrixCard: React.FC<TalentMatrixCardProps> = ({
  quadrant,
  count,
  description,
  color
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900',
          text: 'text-green-900 dark:text-green-100',
          badge: 'bg-green-100 dark:bg-green-800 text-green-900 dark:text-green-100'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900',
          text: 'text-blue-900 dark:text-blue-100',
          badge: 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900',
          text: 'text-yellow-900 dark:text-yellow-100',
          badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900',
          text: 'text-orange-900 dark:text-orange-100',
          badge: 'bg-orange-100 dark:bg-orange-800 text-orange-900 dark:text-orange-100'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-700',
          text: 'text-gray-900 dark:text-gray-100',
          badge: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        };
    }
  };

  const colors = getColorClasses(color);

  return (
    <Card className={`dark:bg-gray-800 ${colors.bg}`}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <h3 className={`font-semibold ${colors.text}`}>{quadrant}</h3>

          <p className={`text-sm ${colors.text} opacity-75`}>{description}</p>

          <div className="flex items-end justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className={`text-3xl font-bold ${colors.text}`}>{count}</span>
            <Badge className={colors.badge}>Employees</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


