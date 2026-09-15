import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, XCircle, Clock, Search, FileText, ExternalLink,
  Sparkles, UserCheck, ShieldCheck, Briefcase, Building2, Send, AlertCircle, Eye, Paperclip,
  Calendar, Layers, Download, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useManagerIjpApprovals, 
  useApproveIjpApplication, 
  useRejectIjpApplication, 
  type ManagerIjpApprovalItem 
} from '@/features/recruitment/hooks/useIjp';
import { formatApiError } from '@/lib/apiError';
import { ResumeViewerModal, resolveResumeUrl } from '@/features/recruitment/components/ResumeViewerModal';

export default function ManagerIjpApprovalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  
  // Action Modals
  const [selectedApproval, setSelectedApproval] = useState<ManagerIjpApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [comments, setComments] = useState('');

  // Resume Viewer State
  const [selectedResumeCandidate, setSelectedResumeCandidate] = useState<any | null>(null);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);

  const { data: approvals = [], isLoading, refetch } = useManagerIjpApprovals();
  const approveMutation = useApproveIjpApplication();
  const rejectMutation = useRejectIjpApplication();

  const filteredApprovals = approvals.filter((item) => {
    const d = item.details || {};
    const matchesSearch = 
      !searchQuery ||
      d.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.jobCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'Rejected').length;

  const handleOpenAction = (item: ManagerIjpApprovalItem, type: 'approve' | 'reject' | 'view') => {
    setSelectedApproval(item);
    setActionType(type);
    setComments(type === 'approve' ? 'Manager clearance (NOC) granted for internal transfer.' : '');
  };

  const handleCloseModal = () => {
    setSelectedApproval(null);
    setActionType(null);
    setComments('');
  };

  const handleViewResume = (item: ManagerIjpApprovalItem) => {
    const d = item.details || {};
    setSelectedResumeCandidate({
      name: d.employeeName || 'Employee Applicant',
      email: d.employeeEmail,
      jobTitle: d.jobTitle,
      resumeUrl: d.resumeUrl,
      experience: d.relevantExperienceYears ? `${d.relevantExperienceYears} Years` : undefined,
    });
    setIsResumeViewerOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedApproval || !actionType) return;

    try {
      if (actionType === 'approve') {
        await approveMutation.mutateAsync({
          id: selectedApproval.id,
          comments: comments.trim() || undefined,
        });
        toast.success(`Endorsement granted for ${selectedApproval.details.employeeName}! Forwarded to Resume Bank & Recruitment.`);
      } else if (actionType === 'reject') {
        if (!comments.trim()) {
          toast.error('Please provide a reason or remarks for declining this transfer request.');
          return;
        }
        await rejectMutation.mutateAsync({
          id: selectedApproval.id,
          comments: comments.trim(),
        });
        toast.success(`Application for ${selectedApproval.details.employeeName} declined.`);
      }
      handleCloseModal();
      refetch();
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to process IJP approval'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pt-1 pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-white/10">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Manager Endorsement & Clearance Queue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Internal Job Transfer Approvals (IJP)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Review and endorse internal promotion or department transfer requests submitted by your direct reports. Approved profiles are automatically forwarded to the <strong>Resume Source Bank</strong> and recruiter shortlisting queue.
          </p>
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setStatusFilter('Pending')}
          className={`cursor-pointer bg-card border rounded-2xl p-5 shadow-2xs transition-all ${
            statusFilter === 'Pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-border/80 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Pending Clearance (NOC)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-2">{pendingCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Approved')}
          className={`cursor-pointer bg-card border rounded-2xl p-5 shadow-2xs transition-all ${
            statusFilter === 'Approved' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border/80 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Manager Endorsed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-2">{approvedCount}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('Rejected')}
          className={`cursor-pointer bg-card border rounded-2xl p-5 shadow-2xs transition-all ${
            statusFilter === 'Rejected' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-border/80 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Declined Requests</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground mt-2">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 p-3.5 rounded-2xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search employee, job title, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs h-10 rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs font-bold rounded-xl h-9 whitespace-nowrap cursor-pointer"
            >
              {s === 'ALL' ? 'All Requests' : s === 'Pending' ? `Pending (${pendingCount})` : s === 'Approved' ? `Approved (${approvedCount})` : `Rejected (${rejectedCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Approvals List */}
      {isLoading ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center text-xs text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading IJP transfer requests...
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No IJP Requests Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusFilter !== 'ALL' 
              ? `No requests currently in "${statusFilter}" status.` 
              : 'There are no pending internal transfer applications from your direct reports at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((item) => {
            const d = item.details || {};
            const isPending = item.status === 'Pending';
            const isApproved = item.status === 'Approved';
            const isRejected = item.status === 'Rejected';

            return (
              <div 
                key={item.id}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-border transition-all flex flex-col gap-4"
              >
                {/* Header: Employee Info & Status Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-700 dark:text-indigo-300 font-black text-sm flex items-center justify-center uppercase shrink-0 border border-indigo-500/30 shadow-2xs">
                      {d.employeeName ? d.employeeName.charAt(0) : 'E'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{d.employeeName}</h4>
                        {d.employeeCode && (
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                            {d.employeeCode}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{d.employeeEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPending ? (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full gap-1 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Pending Clearance (NOC)
                      </Badge>
                    ) : isApproved ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Endorsed & In Resume Bank
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-bold px-3 py-1 rounded-full gap-1 shadow-2xs">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Declined
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Target Role & Transfer Dossier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left Column: Role & Transition */}
                  <div className="space-y-2 p-4 bg-muted/30 rounded-xl border border-border/60">
                    <span className="text-muted-foreground block text-[11px] font-extrabold uppercase tracking-wider">
                      Target Internal Role:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        {d.jobCode}
                      </span>
                      <strong className="text-sm font-bold text-foreground">{d.jobTitle}</strong>
                    </div>
                    {d.reasonForMove && (
                      <div className="text-muted-foreground pt-1">
                        <strong className="text-foreground">Reason for Move:</strong> {d.reasonForMove}
                      </div>
                    )}
                    {d.availability && (
                      <div className="text-muted-foreground">
                        <strong className="text-foreground">Transition Notice:</strong> {d.availability}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Experience, Projects & Attached Resume */}
                  <div className="space-y-2 p-4 bg-muted/30 rounded-xl border border-border/60">
                    <span className="text-muted-foreground block text-[11px] font-extrabold uppercase tracking-wider">
                      Experience & Highlights:
                    </span>
                    {d.relevantExperienceYears && (
                      <div className="text-muted-foreground">
                        <strong className="text-foreground">Relevant Experience:</strong> {d.relevantExperienceYears} years
                      </div>
                    )}
                    {d.currentProjects && (
                      <div className="text-muted-foreground truncate" title={d.currentProjects}>
                        <strong className="text-foreground">Current Projects:</strong> {d.currentProjects}
                      </div>
                    )}

                    {/* Resume Attachment Button */}
                    <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                      {d.resumeUrl ? (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResume(item)}
                          className="h-8 px-3 rounded-lg font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> View Attached Resume <ExternalLink className="w-3 h-3 opacity-70" />
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5" /> No resume file attached
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Statement of Interest Note (If provided) */}
                {d.statementOfInterest && (
                  <div className="p-3.5 bg-muted/20 border border-border/50 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">Statement of Interest:</span>
                    <p className="text-muted-foreground italic leading-relaxed">{d.statementOfInterest}</p>
                  </div>
                )}

                {/* Manager Comments Display if already reviewed */}
                {d.managerComments && (
                  <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">Manager Endorsement Remarks:</span>
                    <p className="text-muted-foreground">{d.managerComments}</p>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-border/60 gap-3">
                  <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Requested on: <strong className="text-foreground">{new Date(item.createdAt).toLocaleDateString()}</strong>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(item, 'view')}
                      className="text-xs rounded-xl h-9 px-3.5 font-bold gap-1.5 border-border hover:bg-muted cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details
                    </Button>

                    {isPending && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAction(item, 'reject')}
                          className="text-xs rounded-xl h-9 px-3.5 font-bold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenAction(item, 'approve')}
                          className="text-xs rounded-xl h-9 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Grant Endorsement (NOC)
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESUME VIEWER MODAL */}
      <ResumeViewerModal
        open={isResumeViewerOpen}
        onOpenChange={setIsResumeViewerOpen}
        candidate={selectedResumeCandidate}
      />

      {/* APPROVAL / REJECTION / DETAIL DIALOG */}
      <Dialog open={!!selectedApproval && !!actionType} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl rounded-2xl border-border/80 shadow-2xl p-6 space-y-4">
          {selectedApproval && (() => {
            const d = selectedApproval.details || {};
            const isApproveAction = actionType === 'approve';
            const isRejectAction = actionType === 'reject';

            return (
              <>
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    {isApproveAction && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    {isRejectAction && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                    {actionType === 'view' && <FileText className="w-5 h-5 text-primary" />}
                    {isApproveAction ? 'Grant Clearance & Endorse Transfer' : isRejectAction ? 'Decline Internal Application' : 'Application Dossier Details'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {isApproveAction 
                      ? 'Confirm manager clearance (NOC). The candidate profile and resume will be immediately published to the Resume Source Bank for HR screening.' 
                      : isRejectAction 
                      ? 'Provide reason for refusal. The applicant will be notified.' 
                      : `Submitted by ${d.employeeName} for ${d.jobTitle}.`}
                  </DialogDescription>
                </DialogHeader>

                {/* Candidate & Job Summary */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Applicant Employee</span>
                      <strong className="text-sm font-bold text-foreground">{d.employeeName}</strong>
                      <span className="text-muted-foreground block text-[11px]">{d.employeeEmail}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Target Internal Role</span>
                      <strong className="text-sm font-bold text-foreground">{d.jobTitle}</strong>
                      <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block">{d.jobCode}</span>
                    </div>
                  </div>

                  {d.statementOfInterest && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="font-bold text-foreground block text-[11px] mb-0.5">Statement of Interest:</span>
                      <p className="text-muted-foreground italic leading-relaxed">{d.statementOfInterest}</p>
                    </div>
                  )}

                  {d.resumeUrl && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">Attached Resume:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewResume(selectedApproval)}
                        className="h-7 px-2.5 text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                      >
                        <FileText className="w-3.5 h-3.5" /> Preview Resume Document
                      </Button>
                    </div>
                  )}
                </div>

                {(isApproveAction || isRejectAction) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {isApproveAction ? 'Endorsement Remarks / Transition Comments (Optional)' : 'Reason for Declining (Required) *'}
                    </label>
                    <Textarea 
                      placeholder={isApproveAction ? 'Add notes regarding employee handover, transition readiness...' : 'Please specify why this transfer is not approved at this time...'}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="text-xs rounded-xl bg-background border-border resize-none"
                    />
                  </div>
                )}

                <DialogFooter className="pt-2 flex items-center justify-between gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseModal}
                    className="rounded-xl text-xs font-bold h-9 cursor-pointer"
                  >
                    Close
                  </Button>

                  {isApproveAction && (
                    <Button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={handleConfirmAction}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
                    >
                      {approveMutation.isPending ? 'Endorsing...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Endorsement & Forward</>}
                    </Button>
                  )}

                  {isRejectAction && (
                    <Button
                      type="button"
                      disabled={rejectMutation.isPending}
                      onClick={handleConfirmAction}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs h-9 gap-1.5 shadow-xs cursor-pointer"
                    >
                      {rejectMutation.isPending ? 'Declining...' : <><XCircle className="w-3.5 h-3.5" /> Confirm Decline</>}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
