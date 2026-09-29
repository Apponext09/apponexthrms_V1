import { useState, useEffect } from 'react';
import { useLeaveApprovals, useApproveLeave, useRejectLeave, useProcessedApprovals } from '../hooks/useLeaveApprovals';
import { CheckCircle2, XCircle, Clock, Inbox, Calendar, AlertCircle, RefreshCw, Info, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useCompanyStore } from '@/features/settings/store/companyStore';

const formatDateDMY = (dateVal: any): string => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.trim();
    const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return String(dateVal);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export function ApprovalInboxPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'processed' | 'encashment'>('pending');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // HR Override modal states
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideAction, setOverrideAction] = useState<'force_approve' | 'force_reject' | 'grant_without_deduction' | 'convert_to_lop'>('force_approve');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

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

  const rawApplications = activeTab === 'pending' ? pendingApps : processedApps;
  const applications = Array.from(new Map((rawApplications || []).map((app: any) => [app.id, app])).values());
  const isLoading = activeTab === 'pending' ? pendingLoading : processedLoading;
  const error = activeTab === 'pending' ? pendingError : processedError;
  const refetch = activeTab === 'pending' ? refetchPending : refetchProcessed;

  const selectedApp = selectedApplicationId
    ? applications.find((app) => app.id === selectedApplicationId)
    : applications.length > 0
    ? applications[0]
    : null;

  useEffect(() => {
    const appId = selectedApp?.id;
    if (!appId) {
      setHistoryLogs([]);
      return;
    }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await apiClient.get(`/leaves/applications/${appId}/approvals`);
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
  }, [selectedApp?.id]);

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

  const handleHrOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const appId = selectedApp?.id || selectedApplicationId;
    if (!appId) return;

    if (!overrideNotes.trim()) {
      toast.error('Please enter administrative override notes / justification.');
      return;
    }

    setOverrideLoading(true);
    try {
      const res = await apiClient.post(`/leaves/applications/${appId}/hr-override`, {
        decision: overrideAction,
        adminNotes: overrideNotes.trim(),
        comment: overrideNotes.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'HR Override executed successfully!');
        setIsOverrideModalOpen(false);
        setOverrideNotes('');
        setSelectedApplicationId(null);
        refetch();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to execute HR override');
    } finally {
      setOverrideLoading(false);
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
            <span>{typeof error === 'string' ? error : (error as any)?.message || 'An error occurred'}</span>
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
                const isApproved = appItem.status?.toLowerCase() === 'approved';
                const isRejected = appItem.status?.toLowerCase() === 'rejected';
                const approverName = `${appItem.approverFirstName || ''} ${appItem.approverLastName || ''}`.trim() || appItem.approverEmail || (isApproved ? 'Manager / HR' : 'Reviewing Authority');
                const actionDate = appItem.approval_date || appItem.approvalDate || appItem.updated_at || appItem.updatedAt || appItem.created_at;
                const commentOrReason = isRejected 
                  ? (appItem.rejection_reason || appItem.rejectionReason || appItem.admin_notes || appItem.comments || 'Application was rejected.')
                  : (appItem.admin_notes || appItem.comments || 'Leave request approved.');

                return (
                  <div
                    key={appItem.id}
                    onClick={() => setSelectedApplicationId(appItem.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-card border-primary ring-2 ring-primary/20 shadow-2xs'
                        : 'bg-card border-border/80 hover:border-border shadow-2xs'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {empName} {empCode ? `(${empCode})` : ''}
                        </span>
                        {isApproved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Approved</span>
                          </span>
                        ) : isRejected ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{formatDateDMY(startDate)} to {formatDateDMY(endDate)}</span>
                        </span>
                        <span className="font-semibold text-foreground">
                          • {days} {days === 1 ? 'day' : 'days'}
                        </span>
                        {appItem.leaveTypeName && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400">{appItem.leaveTypeName}</span>
                          </>
                        )}
                      </div>

                      {reasonText && (
                        <p className="text-xs text-muted-foreground italic">
                          "{reasonText}"
                        </p>
                      )}

                      {/* Processed Details Badge/Section */}
                      {(isApproved || isRejected) && (
                        <div className={`mt-2 p-2.5 rounded-lg border text-[11px] space-y-1.5 ${
                          isApproved 
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' 
                            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                        }`}>
                          <div className="flex items-center justify-between font-semibold">
                            <span>
                              {isApproved ? '✓ Approved' : '✕ Rejected'} {approverName ? `by ${approverName}` : ''}
                            </span>
                            {actionDate && (
                              <span className="text-[10px] opacity-80 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" /> {formatDateDMY(actionDate)}
                              </span>
                            )}
                          </div>
                          <div className="pt-1 border-t border-current/10 flex items-start gap-1 font-medium text-[11px]">
                            <span className="font-bold shrink-0">{isRejected ? 'Reason:' : 'Approver Note:'}</span>
                            <span className="italic">"{commentOrReason}"</span>
                          </div>
                        </div>
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
              const leaveType = rawSelected.leaveTypeName || rawSelected.leave_type_name;
              const isProcessed = ['approved', 'rejected', 'cancelled'].includes(rawSelected.status?.toLowerCase());

              return (
                <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
                  <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5 flex items-center justify-between">
                    <span>Review Leave Request</span>
                    {isProcessed && (
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                        rawSelected.status?.toLowerCase() === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {rawSelected.status}
                      </span>
                    )}
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

                    {leaveType && (
                      <div>
                        <span className="text-muted-foreground block font-medium">Leave Type</span>
                        <span className="font-semibold text-violet-600 dark:text-violet-400 block">
                          {leaveType}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-muted-foreground block font-medium">Dates & Duration</span>
                      <span className="font-semibold text-foreground block">
                        {formatDateDMY(startDate)} to {formatDateDMY(endDate)}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Total: {days} Days
                      </span>
                    </div>

                    {reasonText && (
                      <div>
                        <span className="text-muted-foreground block font-medium">Reason for Leave</span>
                        <p className="text-foreground font-medium italic mt-0.5 bg-muted/40 p-2 rounded-lg border border-border/40">
                          "{reasonText}"
                        </p>
                      </div>
                    )}
                  </div>

                  {isProcessed ? (
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <span className="text-[11px] font-bold text-foreground block">
                        Approval & Comment History
                      </span>
                      {historyLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Loading approval details...</span>
                        </div>
                      ) : historyLogs.length > 0 ? (
                        <div className="space-y-2.5">
                          {historyLogs.map((log: any, idx: number) => {
                            const isLogApproved = String(log.status || '').toLowerCase() === 'approved';
                            const isLogRejected = String(log.status || '').toLowerCase() === 'rejected';
                            const logApprover = log.approver_name || 'Approver';
                            const logRole = log.approver_role || `Level ${log.approval_level || 1}`;
                            const logComment = log.comments || log.rejection_reason || (isLogRejected ? 'Application was rejected.' : 'Application approved.');
                            const logActionDate = log.approval_date || log.created_at || rawSelected.updated_at;

                            return (
                              <div 
                                key={log.id || idx} 
                                className={`p-3 rounded-xl border text-[11px] space-y-2 ${
                                  isLogApproved 
                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40' 
                                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-800/40'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <span className="font-bold text-foreground block">
                                      {logApprover}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {logRole} {log.approver_code ? `(${log.approver_code})` : ''}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                                      isLogApproved 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                    }`}>
                                      {log.status || (isLogApproved ? 'Approved' : 'Rejected')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">
                                      {formatDateDMY(logActionDate)}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                                  <span className="text-[10px] font-bold text-muted-foreground block">
                                    {isLogRejected ? 'Reason for Rejection:' : 'Approver Comment / Reason:'}
                                  </span>
                                  <p className="text-[11px] font-medium text-foreground mt-0.5 italic">
                                    "{logComment}"
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Fallback when historyLogs array is empty but application is processed */
                        (() => {
                          const isAppApproved = rawSelected.status?.toLowerCase() === 'approved';
                          const isAppRejected = rawSelected.status?.toLowerCase() === 'rejected';
                          const fallbackApprover = rawSelected.approverFirstName ? `${rawSelected.approverFirstName} ${rawSelected.approverLastName || ''}`.trim() : rawSelected.approverEmail || (isAppApproved ? 'Manager / HR' : 'Reviewing Authority');
                          const fallbackDate = rawSelected.approval_date || rawSelected.approvalDate || rawSelected.updated_at || rawSelected.updatedAt || rawSelected.created_at || rawSelected.createdAt;
                          const fallbackComment = isAppRejected 
                            ? (rawSelected.rejection_reason || rawSelected.rejectionReason || rawSelected.admin_notes || rawSelected.comments || 'Application was rejected.')
                            : (rawSelected.admin_notes || rawSelected.comments || 'Leave request approved.');

                          return (
                            <div className={`p-3 rounded-xl border text-[11px] space-y-2 ${
                              isAppApproved
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40'
                                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-800/40'
                            }`}>
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="font-bold text-foreground block">
                                    {fallbackApprover}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Reviewing Authority
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                                    isAppApproved
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                  }`}>
                                    {rawSelected.status}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">
                                    {formatDateDMY(fallbackDate)}
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                                <span className="text-[10px] font-bold text-muted-foreground block">
                                  {isAppRejected ? 'Reason for Rejection:' : 'Approver Comment / Reason:'}
                                </span>
                                <p className="text-[11px] font-medium text-foreground mt-0.5 italic">
                                  "{fallbackComment}"
                                </p>
                              </div>
                            </div>
                          );
                        })()
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

                      {/* HR Admin Override Section */}
                      <div className="pt-3 border-t border-dashed border-border/80">
                        <button
                          type="button"
                          onClick={() => setIsOverrideModalOpen(true)}
                          className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>⚡ HR Admin Override</span>
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

      {/* ─── HR Admin Override Modal ────────────────────────────────────────── */}
      {isOverrideModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">HR Administrative Override</h3>
                  <p className="text-[11px] text-muted-foreground">Directly override workflow or grant special approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHrOverride} className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-bold text-foreground">
                    {(selectedApp as any).employeeFirstName || (selectedApp as any).employee_first_name} {(selectedApp as any).employeeLastName || (selectedApp as any).employee_last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold text-foreground">
                    {(selectedApp as any).totalDays || (selectedApp as any).total_days} Days ({formatDateDMY((selectedApp as any).applicationStartDate || (selectedApp as any).application_start_date)} to {formatDateDMY((selectedApp as any).applicationEndDate || (selectedApp as any).application_end_date)})
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Override Decision *
                </label>
                <select
                  value={overrideAction}
                  onChange={(e: any) => setOverrideAction(e.target.value)}
                  className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none font-semibold"
                >
                  <option value="force_approve">Force Approve (Bypass Manager)</option>
                  <option value="force_reject">Force Reject</option>
                  <option value="grant_without_deduction">Grant Without Deduction (Special Discretion)</option>
                  <option value="convert_to_lop">Convert Excess Days to LOP (Loss of Pay)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Administrative Reason / Justification *
                </label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                  placeholder="State the administrative rationale for this override (logged for audit)..."
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {overrideLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Override...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Execute Override</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
