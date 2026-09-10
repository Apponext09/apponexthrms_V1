import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi, ExpenseClaim, TravelAdvance } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Building,
  Hash,
  Send,
  Search,
  Filter,
  Download,
  IndianRupee,
  Banknote,
  FileText,
  Clock,
  Printer,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowUpRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useExpenseMoney } from '../utils/useExpenseMoney';

export const ReimbursementsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [disbursedClaims, setDisbursedClaims] = useState<ExpenseClaim[]>([]);
  const [travelAdvances, setTravelAdvances] = useState<TravelAdvance[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [viewVoucherClaim, setViewVoucherClaim] = useState<ExpenseClaim | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'pending' | 'disbursed' | 'advances'>('pending');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);

  // Batch Selection for Bulk Disbursal
  const [selectedClaimIds, setSelectedClaimIds] = useState<number[]>([]);
  const [batchPaymentModalOpen, setBatchPaymentModalOpen] = useState(false);
  const [batchPaymentMethod, setBatchPaymentMethod] = useState('bank_transfer');
  const [batchPaymentReference, setBatchPaymentReference] = useState('');
  const [batchPaymentDate, setBatchPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Single Disbursal Form
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; subtitle?: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: [] }));
      const depts = (res?.data?.data || res?.data || []).map((d: any) => ({
        id: Number(d.id),
        name: d.name || String(d.id)
      })).filter((d: any) => d.id);
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const fetchPayoutData = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRes, paidRes, advRes] = await Promise.all([
        expenseApi.getClaims({ status: 'payment_pending', mode: 'payout' }),
        expenseApi.getClaims({ status: 'paid', mode: 'payout' }),
        expenseApi.getTravelAdvances({ status: 'approved' }),
      ]);
      setClaims(pendingRes || []);
      setDisbursedClaims(paidRes || []);
      setTravelAdvances(advRes || []);
    } catch (err) {
      console.error('Failed to load reimbursement queues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchPayoutData();
  }, [fetchPayoutData]);

  const openPaymentModal = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaidAmount(Number(claim.totalApprovedAmount || claim.totalClaimedAmount || 0));
    setPaymentMethod(claim.paymentMethod === 'payroll' ? 'bank_transfer' : (claim.paymentMethod || 'bank_transfer'));
    setPaymentReference(`UTR-${Date.now().toString().slice(-6)}`);
  };

  const handleProcessPayment = async () => {
    if (!selectedClaim) return;
    if (paymentMethod !== 'cash' && !paymentReference.trim()) {
      alert('Transaction Reference Number / UTR is mandatory for non-cash payments.');
      return;
    }
    try {
      setSubmitting(true);
      await expenseApi.processReimbursement(selectedClaim.id, {
        paymentDate,
        paidAmount,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined
      });
      setToast({
        type: 'success',
        title: '✅ Payment Disbursed!',
        subtitle: `Claim #${selectedClaim.claimNumber || selectedClaim.id} marked as Paid (${money(paidAmount)}).`
      });
      setSelectedClaim(null);
      setSelectedClaimIds(prev => prev.filter(id => id !== selectedClaim.id));
      fetchPayoutData();
    } catch (err: any) {
      alert(err.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchProcessPayment = async () => {
    if (selectedClaimIds.length === 0) return;
    if (batchPaymentMethod !== 'cash' && !batchPaymentReference.trim()) {
      alert('Batch Reference Number is required for non-cash batch disbursal.');
      return;
    }
    try {
      setSubmitting(true);
      let successCount = 0;
      for (const id of selectedClaimIds) {
        const claim = claims.find(c => c.id === id);
        if (!claim) continue;
        const amt = Number(claim.totalApprovedAmount || claim.totalClaimedAmount || 0);
        await expenseApi.processReimbursement(id, {
          paymentDate: batchPaymentDate,
          paidAmount: amt,
          paymentMethod: batchPaymentMethod,
          paymentReference: `${batchPaymentReference.trim()}-${id}`
        });
        successCount++;
      }
      setToast({
        type: 'success',
        title: '🚀 Batch Payout Completed!',
        subtitle: `Successfully disbursed ${successCount} expense claims via ${batchPaymentMethod.replace('_', ' ')}.`
      });
      setBatchPaymentModalOpen(false);
      setSelectedClaimIds([]);
      fetchPayoutData();
    } catch (err: any) {
      alert(err.message || 'Failed to process batch payments');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectClaim = (id: number) => {
    setSelectedClaimIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (items: ExpenseClaim[]) => {
    if (selectedClaimIds.length === items.length) {
      setSelectedClaimIds([]);
    } else {
      setSelectedClaimIds(items.map(c => c.id));
    }
  };

  // Filter Logic
  const filterClaimList = (list: ExpenseClaim[]) => {
    return list.filter((c: any) => {
      const q = searchQuery.toLowerCase().trim();
      const fName = c.firstName || c.first_name || '';
      const lName = c.lastName || c.last_name || '';
      const empCode = c.employeeCode || c.employee_code || '';
      const title = c.title || '';
      const cNum = c.claimNumber || c.claim_number || '';
      const ref = c.paymentReference || c.payment_reference || '';

      const matchesSearch = !q || (
        `${fName} ${lName}`.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        cNum.toLowerCase().includes(q) ||
        ref.toLowerCase().includes(q)
      );

      const matchesDept = !departmentFilter || String(c.departmentName || c.department_name || '') === departmentFilter;
      const matchesMethod = !paymentMethodFilter || String(c.paymentMethod || c.payment_method || '').toLowerCase() === paymentMethodFilter.toLowerCase();

      return matchesSearch && matchesDept && matchesMethod;
    });
  };

  const filteredPending = filterClaimList(claims);
  const filteredDisbursed = filterClaimList(disbursedClaims);
  const filteredAdvances = travelAdvances.filter((a: any) => {
    const q = searchQuery.toLowerCase().trim();
    const fName = a.firstName || a.first_name || '';
    const lName = a.lastName || a.last_name || '';
    const advNum = a.advanceNumber || a.advance_number || '';
    return !q || `${fName} ${lName}`.toLowerCase().includes(q) || advNum.toLowerCase().includes(q);
  });

  // Export CSV formatted for Bank Transfer / NEFT Batch
  const exportPayoutCsv = () => {
    const rows = filteredPending.map((c: any) => {
      const empName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Employee';
      const amt = Number(c.totalApprovedAmount ?? c.total_approved_amount ?? c.totalClaimedAmount ?? 0);
      return [
        c.employeeCode || '',
        `"${empName}"`,
        `"${c.bankName || 'N/A'}"`,
        `"${c.accountNumber || ''}"`,
        `"${c.ifscCode || ''}"`,
        amt.toFixed(2),
        c.claimNumber || `EXP-${c.id}`,
        `"${c.title || ''}"`
      ].join(',');
    });

    const header = 'Employee Code,Beneficiary Name,Bank Name,Account Number,IFSC Code,Amount (INR),Claim Number,Purpose';
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reimbursement_payout_batch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPendingAmount = claims.reduce((sum, c: any) => sum + Number(c.totalApprovedAmount ?? c.total_approved_amount ?? c.totalClaimedAmount ?? 0), 0);
  const totalDisbursedAmount = disbursedClaims.reduce((sum, c: any) => sum + Number(c.paidAmount ?? c.paid_amount ?? c.totalApprovedAmount ?? 0), 0);
  const totalApprovedAdvances = travelAdvances.reduce((sum, a: any) => sum + Number(a.approvedAmount ?? a.approved_amount ?? a.advanceAmount ?? 0), 0);
  const selectedTotalAmount = claims
    .filter(c => selectedClaimIds.includes(c.id))
    .reduce((sum, c: any) => sum + Number(c.totalApprovedAmount ?? c.total_approved_amount ?? c.totalClaimedAmount ?? 0), 0);

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
          <div className="mt-0.5 shrink-0 rounded-full p-1 bg-emerald-200 dark:bg-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{toast.title}</p>
            {toast.subtitle && <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">{toast.subtitle}</p>}
          </div>
          <button onClick={() => setToast(null)} className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Reimbursements & Disbursals Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Process verified expense payouts, track bank transfer references, and view historical disbursals
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filteredPending.length > 0 && (
            <button
              onClick={exportPayoutCsv}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Export Bank CSV
            </button>
          )}
          {selectedClaimIds.length > 0 && (
            <button
              onClick={() => {
                setBatchPaymentReference(`BATCH-NEFT-${Date.now().toString().slice(-6)}`);
                setBatchPaymentModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Disburse Selected ({selectedClaimIds.length}) • {money(selectedTotalAmount)}
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{money(totalPendingAmount)}</div>
            <div className="text-[11px] text-slate-500">Pending Payout ({claims.length} Claims)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{money(totalDisbursedAmount)}</div>
            <div className="text-[11px] text-slate-500">Total Disbursed to Date</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{money(totalApprovedAdvances)}</div>
            <div className="text-[11px] text-slate-500">Approved Advances ({travelAdvances.length})</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{disbursedClaims.length}</div>
            <div className="text-[11px] text-slate-500">Paid Claims Processed</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Payout Queue (Pending)
          {claims.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              {claims.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('disbursed')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'disbursed'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed History ({disbursedClaims.length})
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'advances'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" /> Travel Advances ({travelAdvances.length})
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Beneficiary / Claim / UTR</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Employee name, code, claim #, UTR..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            >
              <option value="">All methods</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="online">Online / UPI</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TAB 1: PENDING PAYOUT QUEUE ── */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading payout queue...</div>
          ) : filteredPending.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Pending Payments</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                All approved reimbursements have been fully disbursed and paid out.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-3 w-8 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectAll(filteredPending)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {selectedClaimIds.length === filteredPending.length && filteredPending.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4">Beneficiary & Bank Info</th>
                    <th className="py-3.5 px-4">Claim Details</th>
                    <th className="py-3.5 px-4">Approved Amount</th>
                    <th className="py-3.5 px-4">Target Method</th>
                    <th className="py-3.5 px-4">Verified Date</th>
                    <th className="py-3.5 px-4 text-right">Disbursal Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPending.map((rawClaim) => {
                    const claim = rawClaim as any;
                    const fName = claim.firstName || claim.first_name || '';
                    const lName = claim.lastName || claim.last_name || '';
                    const empCode = claim.employeeCode || claim.employee_code || '';
                    const dept = claim.departmentName || claim.department_name || '';
                    const bank = claim.bankName || claim.bank_name;
                    const acc = claim.accountNumber || claim.account_number || claim.account_no;
                    const ifsc = claim.ifscCode || claim.ifsc_code;
                    const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                    const appAt = claim.approvedAt || claim.approved_at;
                    const totApproved = Number(claim.totalApprovedAmount ?? claim.total_approved_amount ?? claim.totalClaimedAmount ?? 0);
                    const payMethod = claim.paymentMethod || claim.payment_method || 'Bank Transfer';
                    const isSelected = selectedClaimIds.includes(claim.id);

                    const formattedAppDate = appAt ? new Date(appAt).toLocaleDateString() : '-';

                    return (
                      <tr
                        key={claim.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectClaim(claim.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {empCode ? `${empCode} • ` : ''}{dept}
                          </div>
                          {bank && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                              🏦 {bank} {acc ? `(A/C: ••••${String(acc).slice(-4)})` : ''} {ifsc ? `• ${ifsc}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{claim.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{cNum}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {money(totApproved)}
                        </td>
                        <td className="py-3.5 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
                            {payMethod}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {formattedAppDate}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openPaymentModal(claim)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 ml-auto"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Disburse Payment
                          </button>
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

      {/* ── TAB 2: DISBURSED PAYMENTS HISTORY ── */}
      {activeTab === 'disbursed' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading history...</div>
          ) : filteredDisbursed.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No completed disbursals found matching filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Beneficiary</th>
                    <th className="py-3.5 px-4">Claim</th>
                    <th className="py-3.5 px-4">Paid Amount</th>
                    <th className="py-3.5 px-4">Disbursal Method</th>
                    <th className="py-3.5 px-4">Transaction UTR / Ref</th>
                    <th className="py-3.5 px-4">Payment Date</th>
                    <th className="py-3.5 px-4 text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDisbursed.map((rawClaim) => {
                    const claim = rawClaim as any;
                    const fName = claim.firstName || claim.first_name || '';
                    const lName = claim.lastName || claim.last_name || '';
                    const empCode = claim.employeeCode || claim.employee_code || '';
                    const dept = claim.departmentName || claim.department_name || '';
                    const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                    const pDate = claim.paymentDate || claim.payment_date || claim.reimbursedAt;
                    const paidAmt = Number(claim.paidAmount ?? claim.paid_amount ?? claim.totalApprovedAmount ?? claim.totalClaimedAmount ?? 0);
                    const payMethod = claim.paymentMethod || claim.payment_method || 'Bank Transfer';
                    const payRef = claim.paymentReference || claim.payment_reference || 'N/A';

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
                        <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {money(paidAmt)}
                        </td>
                        <td className="py-3.5 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                          {payMethod}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-slate-200">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {payRef}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {pDate ? new Date(pDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewVoucherClaim(claim)}
                            className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg font-semibold text-xs border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> View Voucher
                          </button>
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

      {/* ── TAB 3: TRAVEL ADVANCES QUEUE ── */}
      {activeTab === 'advances' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading advances...</div>
          ) : filteredAdvances.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No approved travel advances pending settlement.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Advance #</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Approved Advance Amount</th>
                    <th className="py-3.5 px-4">Settled Amount</th>
                    <th className="py-3.5 px-4">Current Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAdvances.map((rawAdv) => {
                    const adv = rawAdv as any;
                    const advNum = adv.advanceNumber || adv.advance_number || `ADV-${adv.id}`;
                    const fName = adv.firstName || adv.first_name || '';
                    const lName = adv.lastName || adv.last_name || '';
                    const empCode = adv.employeeCode || adv.employee_code || '';
                    const dept = adv.departmentName || adv.department_name || '';
                    const appAmt = Number(adv.approvedAmount ?? adv.approved_amount ?? adv.advanceAmount ?? 0);
                    const setAmt = Number(adv.settledAmount ?? adv.settled_amount ?? 0);
                    const balAmt = Math.max(0, appAmt - setAmt);

                    return (
                      <tr key={adv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">{advNum}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}</div>
                          <div className="text-[11px] text-slate-500">{empCode ? `${empCode} • ` : ''}{dept}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{money(appAmt)}</td>
                        <td className="py-3.5 px-4 text-emerald-600 font-semibold">{money(setAmt)}</td>
                        <td className="py-3.5 px-4 font-bold text-blue-600">{money(balAmt)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {balAmt === 0 ? 'Fully Settled' : 'Disbursed (Active)'}
                          </span>
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

      {/* SINGLE PAYMENT DISBURSAL MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Record Disbursal Payment
              </h3>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Beneficiary Bank Info */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs border border-slate-200/60 dark:border-slate-700/60">
              <div className="font-bold text-slate-900 dark:text-white">
                {selectedClaim.firstName} {selectedClaim.lastName} ({selectedClaim.employeeCode})
              </div>
              <div className="text-slate-500">Claim: {selectedClaim.title} • {selectedClaim.claimNumber}</div>
              {selectedClaim.bankName ? (
                <div className="pt-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  🏦 Bank: {selectedClaim.bankName} | A/C: {selectedClaim.accountNumber || 'N/A'} | IFSC: {selectedClaim.ifscCode || 'N/A'}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">No bank profile on file</div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disbursed Amount (₹) *
                </label>
                <input
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="online">Online / UPI Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference Number / UTR {paymentMethod === 'cash' ? '(Optional)' : '*'}
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'cash' ? 'Optional cash receipt ref...' : 'e.g. UTR982347239 or IMPS ref'}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleProcessPayment}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH PAYMENT MODAL */}
      {batchPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" /> Batch Reimbursement Disbursal
            </h2>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-emerald-900 dark:text-emerald-200">
                <span>Selected Claims</span>
                <span>{selectedClaimIds.length} Claims</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                <span>Total Payout Amount</span>
                <span>{money(selectedTotalAmount)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Disbursal Date *</label>
                <input
                  type="date"
                  value={batchPaymentDate}
                  onChange={(e) => setBatchPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  value={batchPaymentMethod}
                  onChange={(e) => setBatchPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="bank_transfer">Bank Transfer (Batch NEFT / RTGS)</option>
                  <option value="online">Online / UPI Batch</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Batch Reference / UTR Prefix *</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-NEFT-20260907"
                  value={batchPaymentReference}
                  onChange={(e) => setBatchPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setBatchPaymentModalOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                disabled={submitting}
                onClick={handleBatchProcessPayment}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Disbursing Batch...' : `Confirm Disburse (${money(selectedTotalAmount)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PAYMENT VOUCHER MODAL */}
      {viewVoucherClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Reimbursement Payment Voucher
              </h3>
              <button onClick={() => setViewVoucherClaim(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Claim Title</span>
                  <span className="font-bold text-slate-900 dark:text-white">{viewVoucherClaim.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Claim Number</span>
                  <span className="font-mono font-semibold">{viewVoucherClaim.claimNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Beneficiary</span>
                  <span className="font-semibold">{viewVoucherClaim.firstName} {viewVoucherClaim.lastName} ({viewVoucherClaim.employeeCode})</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  <span>Paid Amount</span>
                  <span>{money(Number(viewVoucherClaim.paidAmount || viewVoucherClaim.totalApprovedAmount || 0))}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Date:</span>
                  <span className="text-slate-900 dark:text-white">{viewVoucherClaim.paymentDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="uppercase font-semibold text-slate-900 dark:text-white">{viewVoucherClaim.paymentMethod || 'Bank Transfer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Ref / UTR:</span>
                  <span className="text-emerald-600 font-bold">{viewVoucherClaim.paymentReference || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
              <button onClick={() => setViewVoucherClaim(null)} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
