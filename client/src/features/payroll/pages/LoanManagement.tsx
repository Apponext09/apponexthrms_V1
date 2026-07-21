import React, { useState } from 'react';
import { useLoan } from '../hooks/index';
import { EMIScheduleTable } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export const LoanManagement: React.FC = () => {
  const [employeeId, setEmployeeId] = useState<number>();
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { loans, createLoan, getEmiSchedule } = useLoan(employeeId);
  const [emiSchedule, setEmiSchedule] = useState<any[]>([]);

  const handleViewSchedule = async (loanId: number) => {
    setSelectedLoanId(loanId);
    const schedule = await getEmiSchedule(loanId);
    setEmiSchedule(schedule);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-blue-200',
      closed: 'bg-green-200',
      defaulted: 'bg-red-200'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Loan Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>Create New Loan</Button>
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

      {/* Loan Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Employee ID" type="number" />
                <select className="border rounded px-3">
                  <option>Loan Type</option>
                  <option>Personal</option>
                  <option>Vehicle</option>
                  <option>Home</option>
                  <option>Education</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input placeholder="Loan Amount" type="number" />
                <Input placeholder="Tenure (Months)" type="number" />
                <Input placeholder="Interest Rate (%)" type="number" />
              </div>
              <Input placeholder="Loan Date" type="date" />
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

      {/* Loans List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loans.map((loan: any) => (
              <div key={loan.id} className="flex justify-between items-center p-4 border rounded">
                <div>
                  <p className="font-medium">{loan.loan_type} Loan</p>
                  <p className="text-sm text-gray-600">
                    Amount: ₹{loan.loan_amount.toFixed(2)} | EMI: ₹{loan.emi.toFixed(2)}
                  </p>
                </div>
                <Badge className={getStatusBadge(loan.status)}>{loan.status.toUpperCase()}</Badge>
                <Button size="sm" onClick={() => handleViewSchedule(loan.id)}>
                  View Schedule
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EMI Schedule */}
      {emiSchedule.length > 0 && (
        <EMIScheduleTable emis={emiSchedule} title="EMI Schedule" />
      )}
    </div>
  );
};

export default LoanManagement;


