import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi, ExpenseClaim, ExpenseCategory, TravelRequest, TravelAdvance } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Paperclip,
  Filter,
  Search,
  Activity,
  Clock,
  Zap,
  X,
  CheckCircle,
  IndianRupee,
  Banknote
} from 'lucide-react';

// Status pipeline config
const PIPELINE_STAGES: { status: string; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { status: 'pending_level_1', label: 'Team Lead Queue', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-950/60', borderColor: 'border-amber-300 dark:border-amber-700' },
  { status: 'pending_level_2', label: 'Manager Queue', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-950/60', borderColor: 'border-blue-300 dark:border-blue-700' },
  { status: 'pending_manager', label: 'Manager Queue', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-950/60', borderColor: 'border-blue-300 dark:border-blue-700' },
  { status: 'submitted', label: 'Manager Queue', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-950/60', borderColor: 'border-blue-300 dark:border-blue-700' },
  { status: 'pending_level_3', label: 'HR Queue', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-950/60', borderColor: 'border-purple-300 dark:border-purple-700' },
  { status: 'pending_finance', label: 'Finance Queue ✅', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-950/60', borderColor: 'border-indigo-300 dark:border-indigo-700' },
  { status: 'payment_pending', label: 'Payout Processing', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-950/60', borderColor: 'border-emerald-300 dark:border-emerald-700' },
  { status: 'paid', label: 'Paid', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-950/60', borderColor: 'border-emerald-300 dark:border-emerald-700' },
  { status: 'approved', label: 'Approved', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-950/60', borderColor: 'border-emerald-300 dark:border-emerald-700' },
  { status: 'returned', label: 'Returned to Employee', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-950/60', borderColor: 'border-orange-300 dark:border-orange-700' },
  { status: 'rejected', label: 'Rejected', color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-950/60', borderColor: 'border-rose-300 dark:border-rose-700' },
];

function getStageConfig(status: string) {
  return PIPELINE_STAGES.find(s => s.status === status.toLowerCase()) || {
    label: status,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-700',
  };
}

interface ApprovalToast {
  type: 'success' | 'error';
  title: string;
  subtitle?: string;
}

export const FinanceVerificationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [pipelineClaims, setPipelineClaims] = useState<ExpenseClaim[]>([]);
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [travelAdvances, setTravelAdvances] = useState<TravelAdvance[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'pipeline'>('queue');
  // Advance approve/reject inline modals
  const [advanceApproveModal, setAdvanceApproveModal] = useState<TravelAdvance | null>(null);
  const [advanceRejectModal, setAdvanceRejectModal] = useState<TravelAdvance | null>(null);
  const [advApproveAmt, setAdvApproveAmt] = useState(0);
  const [advApproveNotes, setAdvApproveNotes] = useState('');
  const [advRejectReason, setAdvRejectReason] = useState('');
  const [advActionLoading, setAdvActionLoading] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<ApprovalToast | null>(null);

  // Filters State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_finance');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Pipeline search
  const [pipelineSearch, setPipelineSearch] = useState('');

  // Form for partial/full item adjustments
  const [itemAdjustments, setItemAdjustments] = useState<
    Array<{ id: number; claimedAmount: number; approvedAmount: number; adjustmentReason: string }>
  >([]);
  const [financeComments, setFinanceComments] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [forceApproving, setForceApproving] = useState<number | string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (t: ApprovalToast) => setToast(t);

  const fetchFilterData = async () => {
    try {
      const [deptRes, catRes] = await Promise.all([
        apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
        expenseApi.getCategories(true).catch(() => [])
      ]);
      const depts = (deptRes?.data?.data || deptRes?.data || []).map((d: any) => ({
        id: Number(d.id),
        name: d.name || String(d.id)
      })).filter((d: any) => d.id);
      setDepartments(depts);
      setCategories(catRes || []);
    } catch (err) {
      console.error('Failed to load finance filter options:', err);
    }
  };

  const fetchFinanceQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [claimsRes, travelRes, advRes] = await Promise.all([
        expenseApi.getClaims({
          status: statusFilter || 'pending_finance',
          mode: 'finance',
          departmentId: departmentId || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
          search: employeeSearch.trim() || undefined
        }),
        expenseApi.getTravelRequests(),
        expenseApi.getTravelAdvances({ status: 'pending_finance' }),
      ]);
      setClaims(claimsRes || []);
      const travel = (travelRes || []).filter((tr: any) => {
        const st = String(tr.status || '').toLowerCase();
        if (statusFilter === 'all') return ['approved', 'pending_finance', 'completed'].includes(st);
        if (statusFilter === 'pending_finance') return st === 'pending_finance';
        if (statusFilter === 'payment_pending' || statusFilter === 'paid') return st === 'approved' || st === 'completed';
        return ['approved', 'pending_finance'].includes(st);
      });
      setTravelRequests(travel);
      // Always show pending_finance advances in the queue regardless of statusFilter
      setTravelAdvances(advRes || []);
    } catch (err) {
      console.error('Failed to load finance queue:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentId, categoryId, employeeSearch]);

  const fetchPipelineClaims = useCallback(async () => {
    try {
      setPipelineLoading(true);
      // Fetch ALL claims (all statuses) so Finance can see the complete pipeline
      const allRes = await expenseApi.getClaims({ status: 'all' });
      setPipelineClaims(allRes || []);
    } catch (err) {
      console.error('Failed to load pipeline claims:', err);
    } finally {
      setPipelineLoading(false);
    }
  }, [pipelineSearch]);


  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchFinanceQueue();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchFinanceQueue]);

  useEffect(() => {
    if (activeTab === 'pipeline') {
      fetchPipelineClaims();
    }
  }, [activeTab, fetchPipelineClaims]);

  const openVerificationModal = async (claimId: number) => {
    try {
      const full = await expenseApi.getClaimById(claimId);
      setSelectedClaim(full);
      if (full.items) {
        setItemAdjustments(
          full.items.map((it: any) => ({
            id: it.id,
            claimedAmount: it.claimedAmount,
            approvedAmount: it.claimedAmount,
            adjustmentReason: ''
          }))
        );
      }
      setFinanceComments('');
      setFormErrors([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprovedAmountChange = (idx: number, val: number) => {
    const next = [...itemAdjustments];
    next[idx].approvedAmount = val;
    setItemAdjustments(next);
  };

  const handleAdjustmentReasonChange = (idx: number, reason: string) => {
    const next = [...itemAdjustments];
    next[idx].adjustmentReason = reason;
    setItemAdjustments(next);
  };

  const handleVerifySubmit = async () => {
    if (!selectedClaim) return;
    const errors: string[] = [];
    if (financeComments.trim().length < 5) {
      errors.push('Finance comments are required (at least 5 characters).');
    }
    if (!itemAdjustments.length) {
      errors.push('This claim has no line items to verify.');
    }
    itemAdjustments.forEach((adj, idx) => {
      const claimed = Number(adj.claimedAmount || 0);
      if (Number.isNaN(Number(adj.approvedAmount))) {
        errors.push(`Line ${idx + 1}: approved amount must be a number.`);
        return;
      }
      if (adj.approvedAmount < 0) {
        errors.push(`Line ${idx + 1}: approved amount cannot be negative.`);
      }
      if (adj.approvedAmount > claimed) {
        errors.push(`Line ${idx + 1}: approved amount cannot exceed claimed amount (₹${claimed.toLocaleString('en-IN')}).`);
      }
      if (adj.approvedAmount !== claimed && !adj.adjustmentReason.trim()) {
        errors.push(`Line ${idx + 1}: adjustment reason is required for partial approval or rejection.`);
      }
    });
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      setFormErrors([]);
      setSubmitting(true);
      await expenseApi.financeVerifyClaim(selectedClaim.id, {
        items: itemAdjustments,
        comments: financeComments.trim()
      });
      setSelectedClaim(null);
      showToast({
        type: 'success',
        title: '✅ Finance Verified!',
        subtitle: 'Claim approved and moved to Payout Processing.',
      });
      fetchFinanceQueue();
      if (activeTab === 'pipeline') fetchPipelineClaims();
    } catch (err: any) {
      setFormErrors([err.response?.data?.message || err.message || 'Finance verification failed']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyTravel = async (id: number) => {
    try {
      await expenseApi.updateTravelRequestStatus(id, 'approved', 'Verified by finance');
      showToast({ type: 'success', title: '✅ Travel Request Verified!', subtitle: 'Request approved by finance.' });
      fetchFinanceQueue();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Verification Failed', subtitle: err.response?.data?.message || err.message || 'Travel verification failed' });
    }
  };

  const handleApproveAdvance = async () => {
    if (!advanceApproveModal) return;
    try {
      setAdvActionLoading(advanceApproveModal.id);
      await expenseApi.approveTravelAdvance(advanceApproveModal.id, { comments: advApproveNotes, approvedAmount: advApproveAmt || undefined });
      showToast({ type: 'success', title: '✅ Advance Approved!', subtitle: `₹${(advApproveAmt || advanceApproveModal.advanceAmount).toLocaleString('en-IN')} disbursed to employee.` });
      setAdvanceApproveModal(null);
      setAdvApproveAmt(0);
      setAdvApproveNotes('');
      fetchFinanceQueue();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Approval Failed', subtitle: err.response?.data?.message || err.message || 'Failed to approve advance' });
    } finally {
      setAdvActionLoading(null);
    }
  };

  const handleRejectAdvance = async () => {
    if (!advanceRejectModal) return;
    if (!advRejectReason.trim()) {
      showToast({ type: 'error', title: 'Rejection Reason Required', subtitle: 'Please provide a reason before rejecting.' });
      return;
    }
    try {
      setAdvActionLoading(advanceRejectModal.id);
      await expenseApi.rejectTravelAdvance(advanceRejectModal.id, advRejectReason);
      showToast({ type: 'success', title: '❌ Advance Rejected', subtitle: 'Travel advance rejected by Finance.' });
      setAdvanceRejectModal(null);
      setAdvRejectReason('');
      fetchFinanceQueue();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Rejection Failed', subtitle: err.response?.data?.message || err.message || 'Failed to reject advance' });
    } finally {
      setAdvActionLoading(null);
    }
  };

  // Force-approve bypasses remaining workflow levels — finance can urgently push through
  const handleForceApprove = async (claim: any) => {
    const claimTitle = claim.title || `Claim #${claim.id}`;
    const confirmed = window.confirm(
      `⚡ Force Approve: "${claimTitle}"?\n\nThis will bypass remaining approval levels and move the claim directly to Finance Verification. Use only for urgent cases.`
    );
    if (!confirmed) return;

    try {
      setForceApproving(claim.id);
      // Finance can directly verify even if claim is not yet at pending_finance
      await expenseApi.financeVerifyClaim(claim.id, {
        comments: 'Force approved by Finance — bypassing remaining workflow levels for urgency.'
      });
      showToast({
        type: 'success',
        title: '⚡ Force Approved!',
        subtitle: `"${claimTitle}" moved to Payout Processing.`,
      });
      fetchPipelineClaims();
      fetchFinanceQueue();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Force Approval Failed',
        subtitle: err.response?.data?.message || err.message || 'Failed',
      });
    } finally {
      setForceApproving(null);
    }
  };

  // Filtered pipeline claims for search
  const filteredPipeline = pipelineClaims.filter((c: any) => {
    if (!pipelineSearch.trim()) return true;
    const s = pipelineSearch.toLowerCase();
    const fName = c.firstName || c.first_name || '';
    const lName = c.lastName || c.last_name || '';
    const title = c.title || '';
    const claimNum = c.claimNumber || c.claim_number || '';
    return (
      `${fName} ${lName}`.toLowerCase().includes(s) ||
      title.toLowerCase().includes(s) ||
      claimNum.toLowerCase().includes(s)
    );
  });

  // Group pipeline by status for summary counters
  const pipelineSummary = {
    team_lead: filteredPipeline.filter((c: any) => c.status === 'pending_level_1').length,
    manager: filteredPipeline.filter((c: any) => ['pending_level_2', 'pending_manager', 'submitted'].includes(c.status)).length,
    hr: filteredPipeline.filter((c: any) => c.status === 'pending_level_3').length,
    finance: filteredPipeline.filter((c: any) => c.status === 'pending_finance').length,
    payout: filteredPipeline.filter((c: any) => c.status === 'payment_pending').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] max-w-sm w-full rounded-2xl shadow-2xl border px-5 py-4 flex items-start gap-3 transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700'
              : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700'
          }`}
        >
          <div className={`mt-0.5 shrink-0 rounded-full p-1 ${toast.type === 'success' ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-rose-200 dark:bg-rose-800'}`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
              : <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${toast.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>
              {toast.title}
            </p>
            {toast.subtitle && (
              <p className={`text-xs mt-0.5 ${toast.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {toast.subtitle}
              </p>
            )}
          </div>
          <button onClick={() => setToast(null)} className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-blue-600" />
          Finance Verification & Approvals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verify receipts, perform partial itemized adjustments, and monitor the full approval pipeline
        </p>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" /> Finance Queue
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'pipeline'
              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Pipeline Status
          {(pipelineSummary.team_lead + pipelineSummary.manager + pipelineSummary.hr + pipelineSummary.finance) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {pipelineSummary.team_lead + pipelineSummary.manager + pipelineSummary.hr + pipelineSummary.finance}
            </span>
          )}
        </button>
      </div>

      {/* ── FINANCE QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <>
          {/* FILTER BAR */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Filter className="w-3.5 h-3.5" /> Filter Finance Queue
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Employee</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Name or employee code"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="pending_finance">Pending</option>
                  <option value="payment_pending">Verified (Payment Pending)</option>
                  <option value="paid">Paid</option>
                  <option value="all">All Claims (History)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading finance queue...</div>
            ) : claims.length === 0 && travelRequests.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Finance Queue Clear</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  There are no expense claims or approved travel requests matching the selected filters.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {claims.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      Expense claims pending finance
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="py-3.5 px-4">Employee</th>
                          <th className="py-3.5 px-4">Claim</th>
                          <th className="py-3.5 px-4">Claimed Amount</th>
                          <th className="py-3.5 px-4">Payment Method</th>
                          <th className="py-3.5 px-4">Submitted Date</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {claims.map((rawClaim) => {
                          const claim = rawClaim as any;
                          const fName = claim.firstName || claim.first_name || '';
                          const lName = claim.lastName || claim.last_name || '';
                          const empCode = claim.employeeCode || claim.employee_code || '';
                          const dept = claim.departmentName || claim.department_name || '';
                          const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                          const cDate = claim.submittedAt || claim.submitted_at || claim.claimDate || claim.claim_date;
                          const totClaimed = Number(claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                          const payMethod = claim.paymentMethod || claim.payment_method || 'Bank Transfer';
                          const formattedDate = cDate ? new Date(cDate).toLocaleDateString() : 'N/A';

                          return (
                            <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {empCode ? `${empCode} • ` : ''}{dept}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{claim.title}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{cNum}</div>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                ₹{totClaimed.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                                {payMethod}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                {formattedDate}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {claim.status === 'pending_finance' ? (
                                  <button
                                    onClick={() => openVerificationModal(claim.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 ml-auto"
                                  >
                                    <FileCheck2 className="w-3.5 h-3.5" /> Verify & Approve
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 ml-auto">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {travelRequests.length > 0 && (
                  <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      Approved travel requests
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="py-3.5 px-4">Employee</th>
                          <th className="py-3.5 px-4">Request</th>
                          <th className="py-3.5 px-4">From → To</th>
                          <th className="py-3.5 px-4">Estimated Budget</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {travelRequests.map((rawTr) => {
                          const tr = rawTr as any;
                          const fName = tr.firstName || tr.first_name || '';
                          const lName = tr.lastName || tr.last_name || '';
                          const reqNum = tr.requestNumber || tr.request_number || `TRV-${tr.id}`;
                          const fromLoc = tr.fromLocation || tr.from_location || '';
                          const toLoc = tr.toLocation || tr.to_location || '';
                          const budget = Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0);
                          const st = String(tr.status || '').toLowerCase();
                          return (
                            <tr key={`tr-${tr.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{tr.purpose}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{reqNum}</div>
                              </td>
                              <td className="py-3.5 px-4">{fromLoc} → {toLoc}</td>
                              <td className="py-3.5 px-4 font-bold">₹{budget.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st === 'pending_finance' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {st === 'pending_finance' ? 'Pending finance' : 'Verified'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {st === 'pending_finance' ? (
                                  <button
                                    onClick={() => handleVerifyTravel(tr.id)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                                  >
                                    Verify travel
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 ml-auto">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* ── TRAVEL ADVANCES PENDING FINANCE ── */}
                {travelAdvances.length > 0 && (
                  <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                    <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-blue-50 dark:bg-blue-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                      <IndianRupee className="w-3.5 h-3.5 text-blue-500" />
                      Travel advances pending finance approval
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{travelAdvances.length}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="py-3.5 px-4">Advance #</th>
                          <th className="py-3.5 px-4">Employee</th>
                          <th className="py-3.5 px-4">Linked Travel Req</th>
                          <th className="py-3.5 px-4">Requested Amount</th>
                          <th className="py-3.5 px-4">Purpose</th>
                          <th className="py-3.5 px-4 text-right">Finance Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {travelAdvances.map((rawAdv) => {
                          const adv = rawAdv as any;
                          const advNum = adv.advanceNumber || adv.advance_number || `ADV-${adv.id}`;
                          const fName = adv.firstName || adv.first_name || '';
                          const lName = adv.lastName || adv.last_name || '';
                          const dept = adv.departmentName || adv.department_name || '';
                          const empCode = adv.employeeCode || adv.employee_code || '';
                          const reqNum = adv.requestNumber || adv.request_number;
                          const tPurpose = adv.travelPurpose || adv.travel_purpose;
                          const advAmt = Number(adv.advanceAmount ?? adv.advance_amount ?? 0);
                          const purpose = adv.purpose || tPurpose || 'Travel Advance';
                          return (
                            <tr key={`adv-${adv.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">{advNum}</td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900 dark:text-white">{fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}</div>
                                {dept && <div className="text-[11px] text-slate-500">{empCode ? `${empCode} • ` : ''}{dept}</div>}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                {reqNum ? <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{reqNum}</span> : <span className="italic text-slate-400">Direct Advance</span>}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">₹{advAmt.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-[180px]">
                                <span className="line-clamp-2">{purpose}</span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => { setAdvanceApproveModal(adv as any); setAdvApproveAmt(advAmt); setAdvApproveNotes(''); }}
                                    disabled={advActionLoading === adv.id}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <Banknote className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => { setAdvanceRejectModal(adv as any); setAdvRejectReason(''); }}
                                    disabled={advActionLoading === adv.id}
                                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PIPELINE STATUS TAB ── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Pipeline summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Team Lead Queue', count: pipelineSummary.team_lead, color: 'bg-amber-500' },
              { label: 'Manager Queue', count: pipelineSummary.manager, color: 'bg-blue-500' },
              { label: 'HR Queue', count: pipelineSummary.hr, color: 'bg-purple-500' },
              { label: 'Finance Queue', count: pipelineSummary.finance, color: 'bg-indigo-500' },
              { label: 'Payout Pending', count: pipelineSummary.payout, color: 'bg-emerald-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${s.color}`} />
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{s.count}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline info banner */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
            <Activity className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Pipeline Monitoring:</strong> This view shows all in-flight expense claims across all approval stages. You can use <strong>Force Approve</strong> to urgently bypass pending approvals for any claim — use only in exceptional cases.
            </span>
          </div>

          {/* Pipeline search */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                placeholder="Search by name, claim title..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Pipeline table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {pipelineLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading pipeline...</div>
            ) : filteredPipeline.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Pipeline is Clear</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">No in-flight expense claims found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Claim</th>
                      <th className="py-3.5 px-4">Claimed Amount</th>
                      <th className="py-3.5 px-4">Submitted</th>
                      <th className="py-3.5 px-4">Current Stage</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPipeline.map((rawClaim) => {
                      const claim = rawClaim as any;
                      const fName = claim.firstName || claim.first_name || '';
                      const lName = claim.lastName || claim.last_name || '';
                      const empCode = claim.employeeCode || claim.employee_code || '';
                      const dept = claim.departmentName || claim.department_name || '';
                      const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                      const cDate = claim.submittedAt || claim.submitted_at || claim.claimDate || claim.claim_date;
                      const totClaimed = Number(claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                      const stageConf = getStageConfig(claim.status || '');
                      const isForceApproving = forceApproving === claim.id;
                      const canForceApprove = !['approved', 'payment_pending', 'paid', 'rejected', 'returned'].includes(claim.status);

                      return (
                        <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {[empCode, dept].filter(Boolean).join(' • ')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{claim.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{cNum}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            ₹{totClaimed.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {cDate ? new Date(cDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stageConf.color} ${stageConf.bgColor} ${stageConf.borderColor} whitespace-nowrap`}>
                              <Clock className="w-3 h-3" />
                              {stageConf.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {claim.status === 'pending_finance' ? (
                                <button
                                  onClick={() => openVerificationModal(claim.id)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5" /> Verify
                                </button>
                              ) : canForceApprove ? (
                                <button
                                  disabled={isForceApproving}
                                  onClick={() => handleForceApprove(claim)}
                                  title="Force approve — bypasses remaining workflow levels"
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  {isForceApproving ? 'Processing...' : 'Force Approve'}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  {['paid', 'payment_pending', 'approved'].includes(claim.status) ? '✅ Done' : '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINANCE VERIFICATION & PARTIAL APPROVAL MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Finance Line-Item Verification: {selectedClaim.title}
                </h2>
                <p className="text-xs text-slate-500 font-mono">{selectedClaim.claimNumber}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Employee Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Employee</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedClaim.firstName} {selectedClaim.lastName} ({selectedClaim.employeeCode})
                  </span>
                  <span className="text-slate-500 block">{selectedClaim.departmentName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Total Claimed</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    ₹{Number(selectedClaim.totalClaimedAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Line Items Adjustment Table */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Itemized Partial Approval & GST Checks</h4>
                <div className="space-y-3">
                  {selectedClaim.items?.map((it, idx) => {
                    const adj = itemAdjustments[idx] || { approvedAmount: it.claimedAmount, adjustmentReason: '' };
                    const rejectedAmt = Math.max(0, it.claimedAmount - adj.approvedAmount);

                    return (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-800/30"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{it.categoryName || 'Item'} — {it.description || 'No description'}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Claimed: ₹{Number(it.claimedAmount).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {it.receiptUrl && (
                          <a
                            href={it.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> View Receipt Document
                          </a>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Approved Amount (₹)
                            </label>
                            <input
                              type="number"
                              max={it.claimedAmount}
                              value={adj.approvedAmount}
                              onChange={(e) => handleApprovedAmountChange(idx, Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Rejected Amount (₹)
                            </label>
                            <input
                              type="number"
                              disabled
                              value={rejectedAmt}
                              className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-rose-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Adjustment Reason (If Partial/Rejected)
                            </label>
                            <input
                              type="text"
                              placeholder="Reason for adjustment..."
                              value={adj.adjustmentReason}
                              onChange={(e) => handleAdjustmentReasonChange(idx, e.target.value)}
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  Finance Verification Comments *
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter verification notes for payout processing..."
                  value={financeComments}
                  onChange={(e) => setFinanceComments(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {formErrors.length > 0 && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                  {formErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleVerifySubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Verifying...' : 'Verify & Send to Payment Pending'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADVANCE APPROVE MODAL ── */}
      {advanceApproveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" /> Approve Travel Advance
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Advance #</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {(advanceApproveModal as any).advanceNumber || (advanceApproveModal as any).advance_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{Number((advanceApproveModal as any).advanceAmount ?? (advanceApproveModal as any).advance_amount ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Approved Amount (₹) *</label>
                <input type="number" min={0}
                  max={Number((advanceApproveModal as any).advanceAmount ?? (advanceApproveModal as any).advance_amount ?? 0)}
                  value={advApproveAmt}
                  onChange={e => setAdvApproveAmt(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Finance Notes (Optional)</label>
                <textarea rows={2} value={advApproveNotes} onChange={e => setAdvApproveNotes(e.target.value)}
                  placeholder="Add disbursement notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setAdvanceApproveModal(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button onClick={handleApproveAdvance} disabled={advActionLoading !== null}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {advActionLoading !== null ? 'Approving...' : 'Approve & Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADVANCE REJECT MODAL ── */}
      {advanceRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" /> Reject Travel Advance
            </h2>
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Rejection *</label>
              <textarea rows={3} value={advRejectReason} onChange={e => setAdvRejectReason(e.target.value)}
                placeholder="State the reason for rejecting this advance request..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setAdvanceRejectModal(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button onClick={handleRejectAdvance} disabled={advActionLoading !== null}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {advActionLoading !== null ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

