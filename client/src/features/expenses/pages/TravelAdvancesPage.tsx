import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi, TravelAdvance, TravelRequest } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import { useAuthStore } from '../../auth/store/authStore';
import {
  IndianRupee,
  Plus,
  Search,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  AlertCircle,
  Banknote
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PORTAL_BADGE: Record<string, { label: string; cls: string }> = {
  employee:  { label: 'Employee Portal',  cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  team_lead: { label: 'Team Lead Portal', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
  manager:   { label: 'Manager Portal',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  hr:        { label: 'HR Portal',        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  admin:     { label: 'Admin Portal',     cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function getPortalBadge(role?: string) {
  const key = (role || 'employee').toLowerCase();
  const cfg = PORTAL_BADGE[key] || PORTAL_BADGE.employee;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (['pending_finance', 'pending', 'requested'].includes(s)) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
      <ShieldCheck className="w-3 h-3" />Finance Review
    </span>
  );
  if (s === 'approved' || s === 'disbursed') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
      <CheckCircle className="w-3 h-3" />Approved
    </span>
  );
  if (s === 'rejected') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
      <XCircle className="w-3 h-3" />Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
      <Clock className="w-3 h-3" />{status || 'Requested'}
    </span>
  );
}

interface Toast { type: 'success' | 'error'; message: string }

// ─── component ───────────────────────────────────────────────────────────────

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const TravelAdvancesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [advances, setAdvances] = useState<TravelAdvance[]>([]);
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approveModal, setApproveModal] = useState<TravelAdvance | null>(null);
  const [rejectModal, setRejectModal] = useState<TravelAdvance | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveComments, setApproveComments] = useState('');
  const [approvedAmt, setApprovedAmt] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Form State
  const [travelRequestId, setTravelRequestId] = useState<number | undefined>(undefined);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuthStore();

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user?.role || user?.accessRole || (user as any)?.roleCode || '').toLowerCase();
  const path = window.location.pathname.toLowerCase();

  const isManagement =
    userRoles.some((r: string) => ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head', 'finance', 'finance_manager'].includes(r.toLowerCase())) ||
    ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head', 'finance', 'finance_manager'].includes(singleRole) ||
    path.startsWith('/manager') || path.startsWith('/team-lead') || path.startsWith('/hr') || path.startsWith('/admin') || path.startsWith('/dashboard');

  const isFinance =
    userRoles.some((r: string) => ['finance', 'finance_manager', 'accounts', 'hr', 'hr_admin', 'organization_admin', 'super_admin', 'ceo', 'admin'].includes(r.toLowerCase())) ||
    ['finance', 'finance_manager', 'accounts', 'hr', 'hr_admin', 'organization_admin', 'super_admin', 'ceo', 'admin'].includes(singleRole) ||
    path.startsWith('/dashboard') || path.startsWith('/hr') || path.startsWith('/admin');

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: [] }));
      const depts = (res?.data?.data || res?.data || []).map((d: any) => ({ id: Number(d.id), name: d.name || '' })).filter((d: any) => d.id);
      setDepartments(depts);
    } catch { /* ignore */ }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const advParams: Record<string, any> = {};
      if (empId) advParams.employeeId = empId;
      if (statusFilter && statusFilter !== 'all') advParams.status = statusFilter;
      if (departmentFilter) advParams.departmentId = Number(departmentFilter);
      if (search.trim()) advParams.search = search.trim();

      const trParams: Record<string, any> = {};
      if (empId) trParams.employeeId = empId;

      const [advRes, trRes] = await Promise.all([
        expenseApi.getTravelAdvances(advParams),
        expenseApi.getTravelRequests(trParams)
      ]);
      setAdvances(advRes || []);
      setTravelRequests(trRes || []);
    } catch (err) {
      console.error('Failed to load travel advances:', err);
    } finally {
      setLoading(false);
    }
  }, [isManagement, user, statusFilter, departmentFilter, search]);

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateAdvance = async () => {
    if (!advanceAmount || advanceAmount <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid advance amount.' });
      return;
    }
    try {
      setSubmitting(true);
      await expenseApi.createTravelAdvance({ travelRequestId, advanceAmount, purpose });
      setIsModalOpen(false);
      setAdvanceAmount(0); setPurpose(''); setTravelRequestId(undefined);
      setToast({ type: 'success', message: 'Travel advance requested. Sent to Finance for approval.' });
      fetchData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to request travel advance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAdvance = async () => {
    if (!approveModal) return;
    try {
      setActionLoading(approveModal.id);
      await expenseApi.approveTravelAdvance(approveModal.id, { comments: approveComments, approvedAmount: approvedAmt || undefined });
      setToast({ type: 'success', message: `Travel advance approved. ${money(approvedAmt || approveModal.advanceAmount)} disbursed.` });
      setApproveModal(null); setApproveComments(''); setApprovedAmt(0);
      fetchData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to approve advance.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAdvance = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { setToast({ type: 'error', message: 'Please provide a rejection reason.' }); return; }
    try {
      setActionLoading(rejectModal.id);
      await expenseApi.rejectTravelAdvance(rejectModal.id, rejectReason);
      setToast({ type: 'success', message: 'Travel advance rejected by Finance.' });
      setRejectModal(null); setRejectReason('');
      fetchData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to reject advance.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all max-w-sm ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-300' : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-700 dark:text-rose-300'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-emerald-600" />
            Travel Advances &amp; Settlement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Request cash advances before trips — Finance approved before disbursement
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Request Travel Advance
        </button>
      </div>

      {/* Finance notice */}
      {isFinance && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700 text-xs text-blue-800 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Finance Actions Available</span>
            <span className="text-blue-600 dark:text-blue-400"> — You can approve or reject pending advances below. Filter by <em>Finance Review</em> to see your queue.</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, advance #, purpose..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending_finance">Finance Review</option>
          <option value="approved">Approved / Disbursed</option>
          <option value="rejected">Rejected</option>
        </select>
        {isManagement && (
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {(search || statusFilter !== 'all' || departmentFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setDepartmentFilter(''); }}
            className="flex items-center gap-1 px-2.5 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading travel advances...</div>
        ) : advances.length === 0 ? (
          <div className="p-14 text-center flex flex-col items-center justify-center">
            <IndianRupee className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Travel Advances Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">Request cash advances for upcoming approved travel. All advances require Finance approval before disbursement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Advance #</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">Linked Request</th>
                  <th className="py-3.5 px-4">Requested</th>
                  <th className="py-3.5 px-4">Approved</th>
                  <th className="py-3.5 px-4">Settled</th>
                  <th className="py-3.5 px-4">Balance</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isFinance && <th className="py-3.5 px-4 text-right">Finance Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advances.map((rawAdv) => {
                  const adv = rawAdv as any;
                  const advNum = adv.advanceNumber || adv.advance_number || `ADV-${adv.id}`;
                  const fName = adv.firstName || adv.first_name || '';
                  const lName = adv.lastName || adv.last_name || '';
                  const dept = adv.departmentName || adv.department_name || '';
                  const code = adv.employeeCode || adv.employee_code || '';
                  const role = adv.submittedByRole || adv.submitted_by_role || 'employee';
                  const reqNum = adv.requestNumber || adv.request_number;
                  const tPurpose = adv.travelPurpose || adv.travel_purpose;
                  const advAmt = Number(adv.advanceAmount ?? adv.advance_amount ?? 0);
                  const appAmt = Number(adv.approvedAmount ?? adv.approved_amount ?? 0);
                  const setAmt = Number(adv.settledAmount ?? adv.settled_amount ?? 0);
                  const bal = Number(adv.balanceAmount ?? adv.balance_amount ?? (appAmt - setAmt));
                  const status = String(adv.status || 'pending_finance');
                  const rejReason = adv.rejectionReason || adv.rejection_reason;
                  const finNotes = adv.financeNotes || adv.finance_notes;

                  const isApproved = status.toLowerCase() === 'approved' || status.toLowerCase() === 'disbursed';
                  const isPendingFinance = ['pending_finance', 'pending', 'requested'].includes(status.toLowerCase());

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">{advNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        </div>
                        {dept && <div className="text-[11px] text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{dept}</div>}
                        {code && <div className="text-[10px] text-slate-400">{code}</div>}
                        <div className="mt-1">{getPortalBadge(role)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {reqNum ? (
                          <>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{reqNum}</span>
                            {tPurpose && <div className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] line-clamp-1">{tPurpose}</div>}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Direct Advance</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{money(advAmt)}</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                        {isApproved && appAmt > 0 ? money(appAmt) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">{money(setAmt)}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {isApproved && bal > 0 ? money(bal) : '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(status)}
                        {status === 'rejected' && rejReason && (
                          <div className="text-[10px] text-rose-500 mt-1 max-w-[130px] line-clamp-1" title={rejReason}>↳ {rejReason}</div>
                        )}
                        {status === 'approved' && finNotes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 max-w-[130px] line-clamp-1" title={finNotes}>Note: {finNotes}</div>
                        )}
                      </td>
                      {isFinance && (
                        <td className="py-3.5 px-4 text-right">
                          {isPendingFinance ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setApproveModal(adv as any); setApprovedAmt(advAmt); setApproveComments(''); }}
                                disabled={actionLoading === adv.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-semibold transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => { setRejectModal(adv as any); setRejectReason(''); }}
                                disabled={actionLoading === adv.id}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded text-[11px] font-semibold transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVE MODAL */}
      {approveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" /> Approve Travel Advance
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Advance #</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{(approveModal as any).advanceNumber || (approveModal as any).advance_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{money(Number((approveModal as any).advanceAmount ?? (approveModal as any).advance_amount ?? 0))}</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Approved Amount (₹) *</label>
                <input type="number" min={0} max={Number((approveModal as any).advanceAmount ?? (approveModal as any).advance_amount ?? 0)}
                  value={approvedAmt || ''} onChange={e => setApprovedAmt(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Finance Notes (Optional)</label>
                <textarea rows={2} value={approveComments} onChange={e => setApproveComments(e.target.value)}
                  placeholder="Add any disbursement notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setApproveModal(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button onClick={handleApproveAdvance} disabled={actionLoading !== null}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {actionLoading !== null ? 'Approving...' : 'Approve & Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" /> Reject Travel Advance
            </h2>
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Rejection *</label>
              <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="State the reason for rejecting this advance request..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setRejectModal(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button onClick={handleRejectAdvance} disabled={actionLoading !== null}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {actionLoading !== null ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Request Travel Advance</h2>
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700 text-[11px] text-blue-700 dark:text-blue-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>All advance requests go directly to <strong>Finance for approval</strong> before disbursement.</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Link Approved Travel Request (Optional)</label>
                <select value={travelRequestId || ''} onChange={e => setTravelRequestId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- Direct Advance / General --</option>
                  {travelRequests
                    .filter((tr: any) => ['approved', 'pending_finance'].includes(String(tr.status || '').toLowerCase()))
                    .map((rawTr) => {
                      const tr = rawTr as any;
                      const rNum = tr.requestNumber || tr.request_number || `TRV-${tr.id}`;
                      const fLoc = tr.fromLocation || tr.from_location || '';
                      const tLoc = tr.toLocation || tr.to_location || '';
                      return <option key={tr.id} value={tr.id}>{rNum}{fLoc || tLoc ? ` (${fLoc} → ${tLoc})` : ''}</option>;
                    })}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Amount Requested (₹) *</label>
                <input type="number" placeholder="e.g. 15000" value={advanceAmount || ''} onChange={e => setAdvanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose / Notes</label>
                <textarea rows={3} placeholder="State purpose of advance (e.g. Hotel deposit & local transit)..." value={purpose} onChange={e => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button disabled={submitting} onClick={handleCreateAdvance}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {submitting ? 'Submitting...' : 'Submit Advance Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
