import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const SalaryStructureManagement: React.FC = () => {
  const [structures] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salary Structure Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>Add New Structure</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Salary Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Structure Name" />
                <Input placeholder="Structure Code" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" placeholder="Effective From" />
                <Input type="date" placeholder="Effective To (Optional)" />
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Existing Structures</CardTitle>
        </CardHeader>
        <CardContent>
          {structures.length === 0 ? (
            <p className="text-gray-500">No salary structures configured yet.</p>
          ) : (
            <div className="space-y-4">
              {structures.map((structure) => (
                <div key={structure.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-medium">{structure.name}</p>
                    <p className="text-sm text-gray-600">{structure.code}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryStructureManagement;


