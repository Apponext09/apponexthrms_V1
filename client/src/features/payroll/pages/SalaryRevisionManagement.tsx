import React, { useState } from 'react';
import { useSalaryRevision } from '../hooks/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const SalaryRevisionManagement: React.FC = () => {
  const { revisions, requestRevision, approveRevision, submitRevision, rejectRevision, isLoading } = useSalaryRevision();
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [empId, setEmpId] = useState('');
  const [type, setType] = useState('increment');
  const [ctc, setCtc] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');

  // Filters state
  const [filterEmpId, setFilterEmpId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200 text-gray-800',
      submitted: 'bg-blue-200 text-blue-800',
      approved: 'bg-green-200 text-green-800',
      rejected: 'bg-red-200 text-red-800',
      implemented: 'bg-purple-200 text-purple-800'
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const handleCreate = async () => {
    if (!empId || !ctc || !effectiveDate) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      await requestRevision({
        employeeId: parseInt(empId),
        revisionType: type,
        newCTC: parseFloat(ctc),
        effectiveFrom: effectiveDate,
        reason: reason || undefined
      });
      setShowForm(false);
      setEmpId('');
      setType('increment');
      setCtc('');
      setEffectiveDate('');
      setReason('');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRevisions = revisions.filter((rev: any) => {
    if (filterEmpId && rev.employee_id !== parseInt(filterEmpId)) return false;
    if (filterType && rev.revision_type !== filterType) return false;
    if (filterStatus && rev.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salary Revisions</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close Form' : 'Request Revision'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <Input 
              placeholder="Employee ID" 
              type="number" 
              value={filterEmpId}
              onChange={(e) => setFilterEmpId(e.target.value)}
            />
            <select
              className="border rounded px-3"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="increment">Increment</option>
              <option value="promotion">Promotion</option>
              <option value="compensation_change">Compensation Change</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <select
              className="border rounded px-3"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
            </select>
            <Button variant="outline" onClick={() => { setFilterEmpId(''); setFilterType(''); setFilterStatus(''); }}>
              Clear
            </Button>
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
                  <label className="block text-sm font-medium mb-1">Revision Type *</label>
                  <select 
                    className="border rounded px-3 w-full h-10"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="increment">Increment</option>
                    <option value="promotion">Promotion</option>
                    <option value="compensation_change">Compensation Change</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New CTC *</label>
                  <Input 
                    placeholder="New CTC" 
                    type="number" 
                    value={ctc}
                    onChange={(e) => setCtc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Effective From *</label>
                  <Input 
                    placeholder="Effective From" 
                    type="date" 
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <Input 
                  placeholder="Reason" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Submit</Button>
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
          {isLoading ? (
            <p>Loading revisions...</p>
          ) : filteredRevisions.length === 0 ? (
            <p className="text-gray-500">No revisions found.</p>
          ) : (
            <div className="space-y-4">
              {filteredRevisions.map((revision: any) => (
                <div key={revision.id} className="flex justify-between items-center p-4 border rounded shadow-sm">
                  <div>
                    <p className="font-medium text-lg">Employee #{revision.employee_id}</p>
                    <p className="text-sm text-gray-600">
                      Type: <span className="capitalize">{revision.revision_type.replace(/_/g, ' ')}</span> | 
                      New CTC: ₹{Number(revision.new_ctc).toLocaleString('en-IN')}
                    </p>
                    {revision.reason_description && (
                      <p className="text-xs text-gray-500 mt-1">Reason: {revision.reason_description}</p>
                    )}
                    <p className="text-xs text-gray-400">Effective From: {revision.effective_from.split('T')[0]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(revision.status)}>
                      {revision.status.toUpperCase()}
                    </Badge>
                    {revision.status === 'draft' && (
                      <Button size="sm" onClick={() => submitRevision(revision.id)}>
                        Submit
                      </Button>
                    )}
                    {revision.status === 'submitted' && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => approveRevision({ revisionId: revision.id, approverId: 1 })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectRevision({ revisionId: revision.id, reason: 'Rejected by Admin' })}>
                          Reject
                        </Button>
                      </div>
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

export default SalaryRevisionManagement;


