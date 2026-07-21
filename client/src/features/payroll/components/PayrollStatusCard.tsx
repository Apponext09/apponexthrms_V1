import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PayrollStatusCardProps {
  cycleMonth: string;
  status: string;
  totalEmployees: number;
  processedEmployees: number;
  errorCount: number;
}

export const PayrollStatusCard: React.FC<PayrollStatusCardProps> = ({
  cycleMonth,
  status,
  totalEmployees,
  processedEmployees,
  errorCount
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 text-gray-800';
      case 'processing':
        return 'bg-blue-200 text-blue-800';
      case 'locked':
        return 'bg-yellow-200 text-yellow-800';
      case 'approved':
        return 'bg-green-200 text-green-800';
      case 'published':
        return 'bg-purple-200 text-purple-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const progressPercentage = (processedEmployees / totalEmployees) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{cycleMonth}</CardTitle>
          <Badge className={getStatusColor(status)}>{status.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{totalEmployees}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-green-600">{processedEmployees}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center">{progressPercentage.toFixed(0)}% complete</p>
        </div>
      </CardContent>
    </Card>
  );
};

