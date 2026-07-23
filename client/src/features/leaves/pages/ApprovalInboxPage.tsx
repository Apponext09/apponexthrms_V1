import React, { useState } from 'react';
import { useLeaveApprovals, useApproveLeave, useRejectLeave } from '../hooks/useLeaveApprovals';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { CheckCircle2, XCircle, Clock, Inbox, Calendar, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ApprovalInboxPage() {
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');

  const { applications, isLoading, error, refetch } = useLeaveApprovals({ page: 1, pageSize: 50 });
  const { approveLeave, isLoading: approveLoading } = useApproveLeave();
  const { rejectLeave, isLoading: rejectLoading } = useRejectLeave();

  const selectedApp = selectedApplicationId
    ? applications.find((app) => app.id === selectedApplicationId)
    : applications.length > 0
    ? applications[0]
    : null;

  const handleApprove = async () => {
    const appId = selectedApp?.id || selectedApplicationId;
    if (appId) {
      try {
        await approveLeave({ applicationId: appId, comment: approveComment });
        toast.success('Leave application approved successfully!');
        setSelectedApplicationId(null);
        setApproveComment('');
        refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to approve leave');
      }
    }
  };

  const handleReject = async () => {
    const appId = selectedApp?.id || selectedApplicationId;
    if (!rejectReason.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    if (appId) {
      try {
        await rejectLeave({ applicationId: appId, reason: rejectReason });
        toast.success('Leave application rejected');
        setSelectedApplicationId(null);
        setRejectReason('');
        refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to reject leave');
      }
    }
  };

  return (
    <div>
      <LeaveHeaderNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Manager Approval Inbox
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review, approve, or reject employee leave applications
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Loading pending approval queue...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Approval Inbox is Clear</h3>
          <p className="text-xs text-slate-400">There are no pending leave requests awaiting your review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Applications Queue List */}
          <div className="lg:col-span-2 space-y-3">
            {applications.map((appItem: any) => {
              const activeId = selectedApp?.id;
              const isSelected = activeId === appItem.id;
              const startDate = appItem.applicationStartDate || appItem.application_start_date;
              const endDate = appItem.applicationEndDate || appItem.application_end_date;
              const days = appItem.totalDays || appItem.total_days || 1;
              const empId = appItem.employeeId || appItem.employee_id;
              const reasonText = appItem.reason || appItem.reasonDescription;

              return (
                <div
                  key={appItem.id}
                  onClick={() => setSelectedApplicationId(appItem.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Employee #{empId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending Review</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{startDate} to {endDate}</span>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        • {days} {days === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    {reasonText && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        "{reasonText}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Review Panel */}
          {selectedApp && (() => {
            const rawSelected = selectedApp as any;
            const empId = rawSelected.employeeId || rawSelected.employee_id;
            const startDate = rawSelected.applicationStartDate || rawSelected.application_start_date;
            const endDate = rawSelected.applicationEndDate || rawSelected.application_end_date;
            const days = rawSelected.totalDays || rawSelected.total_days || 1;
            const reasonText = rawSelected.reason || rawSelected.reasonDescription;

            return (
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 sticky top-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  Review Leave Request
                </h2>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Employee ID</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      #{empId}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Dates & Duration</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {startDate} to {endDate}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Total: {days} Days
                    </span>
                  </div>

                  {reasonText && (
                    <div>
                      <span className="text-slate-400 block font-medium">Reason</span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium italic mt-0.5">
                        "{reasonText}"
                      </p>
                    </div>
                  )}
                </div>

              {/* Approval Box */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Approval / Manager Comment
                  </label>
                  <textarea
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    placeholder="Optional approval note..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{approveLoading ? 'Approving...' : 'Approve Request'}</span>
                </button>
              </div>

              {/* Rejection Box */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    placeholder="Reason for rejecting request..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejectLoading}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{rejectLoading ? 'Rejecting...' : 'Reject Request'}</span>
                </button>
              </div>
            </div>
          );
        })()}
        </div>
      )}
    </div>
  </div>
);
}
