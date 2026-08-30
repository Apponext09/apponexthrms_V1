import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim } from '../api/expenseApi';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Paperclip,
  DollarSign,
  AlertCircle,
  Eye,
  Building
} from 'lucide-react';

export const FinanceVerificationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Form for partial/full item adjustments
  const [itemAdjustments, setItemAdjustments] = useState<
    Array<{ id: number; claimedAmount: number; approvedAmount: number; adjustmentReason: string }>
  >([]);
  const [financeComments, setFinanceComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFinanceQueue = async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getClaims({ status: 'pending_finance' });
      setClaims(res || []);
    } catch (err) {
      console.error('Failed to load finance queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceQueue();
  }, []);

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
    try {
      setSubmitting(true);
      await expenseApi.financeVerifyClaim(selectedClaim.id, {
        items: itemAdjustments,
        comments: financeComments || 'Finance verified and queued for payout.'
      });
      setSelectedClaim(null);
      fetchFinanceQueue();
    } catch (err: any) {
      alert(err.message || 'Finance verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck2 className="w-6 h-6 text-blue-600" />
          Finance Verification & Partial Approval
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verify receipts, policy compliance, GST details, and perform partial itemized adjustments before payout
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading finance queue...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Finance Queue Clear</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              There are no expense claims pending finance verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  const dept = claim.departmentName || claim.department_name || 'General';
                  const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                  const cDate = claim.submittedAt || claim.submitted_at || claim.claimDate || claim.claim_date;
                  const totClaimed = Number(claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                  const payMethod = claim.paymentMethod || claim.payment_method || 'Payroll';

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
                        <button
                          onClick={() => openVerificationModal(claim.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 ml-auto"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> Verify & Approve
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
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">
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
                  Finance Verification Comments
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter verification notes for payout processing..."
                  value={financeComments}
                  onChange={(e) => setFinanceComments(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
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
    </div>
  );
};
