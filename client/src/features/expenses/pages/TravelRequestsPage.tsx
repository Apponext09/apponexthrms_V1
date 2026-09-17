import { LegacyWorkflowNotice } from './LegacyWorkflowNotice';
import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi, TravelRequest } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import { useAuthStore } from '../../auth/store/authStore';
import {
  Compass,
  Plus,
  Search,
  Filter,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Building2,
  User,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Info,
  RotateCcw,
  Edit2
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

const PORTAL_BADGE: Record<string, { label: string; cls: string }> = {
  employee: { label: 'Employee Portal', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  team_lead: { label: 'Team Lead Portal', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
  manager: { label: 'Manager Portal', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  hr: { label: 'HR Portal', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
  admin: { label: 'Admin Portal', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending_level_1: { label: 'Team Lead Approval', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', icon: <Clock className="w-3 h-3" /> },
  pending_level_2: { label: 'Manager Approval', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300', icon: <Clock className="w-3 h-3" /> },
  pending_level_3: { label: 'HR / L3 Approval', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300', icon: <Clock className="w-3 h-3" /> },
  pending_finance: { label: 'Finance Queue', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', icon: <ShieldCheck className="w-3 h-3" /> },
  pending_manager: { label: 'Manager Approval', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300', icon: <Clock className="w-3 h-3" /> },
  pending: { label: 'Pending Approval', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', icon: <XCircle className="w-3 h-3" /> },
  returned: { label: 'Returned to Employee', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300', icon: <RotateCcw className="w-3 h-3" /> },
};

function getStatusBadge(status: string, approverRole?: string) {
  const key = (status || '').toLowerCase();
  const cfg = STATUS_BADGE[key] || { label: approverRole || status, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: <Clock className="w-3 h-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function getPortalBadge(role?: string) {
  const key = (role || 'employee').toLowerCase();
  const cfg = PORTAL_BADGE[key] || PORTAL_BADGE.employee;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function isPendingApproval(status: string) {
  return /^pending/.test(status);
}

interface Toast { type: 'success' | 'error'; message: string }

// ─── component ───────────────────────────────────────────────────────────────

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const TravelRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Policy Limit State
  const [maxBudgetLimit, setMaxBudgetLimit] = useState<number | null>(null);
  const [policyLimitModal, setPolicyLimitModal] = useState<{ isOpen: boolean; limit: number; attempted: number } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Form State
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const openEditModal = (tr: any) => {
    setEditingId(tr.id);
    setFromLocation(tr.fromLocation || tr.from_location || '');
    setToLocation(tr.toLocation || tr.to_location || '');
    setPurpose(tr.purpose || '');
    setStartDate(tr.startDate ? new Date(tr.startDate).toISOString().slice(0, 10) : (tr.start_date ? new Date(tr.start_date).toISOString().slice(0, 10) : ''));
    setEndDate(tr.endDate ? new Date(tr.endDate).toISOString().slice(0, 10) : (tr.end_date ? new Date(tr.end_date).toISOString().slice(0, 10) : ''));
    setEstimatedBudget(Number(tr.estimatedBudget || tr.estimated_budget || 0));
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFromLocation(''); setToLocation(''); setPurpose(''); setEstimatedBudget(0);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const { user } = useAuthStore();

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user?.role || user?.accessRole || (user as any)?.roleCode || '').toLowerCase();
  const path = window.location.pathname.toLowerCase();

  const isManagement =
    userRoles.some((r: string) => ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head', 'finance', 'finance_manager'].includes(r.toLowerCase())) ||
    ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head', 'finance', 'finance_manager'].includes(singleRole) ||
    path.startsWith('/manager') ||
    path.startsWith('/team-lead') ||
    path.startsWith('/hr') ||
    path.startsWith('/admin') ||
    path.startsWith('/dashboard');

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

  const fetchTravelPolicies = async () => {
    try {
      const [policiesRes, categoriesRes] = await Promise.all([
        expenseApi.getPolicies().catch(() => []),
        expenseApi.getCategories().catch(() => [])
      ]);
      const travelCat = (categoriesRes || []).find((c: any) =>
        String(c.name || '').toLowerCase().includes('travel') || String(c.code || '').toLowerCase() === 'travel'
      );
      const travelCatId = travelCat?.id;

      const activePols = (policiesRes || []).filter((p: any) => p.isActive !== false);

      // Prioritize Travel category-specific policies
      const catSpecificPols = travelCatId
        ? activePols.filter((p: any) => p.categoryId !== undefined && p.categoryId !== null && Number(p.categoryId) === Number(travelCatId))
        : [];

      const targetPols = catSpecificPols.length > 0
        ? catSpecificPols
        : activePols.filter((p: any) => !p.categoryId || Number(p.categoryId) === 0);

      const hasUnlimited = targetPols.some((p: any) => Number(p.maxLimitPerClaim ?? p.max_limit_per_claim ?? 0) === 0);

      if (hasUnlimited) {
        setMaxBudgetLimit(null);
      } else {
        const limits = targetPols
          .map((p: any) => Number(p.maxLimitPerClaim ?? p.max_limit_per_claim ?? 0))
          .filter((l: number) => l > 0);

        if (limits.length > 0) {
          setMaxBudgetLimit(Math.min(...limits));
        } else if (travelCat && Number(travelCat.spendingLimit || travelCat.spending_limit || 0) > 0) {
          setMaxBudgetLimit(Number(travelCat.spendingLimit || travelCat.spending_limit));
        } else {
          setMaxBudgetLimit(null);
        }
      }
    } catch (err) {
      console.error('Failed to load travel policies:', err);
    }
  };

  const fetchTravelRequests = useCallback(async () => {
    try {
      setLoading(true);
      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const params: Record<string, any> = {};
      if (empId) params.employeeId = empId;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (departmentFilter) params.departmentId = Number(departmentFilter);
      if (search.trim()) params.search = search.trim();
      const res = await expenseApi.getTravelRequests(params);
      setRequests(res || []);
    } catch (err) {
      console.error('Failed to load travel requests:', err);
    } finally {
      setLoading(false);
    }
  }, [isManagement, user, statusFilter, departmentFilter, search]);

  useEffect(() => {
    fetchDepartments();
    fetchTravelPolicies();
  }, []);

  useEffect(() => { fetchTravelRequests(); }, [fetchTravelRequests]);

  const handleCreateRequest = async () => {
    if (!fromLocation.trim() || !toLocation.trim() || !purpose.trim()) {
      setToast({ type: 'error', message: 'Please fill in all required fields (From, To, Purpose).' });
      return;
    }

    // Policy Limit Check: Prevent submission if limit is exceeded
    if (maxBudgetLimit !== null && estimatedBudget > maxBudgetLimit) {
      setPolicyLimitModal({
        isOpen: true,
        limit: maxBudgetLimit,
        attempted: estimatedBudget
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await expenseApi.updateTravelRequest(editingId, { fromLocation, toLocation, purpose, startDate, endDate, estimatedBudget });
        setToast({ type: 'success', message: 'Travel request updated and resubmitted for approval.' });
      } else {
        await expenseApi.createTravelRequest({ fromLocation, toLocation, purpose, startDate, endDate, estimatedBudget });
        setToast({ type: 'success', message: 'Travel request submitted and sent for approval.' });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFromLocation(''); setToLocation(''); setPurpose(''); setEstimatedBudget(0);
      fetchTravelRequests();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to submit travel request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setActionLoading(id);
      await expenseApi.updateTravelRequestStatus(id, 'approve');
      setToast({ type: 'success', message: 'Travel request approved and advanced to next stage.' });
      fetchTravelRequests();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to approve.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    if (!rejectReason.trim()) {
      setToast({ type: 'error', message: 'Please provide a rejection reason.' });
      return;
    }
    try {
      setActionLoading(rejectModalId);
      await expenseApi.updateTravelRequestStatus(rejectModalId, 'rejected', rejectReason);
      setToast({ type: 'success', message: 'Travel request rejected.' });
      setRejectModalId(null);
      setRejectReason('');
      fetchTravelRequests();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to reject.' });
    } finally {
      setActionLoading(null);
    }
  };

  const currentEmpId = Number(user?.employeeId || (user as any)?.employee_id || 0);
  const currentUserId = Number(user?.id || 0);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <LegacyWorkflowNotice rows={requests} prefix="tr_" onComplete={fetchTravelRequests} />

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
            <Compass className="w-6 h-6 text-blue-600" />
            Travel Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Multi-level pre-approval for official business travel
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create Travel Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, request #, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="pending_finance">Finance Queue</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {isManagement && (
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading travel requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-14 text-center flex flex-col items-center justify-center">
            <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Travel Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">Create a pre-approved travel request before booking or requesting advances.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Request #</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">From → To</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Budget</th>
                  <th className="py-3.5 px-4">Current Stage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((rawTr) => {
                  const tr = rawTr as any;
                  const reqNum = tr.requestNumber || tr.request_number || `TRV-${tr.id}`;
                  const fName = tr.firstName || tr.first_name || '';
                  const lName = tr.lastName || tr.last_name || '';
                  const dept = tr.departmentName || tr.department_name || '';
                  const code = tr.employeeCode || tr.employee_code || '';
                  const fromLoc = tr.fromLocation || tr.from_location || '';
                  const toLoc = tr.toLocation || tr.to_location || '';
                  const sDate = tr.startDate || tr.start_date;
                  const eDate = tr.endDate || tr.end_date;
                  const budget = Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0);
                  const role = tr.submittedByRole || tr.submitted_by_role || 'employee';
                  const approverRole = tr.currentApproverRole || tr.current_approver_role;
                  const status = String(tr.status || 'pending');
                  const rejReason = tr.rejectionReason || tr.rejection_reason;

                  const reqEmpId = Number(tr.employeeId || tr.employee_id || 0);
                  const reqUserId = Number(tr.userId || tr.user_id || tr.submittedByUserId || tr.submitted_by_user_id || 0);
                  const isOwnRequest =
                    (currentEmpId > 0 && reqEmpId > 0 && currentEmpId === reqEmpId) ||
                    (currentUserId > 0 && reqUserId > 0 && currentUserId === reqUserId) ||
                    (currentUserId > 0 && reqEmpId > 0 && currentUserId === reqEmpId);

                  const stLower = status.toLowerCase();
                  const isLevel1Stage = stLower === 'pending_level_1' || stLower === 'pending' || stLower === 'submitted';
                  const isLevel2Stage = stLower === 'pending_level_2' || stLower === 'pending_manager';
                  const isLevel3Stage = stLower === 'pending_level_3';
                  const isFinanceStage = stLower === 'pending_finance';

                  const isHrOrAdminPortal = path.startsWith('/hr') || path.startsWith('/admin') || path.startsWith('/expenses');
                  const isManagerPortal = path.startsWith('/manager');
                  const isTeamLeadPortal = path.startsWith('/team-lead');

                  const canAct = Boolean(tr.canApprove);

                  return (
                    <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">{reqNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        </div>
                        {dept && <div className="text-[11px] text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{dept}</div>}
                        {code && <div className="text-[10px] text-slate-400">{code}</div>}
                        <div className="mt-1">{getPortalBadge(role)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {fromLoc} <ChevronRight className="w-3 h-3 inline text-slate-400" /> {toLoc}
                        <span className="block text-[11px] text-slate-400 font-normal mt-0.5 max-w-[200px] line-clamp-2">{tr.purpose}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {sDate ? new Date(sDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}
                        {' – '}
                        {eDate ? new Date(eDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{money(budget)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(status, approverRole)}
                        {status === 'rejected' && rejReason && (
                          <div className="text-[10px] text-rose-500 mt-1 max-w-[140px] line-clamp-1" title={rejReason}>↳ {rejReason}</div>
                        )}
                        {approverRole && !['approved', 'rejected', 'returned'].includes(status) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Next: {status === 'pending_level_2' && approverRole === 'Team Lead' ? 'Reporting Manager' : (approverRole === 'Manager Approval' ? 'Reporting Manager' : approverRole)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(status === 'returned' || status === 'draft') && (isOwnRequest || !isManagement) && (
                            <button
                              onClick={() => openEditModal(tr)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 rounded text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Edit & Resubmit Travel Request"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit & Resubmit
                            </button>
                          )}
                          {canAct && (
                            <a
                              href={path.startsWith('/manager') ? '/manager/expenses/approvals' : (path.startsWith('/team-lead') ? '/team-lead/expenses/approvals' : '/dashboard/expenses/approvals')}
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                            >
                              Approve in Expense Approvals →
                            </a>
                          )}
                          {!canAct && !(status === 'returned' || status === 'draft') && (
                            <span className="text-[11px] text-slate-400">—</span>
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

      {/* REJECT MODAL */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" /> Reject Travel Request
            </h2>
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="State the reason for rejecting this travel request..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setRejectModalId(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button
                onClick={handleReject}
                disabled={actionLoading !== null}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {actionLoading !== null ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0">Create Travel Request</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
              Request will be routed through the configured approval workflow (Manager → Finance).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">From Location *</label>
                <input type="text" placeholder="e.g. Mumbai" value={fromLocation} onChange={e => setFromLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Location *</label>
                <input type="text" placeholder="e.g. Bengaluru" value={toLocation} onChange={e => setToLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Estimated Budget (₹) *</label>
                  {maxBudgetLimit !== null ? (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Policy Max Limit: {money(maxBudgetLimit)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Policy: Unlimited / No Cap
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1000"
                  value={estimatedBudget || ''}
                  onChange={e => setEstimatedBudget(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
                    maxBudgetLimit !== null && estimatedBudget > maxBudgetLimit
                      ? 'border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 focus:ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                      : maxBudgetLimit === null
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 focus:ring-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-blue-500'
                  }`}
                />

                {/* Live Policy Limit Warning */}
                {maxBudgetLimit !== null && estimatedBudget > maxBudgetLimit && (
                  <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Cannot claim above set limit!</span>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                        Your entered budget of <strong>{money(estimatedBudget)}</strong> exceeds the maximum policy limit of <strong>{money(maxBudgetLimit)}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose of Travel *</label>
                <textarea rows={3} placeholder="e.g. Client Annual Strategy Meeting & Product Pitch" value={purpose} onChange={e => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button disabled={submitting} onClick={handleCreateRequest}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POLICY LIMIT EXCEEDED POPUP MODAL */}
      {policyLimitModal && policyLimitModal.isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Cannot Claim Above Set Limit</h2>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Policy Violation Warning</p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Maximum Allowed Limit:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{money(policyLimitModal.limit)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Your Claimed Budget:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{money(policyLimitModal.attempted)}</span>
              </div>
              <p className="pt-2 border-t border-rose-200 dark:border-rose-800 text-[11px] text-slate-600 dark:text-slate-400">
                You cannot submit a travel request exceeding the organization's set travel policy limit of <strong>{money(policyLimitModal.limit)}</strong>. Please adjust your budget to continue with the workflow.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPolicyLimitModal(null)}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Adjust Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
