import React, { useState } from 'react';
import { useSettlement } from '../hooks/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const FullFinalSettlement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const { createSettlement, calculateSettlement, submitSettlement } = useSettlement();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200',
      submitted: 'bg-blue-200',
      approved: 'bg-green-200',
      processed: 'bg-purple-200'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Full & Final Settlement</h1>
        <Button onClick={() => setShowForm(!showForm)}>New Settlement</Button>
      </div>

      {/* Settlement Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Employee ID" type="number" />
                <Input placeholder="Exit Date" type="date" />
              </div>
              <Input placeholder="Notice Period (Days)" type="number" />
              <div className="flex gap-2">
                <Button>Create</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlements List */}
      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample settlement */}
            <div className="p-4 border rounded">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="font-medium">Employee #1001</p>
                  <p className="text-sm text-gray-600">Exit Date: 2026-12-31</p>
                </div>
                <Badge className={getStatusColor('draft')}>DRAFT</Badge>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-600">Leave Encashment</p>
                  <p className="font-medium">₹2,50,000</p>
                </div>
                <div>
                  <p className="text-gray-600">Gratuity</p>
                  <p className="font-medium">₹5,00,000</p>
                </div>
                <div>
                  <p className="text-gray-600">Bonus Settlement</p>
                  <p className="font-medium">₹1,50,000</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="font-medium">₹8,50,000</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm">Calculate</Button>
                <Button size="sm" variant="outline">
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FullFinalSettlement;


