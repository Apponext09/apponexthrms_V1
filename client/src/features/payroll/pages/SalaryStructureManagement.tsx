import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSalaryStructure } from '../hooks/index';

export const SalaryStructureManagement: React.FC = () => {
  const { structures, isLoading, createStructure } = useSalaryStructure();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name || !code || !effectiveFrom) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      await createStructure({
        structureName: name,
        structureCode: code,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        description
      });
      setShowForm(false);
      setName('');
      setCode('');
      setEffectiveFrom('');
      setEffectiveTo('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create structure:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salary Structure Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Form' : 'Add New Structure'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Salary Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Structure Name *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Structure Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Structure Code *</label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Structure Code" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Effective From *</label>
                  <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Effective To (Optional)</label>
                  <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate}>Create</Button>
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
          {isLoading ? (
            <p>Loading structures...</p>
          ) : structures.length === 0 ? (
            <p className="text-gray-500">No salary structures configured yet.</p>
          ) : (
            <div className="space-y-4">
              {structures.map((structure: any) => (
                <div key={structure.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-medium">{structure.structure_name || structure.name}</p>
                    <p className="text-sm text-gray-600">Code: {structure.structure_code || structure.code}</p>
                    <p className="text-xs text-gray-500">
                      Effective: {structure.effective_from ? structure.effective_from.split('T')[0] : 'N/A'} to{' '}
                      {structure.effective_to ? structure.effective_to.split('T')[0] : 'Open-ended'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
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


