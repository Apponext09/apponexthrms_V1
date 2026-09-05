import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '@/config/api';

export const AssetDetails: React.FC = () => {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Asset ID not provided');
      setIsLoading(false);
      return;
    }

    const fetchAsset = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await apiClient.get(`/assets/${id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id]);

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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asset Details</h1>
      {isLoading ? (
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 dark:text-gray-400">Asset ID: {id}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
