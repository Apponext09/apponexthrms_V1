import React, { useState } from 'react';
import { useLeaveApplications, useCancelLeave } from '../hooks/useLeave';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { Link } from 'react-router-dom';
import { Calendar, Plus, RefreshCw, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const LEAVE_TYPE_NAMES: Record<number, string> = {
  1: 'Casual Leave (CL)',
  2: 'Sick Leave (SL)',
  3: 'Earned Leave (EL)',
  4: 'Privilege Leave (PL)',
};

export function MyLeavesPage() {
  const [page] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const { applications, isLoading, error, refetch } = useLeaveApplications({
    page,
    pageSize: 50,
    status: selectedStatus,
  });
  const { cancelLeave } = useCancelLeave();

  const handleCancel = async (applicationId: number) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason) {
      try {
        await cancelLeave({ applicationId, reason });
        toast.success('Leave application cancelled successfully');
        refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to cancel leave application');
      }
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'submitted':
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center space-x-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div>
      <LeaveHeaderNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Leave Applications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View history and track status of submitted leave requests
          </p>
        </div>

        <Link
          to="/leaves/apply"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-1">
        {['all', 'submitted', 'approved', 'rejected', 'cancelled'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status === 'all' ? undefined : status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
              (selectedStatus === status || (status === 'all' && !selectedStatus))
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Fetching leave applications from server...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Leave Applications Found</h3>
          <p className="text-xs text-slate-400">You haven't submitted any leave applications matching this filter.</p>
          <Link
            to="/leaves/apply"
            className="inline-block mt-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800"
          >
            Submit First Request
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((app: any) => {
            const leaveTypeName = LEAVE_TYPE_NAMES[app.leave_type_id || app.leaveTypeId] || `Leave Type #${app.leave_type_id || app.leaveTypeId}`;
            const startDate = app.application_start_date || app.applicationStartDate;
            const endDate = app.application_end_date || app.applicationEndDate;
            const totalDays = app.total_days || app.totalDays || 1;

            return (
              <div
                key={app.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {leaveTypeName}
                    </h3>
                    {renderStatusBadge(app.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{startDate} to {endDate}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-bold">
                      <span>Duration:</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono">
                        {totalDays} {totalDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>

                  {app.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 italic">
                      "{app.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {['submitted', 'draft', 'pending'].includes(app.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancel(app.id)}
                      className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
}
