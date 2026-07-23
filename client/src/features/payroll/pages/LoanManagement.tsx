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

  // Form states
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [loanType, setLoanType] = useState('personal');
  const [loanAmount, setLoanAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanDate, setLoanDate] = useState('');

  const handleViewSchedule = async (loanId: number) => {
    setSelectedLoanId(loanId);
    const schedule = await getEmiSchedule(loanId);
    setEmiSchedule(schedule);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-blue-200 text-blue-800',
      closed: 'bg-green-200 text-green-800',
      defaulted: 'bg-red-200 text-red-800'
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const handleCreate = async () => {
    if (!formEmployeeId || !loanAmount || !tenureMonths || !loanDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      await createLoan({
        employeeId: parseInt(formEmployeeId),
        loanType: loanType as any,
        loanAmount: parseFloat(loanAmount),
        tenureMonths: parseInt(tenureMonths),
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        loanDate
      });
      setShowForm(false);
      setFormEmployeeId('');
      setLoanType('personal');
      setLoanAmount('');
      setTenureMonths('');
      setInterestRate('');
      setLoanDate('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Loan Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Form' : 'Create New Loan'}
        </Button>
      </div>

      {/* Employee Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search by Employee ID"
              type="number"
              value={employeeId || ''}
              onChange={(e) => setEmployeeId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="max-w-xs"
            />
            <Button onClick={() => setEmployeeId(employeeId)}>Search</Button>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID *</label>
                  <Input 
                    placeholder="Employee ID" 
                    type="number" 
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Type *</label>
                  <select 
                    className="border rounded px-3 w-full h-10"
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                  >
                    <option value="personal">Personal</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="home">Home</option>
                    <option value="education">Education</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                  <Input 
                    placeholder="Loan Amount" 
                    type="number" 
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tenure (Months) *</label>
                  <Input 
                    placeholder="Tenure (Months)" 
                    type="number" 
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate (%) (Optional)</label>
                  <Input 
                    placeholder="Interest Rate (%)" 
                    type="number" 
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Date *</label>
                <Input 
                  placeholder="Loan Date" 
                  type="date" 
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Create</Button>
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
            {loans.length === 0 ? (
              <p className="text-gray-500">Search by Employee ID to view their active loans.</p>
            ) : (
              loans.map((loan: any) => (
                <div key={loan.id} className="flex justify-between items-center p-4 border rounded shadow-sm">
                  <div>
                    <p className="font-medium text-lg capitalize">{loan.loan_type} Loan</p>
                    <p className="text-sm text-gray-600">
                      Amount: ₹{Number(loan.loan_amount).toLocaleString('en-IN')} | EMI: ₹{Number(loan.emi).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">Outstanding: ₹{Number(loan.outstanding_amount).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(loan.status)}>{loan.status.toUpperCase()}</Badge>
                    <Button size="sm" onClick={() => handleViewSchedule(loan.id)}>
                      View Schedule
                    </Button>
                  </div>
                </div>
              ))
            )}
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


