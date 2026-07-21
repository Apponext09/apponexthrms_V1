import React, { useState } from 'react';
import { useTaxDeclaration } from '../hooks/index';
import { TaxCalculationDisplay } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const TaxDeclaration: React.FC = () => {
  const [employeeId, setEmployeeId] = useState<number>();
  const [showForm, setShowForm] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);
  const { declarations, calculateTDS } = useTaxDeclaration(employeeId);

  const handleCalculateTDS = async (declaration: any) => {
    const tds = await calculateTDS({
      employeeId: declaration.employee_id,
      financialYear: declaration.financial_year,
      grossSalaryYtd: 5000000 // TODO: Get from payroll
    });
    setSelectedDeclaration({ ...declaration, tds });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-200',
      declared: 'bg-blue-200',
      finalized: 'bg-green-200'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tax Declaration</h1>
        <Button onClick={() => setShowForm(!showForm)}>New Declaration</Button>
      </div>

      {/* Employee Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Employee ID"
              type="number"
              onChange={(e) => setEmployeeId(parseInt(e.target.value))}
              className="max-w-xs"
            />
            <Button>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Declaration Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Tax Declaration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Employee ID" type="number" />
                <Input placeholder="Financial Year (YYYY-YY)" />
              </div>
              <Input placeholder="PAN Number" />
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

      {/* Declarations List */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Declarations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {declarations.map((declaration: any) => (
              <div key={declaration.id} className="p-4 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium">FY {declaration.financial_year}</p>
                    <p className="text-sm text-gray-600">PAN: {declaration.pan_number || 'Not provided'}</p>
                  </div>
                  <Badge className={getStatusColor(declaration.status)}>
                    {declaration.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => handleCalculateTDS(declaration)}>
                    View TDS
                  </Button>
                  <Button size="sm" variant="outline">
                    Add Investment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TDS Calculation */}
      {selectedDeclaration?.tds && (
        <TaxCalculationDisplay {...selectedDeclaration.tds} />
      )}
    </div>
  );
};

export default TaxDeclaration;


