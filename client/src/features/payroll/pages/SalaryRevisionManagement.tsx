import React, { useState } from 'react';
import { useSalaryRevision } from '../hooks/index';
import { useCompensationStore } from '../store/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const SalaryRevisionManagement: React.FC = () => {
  const { requestRevision } = useSalaryRevision();
  const { setFilter } = useCompensationStore();
  const [showForm, setShowForm] = useState(false);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200',
      submitted: 'bg-blue-200',
      approved: 'bg-green-200',
      rejected: 'bg-red-200'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salary Revisions</h1>
        <Button onClick={() => setShowForm(!showForm)}>Request Revision</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <Input placeholder="Employee ID" type="number" />
            <select
              className="border rounded px-3"
              onChange={(e) => setFilter({ revisionType: e.target.value as any })}
            >
              <option value="">All Types</option>
              <option value="increment">Increment</option>
              <option value="promotion">Promotion</option>
              <option value="compensation_change">Compensation Change</option>
            </select>
            <select
              className="border rounded px-3"
              onChange={(e) => setFilter({ status: e.target.value as any })}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
            <Button variant="outline">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Revision Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request Salary Revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Employee ID" type="number" />
                <select className="border rounded px-3">
                  <option>Revision Type</option>
                  <option>Increment</option>
                  <option>Promotion</option>
                  <option>Compensation Change</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="New CTC" type="number" />
                <Input placeholder="Effective From" type="date" />
              </div>
              <Input placeholder="Reason" />
              <div className="flex gap-2">
                <Button>Submit</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revisions List */}
      <Card>
        <CardHeader>
          <CardTitle>Revision Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample revision item */}
            <div className="flex justify-between items-center p-4 border rounded">
              <div>
                <p className="font-medium">Employee #1001</p>
                <p className="text-sm text-gray-600">Increment - New CTC: ₹50,00,000</p>
              </div>
              <Badge className={getStatusColor('submitted')}>SUBMITTED</Badge>
              <Button size="sm">Approve</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryRevisionManagement;


