import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim } from '../api/expenseApi';
import {
  CreditCard,
  CheckCircle2,
  DollarSign,
  Calendar,
  Building,
  Hash,
  Send
} from 'lucide-react';

export const ReimbursementsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  // Form
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayoutQueue = async () => {
    try {
      setLoading(true);
      const res = await expenseApi.getClaims({ status: 'payment_pending' });
      setClaims(res || []);
    } catch (err) {
      console.error('Failed to load reimbursement queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutQueue();
  }, []);

  const openPaymentModal = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaidAmount(claim.totalApprovedAmount || claim.totalClaimedAmount);
    setPaymentMethod(claim.paymentMethod === 'payroll' ? 'bank_transfer' : (claim.paymentMethod || 'bank_transfer'));
    setPaymentReference(`TXN-${Date.now().toString().slice(-6)}`);
  };

  const handleProcessPayment = async () => {
    if (!selectedClaim) return;
    try {
      setSubmitting(true);
      await expenseApi.processReimbursement(selectedClaim.id, {
        paymentDate,
        paidAmount,
        paymentMethod,
        paymentReference
      });
      setSelectedClaim(null);
      fetchPayoutQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-purple-600" />
          Reimbursements & Disbursal Queue
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Process verified expense payouts via bank transfer or manual disbursal
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading payout queue...</div>
        ) : claims.length === 0 ? (
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
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Claim</th>
                  <th className="py-3.5 px-4">Approved Amount</th>
                  <th className="py-3.5 px-4">Target Method</th>
                  <th className="py-3.5 px-4">Approved Date</th>
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
                  const appAt = claim.approvedAt || claim.approved_at;
                  const totApproved = Number(claim.totalApprovedAmount ?? claim.total_approved_amount ?? claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                  const payMethod = claim.paymentMethod || claim.payment_method || 'Bank Transfer';

                  const formattedAppDate = appAt ? new Date(appAt).toLocaleDateString() : '-';

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
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totApproved.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-slate-700 dark:text-slate-300">
                        {payMethod}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formattedAppDate}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openPaymentModal(claim)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 ml-auto"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Record Payment
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

      {/* PAYMENT DISBURSAL MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Reimbursement Payment</h3>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                {selectedClaim.firstName} {selectedClaim.lastName} ({selectedClaim.claimNumber})
              </div>
              <div className="text-slate-500">Claim Title: {selectedClaim.title}</div>
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
                  Paid Amount (₹) *
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
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
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="manual">Manual Payment (Cash / Cheque)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference Number / UTR *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR982347239"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleProcessPayment}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
