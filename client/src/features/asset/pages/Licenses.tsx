import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '@/config/api';

export const Licenses: React.FC = () => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/assets/licenses');
        const data = response.data;
        setLicenses(data.success ? (Array.isArray(data.data) ? data.data : []) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setLicenses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLicenses();
  }, []);

  if (error) {
    return <Card className="border-red-200"><CardContent className="pt-6"><div className="flex items-center gap-3 text-red-600"><AlertCircle className="h-5 w-5" /><p>{error}</p></div></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Software Licenses</h1><p className="text-gray-600 mt-1">Manage software licenses</p></div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add License</Button>
      </div>
      {isLoading ? <div className="h-20 bg-gray-200 rounded animate-pulse" /> : licenses.length === 0 ? <Card><CardContent className="pt-6 text-center py-12"><p className="text-gray-500">No licenses</p></CardContent></Card> : <div className="space-y-4">{licenses.map((l: any) => <Card key={l.id}><CardContent className="pt-6"><p>{l.name || 'License'}</p></CardContent></Card>)}</div>}
    </div>
  );
};
