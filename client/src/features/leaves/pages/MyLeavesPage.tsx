import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLeaveApplications, useCancelLeave } from '../hooks/useLeave';
import { useLeaveStore } from '../store/leaveStore';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
  withdrawn: 'bg-orange-100 text-orange-800',
};

export function MyLeavesPage() {
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const { filters } = useLeaveStore();
  const { applications, isLoading, error } = useLeaveApplications({
    page,
    pageSize: 20,
    status: selectedStatus || filters.status,
  });
  const { cancelLeave } = useCancelLeave();

  const handleCancel = async (applicationId: number) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason) {
      await cancelLeave({ applicationId, reason });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Leaves</h1>
        <Link to="/leaves/apply">
          <Button>Apply for Leave</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {Object.entries(statusColors).map(([status]) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            onClick={() => setSelectedStatus(selectedStatus === status ? undefined : status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No leave applications found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app: any) => (
            <Card key={app.id} className="p-4 hover:shadow-lg transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{app.leaveTypeId}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[app.status]}`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2">
                    {new Date(app.applicationStartDate).toLocaleDateString()} to{' '}
                    {new Date(app.applicationEndDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700 mt-1">
                    <strong>Duration:</strong> {app.totalDays} days
                  </p>
                  {app.reason && (
                    <p className="text-gray-600 mt-2">
                      <strong>Reason:</strong> {app.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {app.status === 'draft' && (
                    <Link to={`/leaves/apply?edit=${app.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  )}
                  {['draft', 'submitted', 'approved'].includes(app.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(app.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

