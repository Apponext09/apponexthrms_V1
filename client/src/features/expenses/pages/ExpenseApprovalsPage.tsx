import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { expenseApi, ExpenseClaim } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  User,
  Paperclip,
  AlertTriangle,
  Check,
  Filter,
  Search,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';

type FilterOption = { id: number; name: string };

interface ApprovalToast {
  type: 'success' | 'error';
  title: string;
  subtitle?: string;
}

interface Props {
  /** Pre-select this status filter on mount. If omitted shows 'pending_approvals'. */
  defaultStatusFilter?: string;
  /** Restrict the dropdown options to only these statuses. Omit for all options. */
  allowedStatuses?: string[];
  /** Portal label shown in the header subtitle */
  portalLabel?: string;
}

// Map status codes to human-readable queue names
const QUEUE_LABEL: Record<string, string> = {
  pending_level_1: 'Team Lead Queue',
  pending_level_2: 'Manager Queue',
  pending_level_3: 'HR Queue',
  pending_manager: 'Manager Queue',
  submitted: 'Manager Queue',
  pending_finance: 'Finance Verification',
  payment_pending: 'Payout Processing',
  paid: 'Paid',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned to Employee',
};

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const ExpenseApprovalsPage: React.FC<Props> = ({
  defaultStatusFilter = 'pending_approvals',
  allowedStatuses,
  portalLabel,
}) => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]);

  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [designations, setDesignations] = useState<FilterOption[]>([]);
  const [locations, setLocations] = useState<FilterOption[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const money = useExpenseMoney();
  const [designationId, setDesignationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);

  const [actionType, setActionType] = useState<'reject' | 'return' | null>(null);
  const [targetClaimId, setTargetClaimId] = useState<number | string | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // In-page toast state (replaces browser alert)
  const [toast, setToast] = useState<ApprovalToast | null>(null);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (t: ApprovalToast) => {
    setToast(t);
  };

  const fetchFilterOptions = async () => {
    const unwrap = (res: any): FilterOption[] => {
      const raw = res?.data?.data || res?.data || [];
      return (Array.isArray(raw) ? raw : []).map((item: any) => ({
        id: Number(item.id),
        name: item.name || item.title || item.code || String(item.id),
      })).filter((item: FilterOption) => item.id);
    };
    try {
      const [deptRes, desRes, locRes] = await Promise.all([
        apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
        apiClient.get('/settings/designations', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
        apiClient.get('/settings/locations', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
      ]);
      setDepartments(unwrap(deptRes));
      setDesignations(unwrap(desRes));
      setLocations(unwrap(locRes));
    } catch (err) {
      console.error('Failed to load approval filters:', err);
    }
  };

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getClaims({
        status: statusFilter || 'pending_approvals',
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        locationId: locationId || undefined,
        search: employeeName.trim() || undefined,
      });
      setClaims(res || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentId, designationId, locationId, employeeName]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchApprovals();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchApprovals]);

  const visibleIds = useMemo(
    () => claims.filter((c) => !['approved', 'payment_pending', 'paid', 'rejected'].includes(c.status)).map((c) => c.id),
    [claims]
  );
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id: number | string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const handleApprove = async (claim: ExpenseClaim) => {
    try {
      setProcessingId(claim.id);
      let nextStepName = 'next approver';

      if (claim.status === 'pending_finance') {
        await expenseApi.financeVerifyClaim(claim.id, { comments: 'Verified and approved by Finance' });
        setClaims((prev) => prev.filter((c) => String(c.id) !== String(claim.id)));
        nextStepName = 'Payout Processing / Approved';
      } else {
        const res = await expenseApi.managerApproveClaim(claim.id, 'Approved');
        nextStepName = res?.nextStepName || res?.currentApproverRole || 'Finance Verification';
        setClaims((prev) => prev.filter((c) => String(c.id) !== String(claim.id)));
      }

      setSelectedIds((prev) => prev.filter((id) => String(id) !== String(claim.id)));

      showToast({
        type: 'success',
        title: '✅ Request Approved!',
        subtitle: `Forwarded to: ${nextStepName}`,
      });

      await fetchApprovals();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Approval Failed',
        subtitle: err.response?.data?.message || err.message || 'Failed to approve claim',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      showToast({ type: 'error', title: 'No claims selected', subtitle: 'Select at least one claim to approve.' });
      return;
    }
    try {
      setBulkProcessing(true);
      const result = await expenseApi.bulkApproveClaims(selectedIds, 'Bulk approved');
      const failed = result?.failed || [];
      const approvedCount = result?.approved?.length || 0;

      if (failed.length > 0) {
        showToast({
          type: 'error',
          title: `${approvedCount} approved, ${failed.length} failed`,
          subtitle: failed.map((f: any) => `#${f.id}: ${f.message}`).join(' | '),
        });
      } else {
        showToast({
          type: 'success',
          title: `✅ ${approvedCount} claims approved!`,
          subtitle: 'All selected claims forwarded to next approver.',
        });
      }
      await fetchApprovals();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Bulk Approval Failed',
        subtitle: err.response?.data?.message || err.message || 'Bulk approval failed',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleActionSubmit = async () => {
    if (!targetClaimId || !reasonText.trim()) {
      showToast({ type: 'error', title: 'Reason Required', subtitle: 'Please enter a mandatory reason/comment.' });
      return;
    }
    try {
      setProcessingId(targetClaimId);
      if (actionType === 'reject') {
        await expenseApi.rejectClaim(targetClaimId, reasonText);
        showToast({ type: 'success', title: 'Claim Rejected', subtitle: 'The employee will be notified.' });
      } else if (actionType === 'return') {
        await expenseApi.returnClaim(targetClaimId, reasonText);
        showToast({ type: 'success', title: 'Claim Returned', subtitle: 'Returned to employee for correction.' });
      }
      setActionType(null);
      setTargetClaimId(null);
      setReasonText('');
      setClaims((prev) => prev.filter((c) => c.id !== targetClaimId));
      setSelectedClaim(null);
      setSelectedIds((prev) => prev.filter((id) => id !== targetClaimId));
    } catch (err: any) {
      showToast({ type: 'error', title: 'Action Failed', subtitle: err.message || 'Action failed' });
    } finally {
      setProcessingId(null);
    }
  };

  // Build status dropdown options — respect allowedStatuses if provided
  const statusOptions = [
    { value: 'pending_approvals', label: 'All Pending' },
    { value: 'pending_level_1', label: 'Team Lead Queue' },
    { value: 'pending_level_2', label: 'Manager Queue' },
    { value: 'pending_level_3', label: 'HR Queue' },
    { value: 'pending_manager', label: 'Manager Pending (Legacy)' },
    { value: 'pending_finance', label: 'Finance Pending' },
    { value: 'approved', label: 'Approved Claims' },
    { value: 'rejected', label: 'Rejected Claims' },
    { value: 'all', label: 'All Claims' },
  ].filter((o) => !allowedStatuses || allowedStatuses.includes(o.value));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* In-page Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] max-w-sm w-full rounded-2xl shadow-2xl border px-5 py-4 flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right ${toast.type === 'success'
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
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${toast.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {toast.type === 'success' && <ArrowRight className="w-3 h-3 shrink-0" />}
                {toast.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className={`shrink-0 p-1 rounded-lg transition-colors ${toast.type === 'success' ? 'hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-600' : 'hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-600'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expense Claim Approvals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {portalLabel || 'Filter, multi-select, and approve expense claims in one step'}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <button
            disabled={bulkProcessing}
            onClick={handleBulkApprove}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {bulkProcessing ? 'Approving...' : `Approve selected (${selectedIds.length})`}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Employee name</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchApprovals(); }}
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
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Designation</label>
            <select
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Status / Queue</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={fetchApprovals}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading pending approvals...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No pending claims in your approval scope. Only claims in your assigned workflow level appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Claim Details</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Claimed Amount</th>
                  <th className="py-3.5 px-4">Current Queue</th>
                  <th className="py-3.5 px-4">Compliance</th>
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
                  const desig = claim.designationName || claim.designation_name || '';
                  const loc = claim.locationName || claim.location_name || '';
                  const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                  const cDate = claim.submittedAt || claim.submitted_at || claim.claimDate || claim.claim_date;
                  const totClaimed = Number(claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                  const hasViolations = claim.items?.some((it: any) => (it.policyValidated ?? it.policy_validated) === false);
                  const isProcessing = processingId === claim.id;
                  const isApprovedOrPaid = ['approved', 'payment_pending', 'paid', 'rejected'].includes(claim.status);
                  const isRejected = claim.status === 'rejected';
                  const formattedDate = cDate ? new Date(cDate).toLocaleDateString() : 'N/A';

                  const getWorkflowQueueBadge = () => {
                    const st = String(claim.status || '').toLowerCase();
                    const role = claim.currentApproverRole || claim.current_approver_role;

                    if (st === 'pending_level_1') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50 whitespace-nowrap">
                          {role || 'Team Lead Queue'}
                        </span>
                      );
                    }
                    if (st === 'pending_level_2' || st === 'pending_manager') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/50 whitespace-nowrap">
                          {role || 'Manager Queue'}
                        </span>
                      );
                    }
                    if (st === 'pending_level_3') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/50 whitespace-nowrap">
                          {role || 'HR Queue'}
                        </span>
                      );
                    }
                    if (st.startsWith('pending_level_')) {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300/50 whitespace-nowrap">
                          {role || QUEUE_LABEL[st] || st}
                        </span>
                      );
                    }
                    if (st === 'pending_finance') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300/50 whitespace-nowrap">
                          Finance Verification
                        </span>
                      );
                    }
                    if (st === 'payment_pending') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 whitespace-nowrap">
                          Payout Processing
                        </span>
                      );
                    }
                    if (st === 'paid') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 whitespace-nowrap">
                          Paid
                        </span>
                      );
                    }
                    if (st === 'returned') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/50 whitespace-nowrap">
                          Returned to Employee
                        </span>
                      );
                    }
                    if (st === 'rejected') {
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/50 whitespace-nowrap">
                          Rejected
                        </span>
                      );
                    }
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300/50 whitespace-nowrap">
                        {role || st}
                      </span>
                    );
                  };

                  const getApproveBtnText = () => {
                    return 'Approve';
                  };

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(claim.id)}
                          onChange={() => toggleSelect(claim.id)}
                          disabled={isApprovedOrPaid}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {[empCode, dept, desig, loc].filter(Boolean).join(' • ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{claim.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cNum}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{formattedDate}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {money(totClaimed)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getWorkflowQueueBadge()}
                      </td>
                      <td className="py-3.5 px-4">
                        {hasViolations ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Policy Flag
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" /> Compliant
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async () => {
                              const full = await expenseApi.getClaimById(claim.id);
                              setSelectedClaim(full);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isRejected ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : isApprovedOrPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : (
                            <>
                              <button
                                disabled={Boolean(isProcessing)}
                                onClick={() => handleApprove(claim)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {isProcessing ? 'Processing...' : getApproveBtnText()}
                              </button>
                              <button
                                disabled={Boolean(isProcessing)}
                                onClick={() => { setTargetClaimId(claim.id); setActionType('return'); setReasonText(''); }}
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Return
                              </button>
                              <button
                                disabled={Boolean(isProcessing)}
                                onClick={() => { setTargetClaimId(claim.id); setActionType('reject'); setReasonText(''); }}
                                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
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

      {/* CLAIM DETAIL MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedClaim.title}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedClaim.claimNumber}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedClaim.firstName} {selectedClaim.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClaim.departmentName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Claim Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(selectedClaim.claimDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Amount</span>
                  <span className="font-bold text-emerald-600 text-sm">{money(selectedClaim.totalClaimedAmount)}</span>
                </div>
              </div>

              {/* Current workflow stage */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-2 text-xs">
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-blue-800 dark:text-blue-300 font-semibold">
                  Current stage: {QUEUE_LABEL[selectedClaim.status] || selectedClaim.currentApproverRole || selectedClaim.status}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Itemized Expenses ({selectedClaim.items?.length || 0})
                </h4>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {selectedClaim.items?.map((item) => (
                    <div key={item.id} className="p-3.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{item.categoryName || 'General'}</span>
                          <span className="text-[11px] font-normal text-slate-400">• {new Date(item.expenseDate).toLocaleDateString()}</span>
                        </div>
                        {item.description && <p className="text-slate-500 text-[11px] mt-0.5">{item.description}</p>}
                        {item.merchantName && <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Merchant: {item.merchantName}</p>}
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{money(item.claimedAmount)}</span>
                        {item.receiptUrl && (
                          <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg font-medium text-[11px] flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                            <Paperclip className="w-3 h-3" /> View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedClaim.timeline && selectedClaim.timeline.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Approval History & Logs</h4>
                  <div className="space-y-2">
                    {selectedClaim.timeline.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs flex items-start gap-3">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-full mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{log.approverName} ({log.approverRole})</span>
                            <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">{log.action}</p>
                          {log.comments && <p className="text-slate-500 text-[11px] italic mt-0.5">{log.comments}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
              <button onClick={() => setSelectedClaim(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold">
                Close
              </button>
              {!['approved', 'payment_pending', 'paid'].includes(selectedClaim.status) && (
                <button
                  disabled={processingId === selectedClaim.id}
                  onClick={() => handleApprove(selectedClaim)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Claim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT / RETURN MODAL */}
      {actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {actionType === 'reject' ? 'Reject Expense Claim' : 'Return Claim for Correction'}
            </h3>
            <p className="text-xs text-slate-500">
              {actionType === 'reject'
                ? 'Please provide a mandatory reason for rejecting this claim. This reason will be logged and visible to the employee.'
                : 'Please specify what corrections or additional supporting details/receipts the employee needs to provide.'}
            </p>
            <textarea
              rows={4}
              placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Correction instructions...'}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActionType(null); setTargetClaimId(null); setReasonText(''); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(processingId)}
                onClick={handleActionSubmit}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm ${actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {processingId ? 'Processing...' : actionType === 'reject' ? 'Confirm Rejection' : 'Return Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
