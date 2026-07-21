import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asset Reports</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Generate asset reports</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Inventory Report', 'Assignment Report', 'Maintenance Report', 'Depreciation Report'].map((title) => (
          <Card key={title}><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-gray-600 dark:text-gray-400">Generate {title.toLowerCase()}</p></CardContent></Card>
        ))}
      </div>
    </div>
  );
};
