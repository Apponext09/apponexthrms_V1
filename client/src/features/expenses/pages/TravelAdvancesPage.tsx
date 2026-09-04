import React, { useEffect, useState } from 'react';
import { expenseApi, TravelAdvance, TravelRequest } from '../api/expenseApi';
import { useAuthStore } from '../../auth/store/authStore';
import {
  IndianRupee,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  FileText
} from 'lucide-react';

export const TravelAdvancesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<TravelAdvance[]>([]);
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [travelRequestId, setTravelRequestId] = useState<number | undefined>(undefined);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuthStore();

  const fetchAdvancesAndTravel = async () => {
    try {
      setLoading(true);
      const userRoles = Array.isArray(user?.roles) ? user.roles : [];
      const singleRole = (user?.role || user?.accessRole || (user as any)?.roleCode || '').toLowerCase();
      const path = window.location.pathname.toLowerCase();

      const isManagement =
        userRoles.some((r: string) => ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes(r.toLowerCase())) ||
        ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes(singleRole) ||
        path.startsWith('/manager') ||
        path.startsWith('/team-lead') ||
        path.startsWith('/hr') ||
        path.startsWith('/admin');

      // For managers/HR/CEO/Admin: fetch all employee advances across org/team
      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const [advRes, trRes] = await Promise.all([
        expenseApi.getTravelAdvances(empId),
        expenseApi.getTravelRequests(empId)
      ]);
      setAdvances(advRes || []);
      setTravelRequests(trRes || []);
    } catch (err) {
      console.error('Failed to load travel advances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancesAndTravel();
  }, []);

  const handleCreateAdvance = async () => {
    if (!advanceAmount || advanceAmount <= 0) {
      alert('Please enter a valid advance amount.');
      return;
    }
    try {
      setSubmitting(true);
      await expenseApi.createTravelAdvance({
        travelRequestId,
        advanceAmount,
        purpose
      });
      setIsModalOpen(false);
      fetchAdvancesAndTravel();
      setAdvanceAmount(0);
      setPurpose('');
    } catch (err: any) {
      alert(err.message || 'Failed to request travel advance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-emerald-600" />
            Travel Advances & Settlement
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Request cash advances before trips, track disbursals, and reconcile settlement balances
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Request Travel Advance
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading travel advances...</div>
        ) : advances.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <IndianRupee className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Travel Advances Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Request cash advances for upcoming approved travel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Advance #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Linked Travel Req</th>
                  <th className="py-3.5 px-4">Requested Advance</th>
                  <th className="py-3.5 px-4">Settled Amount</th>
                  <th className="py-3.5 px-4">Balance Settlement</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advances.map((rawAdv) => {
                  const adv = rawAdv as any;
                  const advNum = adv.advanceNumber || adv.advance_number || `ADV-${adv.id}`;
                  const fName = adv.firstName || adv.first_name || '';
                  const lName = adv.lastName || adv.last_name || '';
                  const reqNum = adv.requestNumber || adv.request_number;
                  const advAmt = Number(adv.advanceAmount ?? adv.advance_amount ?? 0);
                  const setAmt = Number(adv.settledAmount ?? adv.settled_amount ?? 0);
                  const bal = Number(adv.balanceAmount ?? adv.balance_amount ?? (advAmt - setAmt));

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {advNum}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {reqNum ? `${reqNum}` : 'Direct Advance'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{advAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{setAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{bal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {adv.status || 'Requested'}
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

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Request Travel Advance</h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Approved Travel Request (Optional)
                </label>
                <select
                  value={travelRequestId || ''}
                  onChange={(e) => setTravelRequestId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">-- Direct Advance / General --</option>
                  {travelRequests.map((rawTr) => {
                    const tr = rawTr as any;
                    const rNum = tr.requestNumber || tr.request_number || `TRV-${tr.id}`;
                    const fLoc = tr.fromLocation || tr.from_location || '';
                    const tLoc = tr.toLocation || tr.to_location || '';
                    return (
                      <option key={tr.id} value={tr.id}>
                        {rNum} {fLoc || tLoc ? `(${fLoc} → ${tLoc})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Advance Amount Requested (₹) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  placeholder="State purpose of advance (e.g. Hotel deposit & local transit)..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleCreateAdvance}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Advance Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
