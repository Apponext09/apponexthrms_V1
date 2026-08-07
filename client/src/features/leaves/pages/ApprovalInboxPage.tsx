import { useState, useEffect } from 'react';
import { useLeaveApprovals, useApproveLeave, useRejectLeave, useProcessedApprovals } from '../hooks/useLeaveApprovals';
import { CheckCircle2, XCircle, Clock, Inbox, Calendar, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export function ApprovalInboxPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'processed' | 'encashment'>('pending');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Encashment states
  const [encashmentRequests, setEncashmentRequests] = useState<any[]>([]);
  const [encashmentLoading, setEncashmentLoading] = useState(false);
  const [selectedEncashmentId, setSelectedEncashmentId] = useState<number | null>(null);
  const [encashmentActionNotes, setEncashmentActionNotes] = useState('');

  const { applications: pendingApps, isLoading: pendingLoading, error: pendingError, refetch: refetchPending } = useLeaveApprovals({ page: 1, pageSize: 50 });
  const { applications: processedApps, isLoading: processedLoading, error: processedError, refetch: refetchProcessed } = useProcessedApprovals({ page: 1, pageSize: 50 });

  const { approveLeave, isLoading: approveLoading } = useApproveLeave();
  const { rejectLeave, isLoading: rejectLoading } = useRejectLeave();

  const fetchPendingEncashments = async () => {
    setEncashmentLoading(true);
    try {
      const res = await apiClient.get('/leaves/encashments/pending');
      if (res.data?.success) {
        setEncashmentRequests(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending encashments', err);
    } finally {
      setEncashmentLoading(false);
    }
  };

  useEffect(() => {
    refetchPending();
    refetchProcessed();
    if (activeTab === 'encashment') {
      fetchPendingEncashments();
    }
  }, [activeTab, selectedCompanyId]);

  const handleProcessEncashment = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'reject' && !encashmentActionNotes.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    try {
      const res = await apiClient.post(`/leaves/encashments/${id}/${action}`, {
        comments: encashmentActionNotes,
        reason: encashmentActionNotes,
      });
      if (res.data?.success) {
        toast.success(`Leave encashment request ${action}d successfully!`);
        setEncashmentActionNotes('');
        setSelectedEncashmentId(null);
        fetchPendingEncashments();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || `Failed to ${action} encashment request`);
    }
  };

  const applications = activeTab === 'pending' ? pendingApps : processedApps;
  const isLoading = activeTab === 'pending' ? pendingLoading : processedLoading;
  const error = activeTab === 'pending' ? pendingError : processedError;
  const refetch = activeTab === 'pending' ? refetchPending : refetchProcessed;

  const selectedApp = selectedApplicationId
    ? applications.find((app) => app.id === selectedApplicationId)
    : applications.length > 0
    ? applications[0]
    : null;

  useEffect(() => {
    if (!selectedApplicationId) {
      setHistoryLogs([]);
      return;
    }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await apiClient.get(`/leaves/applications/${selectedApplicationId}/approvals`);
        if (res.data?.success) {
          setHistoryLogs(res.data.data || []);
        }
      } catch (err) {
        console.warn('Failed to load approval history logs', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedApplicationId]);

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

        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-4 pb-1">
          <button
            onClick={() => { setActiveTab('pending'); setSelectedApplicationId(null); }}
            className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'pending'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Leaves ({pendingApps.length})
          </button>
          <button
            onClick={() => { setActiveTab('processed'); setSelectedApplicationId(null); }}
            className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'processed'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Processed Approvals History ({processedApps.length})
          </button>
          <button
            onClick={() => { setActiveTab('encashment'); setSelectedEncashmentId(null); }}
            className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'encashment'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Encashment Requests ({encashmentRequests.length})
          </button>
        </div>

        {activeTab === 'encashment' ? (
          encashmentLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading encashment requests...</p>
            </div>
          ) : encashmentRequests.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
              <Inbox className="w-9 h-9 text-muted-foreground/50 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-foreground">Encashment Inbox is Clear</h3>
                <p className="text-xs text-muted-foreground mt-0.5">There are no pending leave encashment requests awaiting your review.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Queue List */}
              <div className="lg:col-span-2 space-y-2.5">
                {encashmentRequests.map((e) => {
                  const isSelected = selectedEncashmentId === e.id;
                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEncashmentId(e.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-card border-primary ring-2 ring-primary/20 shadow-2xs'
                          : 'bg-card border-border/80 hover:border-border shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-bold text-sm text-foreground">
                            {e.employeeFirstName} {e.employeeLastName} ({e.employeeCode})
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending Review</span>
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <span>Leave Type: <span className="font-bold text-foreground">{e.leaveTypeName} ({e.leaveTypeCode})</span></span>
                          <span>•</span>
                          <span>Encash Days: <span className="font-bold text-foreground">{e.encashment_days || e.encashmentDays} Days</span></span>
                          <span>•</span>
                          <span>Payout: <span className="font-extrabold text-violet-600 font-mono">₹{e.total_amount || e.totalAmount}</span></span>
                        </div>

                        {e.reason && <p className="text-xs text-muted-foreground italic">"{e.reason}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Review Panel */}
              <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
                <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
                  Review Encashment Request
                </h2>

                {selectedEncashmentId ? (() => {
                  const sel = encashmentRequests.find(r => r.id === selectedEncashmentId);
                  if (!sel) return <p className="text-xs text-muted-foreground">Select a request to review details.</p>;
                  return (
                    <div className="space-y-4">
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block font-medium">Employee</span>
                          <span className="text-sm font-bold text-foreground block">
                            {sel.employeeFirstName} {sel.employeeLastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block">Code: {sel.employeeCode}</span>
                        </div>
                        <div className="border-t border-border/60 pt-2 mt-2">
                          <span className="text-muted-foreground block font-medium">Encashment Payout Details</span>
                          <span className="font-bold text-foreground block text-sm">₹{sel.total_amount || sel.totalAmount} Total Amount</span>
                          <span className="text-[10px] text-muted-foreground block">({sel.encashment_days || sel.encashmentDays} days @ ₹{sel.daily_rate || sel.dailyRate}/day)</span>
                        </div>
                        {sel.reason && (
                          <div className="border-t border-border/60 pt-2 mt-2">
                            <span className="text-muted-foreground block font-medium">Reason</span>
                            <p className="text-foreground italic mt-0.5">"{sel.reason}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action Inputs */}
                      <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-foreground block">
                            Comments / Reason
                          </label>
                          <textarea
                            value={encashmentActionNotes}
                            onChange={(e) => setEncashmentActionNotes(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                            placeholder="Add approval comments or rejection reason..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleProcessEncashment(sel.id, 'approve')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProcessEncashment(sel.id, 'reject')}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground">Select an encashment request from the left list to review and take action.</p>
                )}
              </div>
            </div>
          )
        ) : isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading approval data...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
            <Inbox className="w-9 h-9 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {activeTab === 'pending' ? 'Approval Inbox is Clear' : 'No Processed Approvals'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === 'pending'
                  ? 'There are no pending leave requests awaiting your review.'
                  : 'You have not processed any leave applications recently.'}
              </p>
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
                const empName = `${appItem.employeeFirstName || appItem.employee_first_name || ''} ${appItem.employeeLastName || appItem.employee_last_name || ''}`.trim() || `Employee #${empId}`;
                const empCode = appItem.employeeCode || appItem.employee_code || '';

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
                          {empName} {empCode ? `(${empCode})` : ''}
                        </span>
                        {appItem.status?.toLowerCase() === 'approved' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Approved</span>
                          </span>
                        ) : appItem.status?.toLowerCase() === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
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
              const empName = `${rawSelected.employeeFirstName || rawSelected.employee_first_name || ''} ${rawSelected.employeeLastName || rawSelected.employee_last_name || ''}`.trim() || `Employee #${empId}`;
              const empCode = rawSelected.employeeCode || rawSelected.employee_code || '';

              return (
                <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
                  <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
                    Review Leave Request
                  </h2>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block font-medium">Employee</span>
                      <span className="text-sm font-bold text-foreground block">
                        {empName}
                      </span>
                      {empCode && (
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          Code: {empCode} (ID: #{empId})
                        </span>
                      )}
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

                  {['approved', 'rejected', 'cancelled'].includes(rawSelected.status?.toLowerCase()) ? (
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <span className="text-[11px] font-bold text-foreground block">
                        Approval & Comment History
                      </span>
                      {historyLoading ? (
                        <p className="text-[10px] text-muted-foreground italic">Loading comment history...</p>
                      ) : historyLogs.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">No comments or logs recorded for this action.</p>
                      ) : (
                        <div className="space-y-2">
                          {historyLogs.map((log: any, idx: number) => (
                            <div key={log.id || idx} className="p-2.5 bg-muted/60 rounded-xl border text-[11px] space-y-1">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                                <span>Approver Level {log.approval_level || 1}</span>
                                <span>{new Date(log.approval_date || log.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="font-black text-foreground capitalize text-[10px]">
                                Status: <span className={log.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}>{log.status}</span>
                              </p>
                              {log.comments && (
                                <p className="text-muted-foreground font-medium bg-card p-1.5 rounded border border-border/50 mt-1">
                                  {log.comments}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
