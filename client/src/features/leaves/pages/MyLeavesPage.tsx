import { useState } from 'react';
import { useLeaveApplications, useCancelLeave } from '../hooks/useLeave';
import { Link } from 'react-router-dom';
import { Calendar, Plus, RefreshCw, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';
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
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'submitted':
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              My Leave Applications
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              View leave history and track request status in real-time
            </p>
          </div>

          
            
            <span>Apply for Leave</span>
          
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['all', 'submitted', 'approved', 'rejected', 'cancelled'].map((status) => {
            const isActive = selectedStatus === status || (status === 'all' && !selectedStatus);
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status === 'all' ? undefined : status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                    : 'bg-card text-muted-foreground border-border/80 hover:bg-accent hover:text-foreground'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs font-medium">Fetching leave applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
            <FileText className="w-9 h-9 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-foreground">No Leave Applications Found</h3>
              <p className="text-xs text-muted-foreground mt-0.5">You haven't submitted any leave requests under this status.</p>
            </div>
            <Link
              to="/leaves/apply"
              className="inline-block px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs rounded-lg border border-primary/20 transition-colors"
            >
              Submit First Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {applications.map((app: any) => {
              const leaveTypeName = LEAVE_TYPE_NAMES[app.leave_type_id || app.leaveTypeId] || `Leave Type #${app.leave_type_id || app.leaveTypeId}`;
              const startDate = app.application_start_date || app.applicationStartDate;
              const endDate = app.application_end_date || app.applicationEndDate;
              const totalDays = app.total_days || app.totalDays || 1;

              return (
                <div
                  key={app.id}
                  className="p-4 bg-card rounded-xl border border-border/80 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-bold text-foreground">
                        {leaveTypeName}
                      </h3>
                      {renderStatusBadge(app.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{startDate} to {endDate}</span>
                      </div>

                      <div className="flex items-center space-x-1 text-foreground font-semibold">
                        <span>Duration:</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono text-[11px]">
                          {totalDays} {totalDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    {app.reason && (
                      <p className="text-xs text-muted-foreground pt-0.5 italic">
                        "{app.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    {['submitted', 'draft', 'pending'].includes(app.status?.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => handleCancel(app.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
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
