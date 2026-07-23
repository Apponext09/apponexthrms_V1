import { useState } from 'react';
import { useLeaveApprovals, useApproveLeave, useRejectLeave } from '../hooks/useLeaveApprovals';
import { CheckCircle2, XCircle, Clock, Inbox, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5 w-full">
        {/* Header */}
        <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Manager Approval Inbox
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review, approve, or reject employee leave applications
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading pending approval queue...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
            <Inbox className="w-9 h-9 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Approval Inbox is Clear</h3>
              <p className="text-xs text-muted-foreground mt-0.5">There are no pending leave requests awaiting your review.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Applications Queue List */}
            <div className="lg:col-span-2 space-y-2.5">
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
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-card border-primary ring-2 ring-primary/20 shadow-2xs'
                        : 'bg-card border-border/80 hover:border-border shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-bold text-sm text-foreground">
                          Employee #{empId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{startDate} to {endDate}</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          • {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      {reasonText && (
                        <p className="text-xs text-muted-foreground italic">
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
                <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
                  <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
                    Review Leave Request
                  </h2>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block font-medium">Employee ID</span>
                      <span className="text-sm font-bold text-foreground">
                        #{empId}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block font-medium">Dates & Duration</span>
                      <span className="font-semibold text-foreground block">
                        {startDate} to {endDate}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Total: {days} Days
                      </span>
                    </div>

                    {reasonText && (
                      <div>
                        <span className="text-muted-foreground block font-medium">Reason</span>
                        <p className="text-foreground font-medium italic mt-0.5">
                          "{reasonText}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Approval Box */}
                  <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground block">
                        Approval / Manager Comment
                      </label>
                      <textarea
                        value={approveComment}
                        onChange={(e) => setApproveComment(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                        placeholder="Optional approval note..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approveLoading}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{approveLoading ? 'Approving...' : 'Approve Request'}</span>
                    </button>
                  </div>

                  {/* Rejection Box */}
                  <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground block">
                        Rejection Reason *
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                        placeholder="Reason for rejecting request..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={rejectLoading}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
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
