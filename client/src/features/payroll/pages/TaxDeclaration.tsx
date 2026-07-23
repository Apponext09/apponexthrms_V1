import React, { useState } from 'react';
import { useTaxDeclaration } from '../hooks/index';
import { TaxCalculationDisplay } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const TaxDeclaration: React.FC = () => {
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);

  // Form states for creating a new declaration
  const [newEmpId, setNewEmpId] = useState('');
  const [fy, setFy] = useState('2026-27');
  const [pan, setPan] = useState('');

  // Form states for adding a new investment
  const [investmentType, setInvestmentType] = useState<'80c' | '80d' | '80tta' | 'other'>('80c');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [activeDeclIdForInvestment, setActiveDeclIdForInvestment] = useState<number | null>(null);

  const { declarations, isLoading, createDeclaration, addInvestment, calculateTDS, refetch } = useTaxDeclaration(employeeId);

  const handleCalculateTDS = async (declaration: any) => {
    try {
      const tds = await calculateTDS({
        employeeId: declaration.employee_id,
        financialYear: declaration.financial_year,
        grossSalaryYtd: 1200000 // 12L default gross
      });
      setSelectedDeclaration({ ...declaration, tds: tds.data || tds });
    } catch (err) {
      console.error('TDS calculation failed:', err);
    }
  };

  const handleCreateDeclaration = () => {
    const targetEmpId = parseInt(newEmpId) || employeeId;
    if (!fy || !pan) {
      alert('Please fill out PAN and Financial Year.');
      return;
    }
    createDeclaration(
      {
        employeeId: targetEmpId,
        financialYear: fy,
        panNumber: pan
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setPan('');
          refetch();
        }
      }
    );
  };

  const handleAddInvestmentSubmit = () => {
    if (!activeDeclIdForInvestment || !investmentAmount) {
      alert('Please specify amount.');
      return;
    }
    addInvestment(
      {
        declarationId: activeDeclIdForInvestment,
        investmentType,
        investmentAmount: parseFloat(investmentAmount)
      },
      {
        onSuccess: () => {
          setInvestmentAmount('');
          setActiveDeclIdForInvestment(null);
          refetch();
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-200 text-yellow-800',
      declared: 'bg-blue-200 text-blue-800',
      finalized: 'bg-green-200 text-green-800'
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tax Declaration</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : 'New Declaration'}
        </Button>
      </div>

      {/* Employee Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Search Employee ID</label>
              <Input
                placeholder="Employee ID"
                type="number"
                value={employeeId || ''}
                onChange={(e) => setEmployeeId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={() => refetch()}>Search</Button>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID (Optional, defaults to filter)</label>
                  <Input 
                    placeholder="Employee ID" 
                    type="number" 
                    value={newEmpId} 
                    onChange={(e) => setNewEmpId(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Financial Year (YYYY-YY)</label>
                  <Input 
                    placeholder="Financial Year (e.g. 2026-27)" 
                    value={fy} 
                    onChange={(e) => setFy(e.target.value)} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PAN Number</label>
                <Input 
                  placeholder="PAN Number" 
                  value={pan} 
                  onChange={(e) => setPan(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateDeclaration}>Create</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Investment Modal/Form */}
      {activeDeclIdForInvestment && (
        <Card className="border-blue-300 bg-blue-50/50">
          <CardHeader>
            <CardTitle>Add Investment to Declaration #{activeDeclIdForInvestment}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Section Type</label>
                  <select
                    value={investmentType}
                    onChange={(e: any) => setInvestmentType(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white text-black"
                  >
                    <option value="80c">80C (Life Insurance, PPF, etc.)</option>
                    <option value="80d">80D (Medical Insurance)</option>
                    <option value="80tta">80TTA (Savings Interest)</option>
                    <option value="other">Other Deductions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Investment Amount"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddInvestmentSubmit}>Submit Investment</Button>
                <Button variant="outline" onClick={() => setActiveDeclIdForInvestment(null)}>
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
          {isLoading ? (
            <p>Loading declarations...</p>
          ) : declarations.length === 0 ? (
            <p className="text-gray-500">No tax declarations found{employeeId ? ` for Employee ID ${employeeId}` : ''}.</p>
          ) : (
            <div className="space-y-4">
              {declarations.map((declaration: any) => (
                <div key={declaration.id} className="p-4 border rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium">Financial Year: FY {declaration.financial_year}</p>
                      <p className="text-sm text-gray-600">PAN: {declaration.pan_number || 'Not provided'}</p>
                      <p className="text-xs text-gray-500">Declared Date: {declaration.declaration_date}</p>
                    </div>
                    <Badge className={getStatusColor(declaration.status)}>
                      {declaration.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleCalculateTDS(declaration)}>
                      View TDS
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setActiveDeclIdForInvestment(declaration.id)}
                    >
                      Add Investment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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


