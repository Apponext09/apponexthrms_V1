import React, { useState } from 'react';
import { useSettlement } from '../hooks/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';


export const FullFinalSettlement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const { 
    settlements, 
    createSettlement, 
    calculateSettlement, 
    submitSettlement, 
    approveSettlement, 
    processSettlement,
    isLoading 
  } = useSettlement();

  // Form states
  const [empId, setEmpId] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200 text-gray-800',
      submitted: 'bg-blue-200 text-blue-800',
      approved: 'bg-green-200 text-green-800',
      processed: 'bg-purple-200 text-purple-800'
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const handleCreate = async () => {
    if (!empId || !exitDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      await createSettlement({
        employeeId: parseInt(empId),
        exitDate,
        noticePeriodDays: noticePeriod ? parseInt(noticePeriod) : undefined
      });
      setShowForm(false);
      setEmpId('');
      setExitDate('');
      setNoticePeriod('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Full & Final Settlement</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Form' : 'New Settlement'}
        </Button>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID *</label>
                  <Input 
                    placeholder="Employee ID" 
                    type="number" 
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exit Date *</label>
                  <Input 
                    placeholder="Exit Date" 
                    type="date" 
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notice Period (Days) (Optional)</label>
                <Input 
                  placeholder="Notice Period (Days)" 
                  type="number" 
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
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

      {/* Settlements List */}
      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading settlements...</p>
          ) : settlements.length === 0 ? (
            <p className="text-gray-500">No F&F settlements initialized yet.</p>
          ) : (
            <div className="space-y-4">
              {settlements.map((settlement: any) => (
                <div key={settlement.id} className="p-4 border rounded shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="font-medium text-lg">Employee #{settlement.employee_id}</p>
                      <p className="text-sm text-gray-600">Exit Date: {settlement.exit_date.split('T')[0]}</p>
                    </div>
                    <Badge className={getStatusColor(settlement.status)}>
                      {settlement.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4 text-sm bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-gray-600">Leave Encashment</p>
                      <p className="font-medium">₹{Number(settlement.leave_encashment_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gratuity</p>
                      <p className="font-medium">₹{Number(settlement.gratuity_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Severance Settlement</p>
                      <p className="font-medium">₹{Number(settlement.severance_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 font-semibold">Net Settlement</p>
                      <p className="font-semibold text-green-600">₹{Number(settlement.net_settlement_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {settlement.status === 'draft' && (
                      <>
                        <Button size="sm" onClick={() => calculateSettlement(settlement.id)}>
                          Calculate Amounts
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => submitSettlement(settlement.id)}>
                          Submit For Approval
                        </Button>
                      </>
                    )}
                    {settlement.status === 'submitted' && (
                      <Button size="sm" onClick={() => approveSettlement({ settlementId: settlement.id, approverId: 1 })}>
                        Approve Settlement
                      </Button>
                    )}
                    {settlement.status === 'approved' && (
                      <Button size="sm" onClick={() => processSettlement(settlement.id)}>
                        Process & Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FullFinalSettlement;


