'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLeaveApprovals, useApproveLeave, useRejectLeave } from '../hooks/useLeaveApprovals';

export function ApprovalInboxPage() {
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');

  const { applications, isLoading, error } = useLeaveApprovals({ page: 1, pageSize: 20 });
  const { approveLeave, isLoading: approveLoading } = useApproveLeave();
  const { rejectLeave, isLoading: rejectLoading } = useRejectLeave();

  const selectedApp = selectedApplicationId
    ? applications.find((app) => app.id === selectedApplicationId)
    : null;

  const handleApprove = async () => {
    if (selectedApplicationId) {
      await approveLeave({ applicationId: selectedApplicationId, comment: approveComment });
      setSelectedApplicationId(null);
      setApproveComment('');
    }
  };

  const handleReject = async () => {
    if (selectedApplicationId && rejectReason.trim()) {
      await rejectLeave({ applicationId: selectedApplicationId, reason: rejectReason });
      setSelectedApplicationId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Approval Inbox</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="col-span-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-10">Loading...</div>
          ) : applications.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No pending approvals</p>
            </Card>
          ) : (
            applications.map((app) => (
              <Card
                key={app.id}
                className={`p-4 cursor-pointer hover:shadow-lg transition ${
                  selectedApplicationId === app.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedApplicationId(app.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Employee ID: {app.employeeId}</h3>
                    <p className="text-gray-600 text-sm">
                      {new Date(app.applicationStartDate).toLocaleDateString()} to{' '}
                      {new Date(app.applicationEndDate).toLocaleDateString()}
                    </p>
                    <p className="text-gray-700 mt-1">Duration: {app.totalDays} days</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Pending
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedApp ? (
          <div className="col-span-1">
            <Card className="p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Review Leave Request</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Employee ID</label>
                  <p className="text-lg font-semibold">{selectedApp.employeeId}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-lg font-semibold">{selectedApp.totalDays} days</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Dates</label>
                  <p>
                    {new Date(selectedApp.applicationStartDate).toLocaleDateString()} to{' '}
                    {new Date(selectedApp.applicationEndDate).toLocaleDateString()}
                  </p>
                </div>

                {selectedApp.reasonDescription && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reason</label>
                    <p>{selectedApp.reasonDescription}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-6 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Approval Comment</label>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional comment..."
                  />
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={approveLoading}
                >
                  {approveLoading ? 'Approving...' : 'Approve'}
                </Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Please provide rejection reason..."
                  />
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleReject}
                  disabled={rejectLoading || !rejectReason.trim()}
                >
                  {rejectLoading ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="col-span-1 p-6">
            <p className="text-gray-500 text-center">Select an application to review</p>
          </Card>
        )}
      </div>
    </div>
  );
}

