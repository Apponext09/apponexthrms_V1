import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim } from '../api/expenseApi';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  FileText,
  Clock,
  User,
  Building,
  Paperclip,
  AlertTriangle,
  Check
} from 'lucide-react';

export const ExpenseApprovalsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Modal actions state
  const [actionType, setActionType] = useState<'reject' | 'return' | null>(null);
  const [targetClaimId, setTargetClaimId] = useState<number | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getClaims({ status: 'pending_approvals' });
      setClaims(res || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (claim: ExpenseClaim) => {
    try {
      setProcessingId(claim.id);
      if (claim.status === 'pending_finance') {
        await expenseApi.financeVerifyClaim(claim.id, { comments: 'Verified and approved by Finance' });
        setClaims((prev) =>
          prev.map((c) => (c.id === claim.id ? { ...c, status: 'payment_pending' } : c))
        );
      } else {
        await expenseApi.managerApproveClaim(claim.id, 'Approved by Reporting Manager');
        setClaims((prev) =>
          prev.map((c) => (c.id === claim.id ? { ...c, status: 'pending_finance' } : c))
        );
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to approve claim';
      alert(errMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActionSubmit = async () => {
    if (!targetClaimId || !reasonText.trim()) {
      alert('Please enter a mandatory reason/comment.');
      return;
    }
    try {
      setProcessingId(targetClaimId);
      if (actionType === 'reject') {
        await expenseApi.rejectClaim(targetClaimId, reasonText);
      } else if (actionType === 'return') {
        await expenseApi.returnClaim(targetClaimId, reasonText);
      }
      setActionType(null);
      setTargetClaimId(null);
      setReasonText('');
      setClaims((prev) => prev.filter((c) => c.id !== targetClaimId));
      setSelectedClaim(null);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expense Claim Approvals</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review and process expense reimbursements submitted by direct report employees
        </p>
      </div>

      {/* Pending Claims List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading pending approvals...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              There are currently no pending expense claims requiring your approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Claim Details</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Claimed Amount</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
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

                  const hasViolations = claim.items?.some((it: any) => (it.policyValidated ?? it.policy_validated) === false);
                  const isProcessing = processingId === claim.id;
                  const isPendingManager = ['submitted', 'pending_manager'].includes(claim.status);
                  const isPendingFinance = claim.status === 'pending_finance';
                  const isApprovedOrPaid = ['approved', 'payment_pending', 'paid'].includes(claim.status);

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
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{totClaimed.toLocaleString('en-IN')}
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
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isApprovedOrPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : (
                            <>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleApprove(claim)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {isProcessing
                                  ? 'Processing...'
                                  : isPendingFinance
                                  ? 'Approve (Finance)'
                                  : 'Approve'}
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => {
                                  setTargetClaimId(claim.id);
                                  setActionType('return');
                                  setReasonText('');
                                }}
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Return
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => {
                                  setTargetClaimId(claim.id);
                                  setActionType('reject');
                                  setReasonText('');
                                }}
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

      {/* FULL CLAIM INSPECTION MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedClaim.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedClaim.claimNumber}</p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Employee Info Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedClaim.firstName} {selectedClaim.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedClaim.departmentName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Claim Date</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(selectedClaim.claimDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Amount</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    ₹{Number(selectedClaim.totalClaimedAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Items List */}
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
                        {item.merchantName && (
                          <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Merchant: {item.merchantName}</p>
                        )}
                        {item.employeeJustification && (
                          <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            Justification: {item.employeeJustification}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          ₹{Number(item.claimedAmount).toLocaleString('en-IN')}
                        </span>
                        {item.receiptUrl && (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg font-medium text-[11px] flex items-center gap-1 border border-blue-200 dark:border-blue-800"
                          >
                            <Paperclip className="w-3 h-3" /> View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Logs Timeline */}
              {selectedClaim.timeline && selectedClaim.timeline.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Approval History & Logs
                  </h4>
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
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
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

      {/* MANDATORY REASON MODAL FOR REJECT / RETURN */}
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
                onClick={() => {
                  setActionType(null);
                  setTargetClaimId(null);
                  setReasonText('');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(processingId)}
                onClick={handleActionSubmit}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm ${
                  actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'
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
