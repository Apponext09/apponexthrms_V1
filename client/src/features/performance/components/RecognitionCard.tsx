import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Heart } from 'lucide-react';

export interface RecognitionCardProps {
  title: string;
  awardee: string;
  givenBy: string;
  category: string;
  points: number;
  description?: string;
  isApproved?: boolean;
  onApprove?: () => void;
}

export const RecognitionCard: React.FC<RecognitionCardProps> = ({
  title,
  awardee,
  givenBy,
  category,
  points,
  description,
  isApproved,
  onApprove
}) => {
  return (
    <Card className="dark:bg-gray-800 hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                For: <span className="font-medium">{awardee}</span>
              </p>
            </div>
            <Award className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          )}

          {/* Details */}
          <div className="space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              By: <span className="font-medium text-gray-900 dark:text-white">{givenBy}</span>
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="default">{category}</Badge>
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                +{points} pts
              </span>
            </div>
          </div>

          {/* Action */}
          {!isApproved && onApprove && (
            <button
              onClick={onApprove}
              className="w-full text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 pt-2 border-t border-gray-200 dark:border-gray-700"
            >
              Approve Recognition
            </button>
          )}

          {isApproved && (
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Heart className="h-3 w-3 fill-current" />
              Approved
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


