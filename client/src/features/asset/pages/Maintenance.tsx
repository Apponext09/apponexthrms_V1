import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '@/config/api';

export const Maintenance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/assets/maintenance');
        const data = response.data;
        setRecords(data.success ? (Array.isArray(data.data) ? data.data : []) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, []);

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track asset maintenance</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Record
        </Button>
      </div>
      {isLoading ? (
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : records.length === 0 ? (
        <Card><CardContent className="pt-6 text-center py-12"><p className="text-gray-500">No maintenance records</p></CardContent></Card>
      ) : (
        <div className="space-y-4">{records.map((r: any) => <Card key={r.id}><CardContent className="pt-6"><p>{r.description || 'Maintenance record'}</p></CardContent></Card>)}</div>
      )}
    </div>
  );
};
