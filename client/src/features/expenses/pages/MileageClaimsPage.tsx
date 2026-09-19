import { LegacyWorkflowNotice } from './LegacyWorkflowNotice';
import React, { useEffect, useState } from 'react';
import { expenseApi, MileageClaim, ExpenseSettings, ExpensePolicy, ExpenseCategory } from '../api/expenseApi';
import { useAuthStore } from '../../auth/store/authStore';
import {
  Car,
  Plus,
  Navigation,
  Calculator,
  CheckCircle2,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const MileageClaimsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [claims, setClaims] = useState<MileageClaim[]>([]);
  const [settings, setSettings] = useState<ExpenseSettings | null>(null);
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<number | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form State
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { user } = useAuthStore();

  const fetchMileage = async () => {
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

      const isApproverRole =
        userRoles.some((r: string) => ['manager', 'team_lead', 'hr', 'hr_manager', 'hr_admin', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes(r.toLowerCase())) ||
        ['manager', 'team_lead', 'hr', 'hr_manager', 'hr_admin', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes(singleRole);

      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const [mRes, sRes, pRes, cRes] = await Promise.all([
        expenseApi.getMileageClaims(empId),
        expenseApi.getSettings(),
        expenseApi.getPolicies().catch(() => []),
        expenseApi.getCategories().catch(() => [])
      ]);
      setClaims(mRes || []);
      setSettings(sRes || null);
      setPolicies(pRes || []);
      setCategories(cRes || []);
      // Store isApproverRole in ref for use in handlers
      (window as any).__mileageIsApprover = isApproverRole;
    } catch (err) {
      console.error('Failed to load mileage claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMileage();
  }, []);

  const carRate = Number(settings?.myMileageRateCar ?? settings?.mileageRateCar ?? 12);
  const bikeRate = Number(settings?.myMileageRateBike ?? settings?.mileageRateBike ?? 6);
  const currentRate = vehicleType === 'bike' ? (isNaN(bikeRate) ? 6 : bikeRate) : (isNaN(carRate) ? 12 : carRate);
  const calculatedAmount = (Number(distanceKm) || 0) * currentRate;
  const designationLabel = settings?.myDesignationName || user?.designation || null;

  // Helper to compute active policy limit for mileage from Expense Policies
  const getPolicyLimitInfo = () => {
    const mileageCat = categories.find((c) =>
      c.name.toLowerCase().includes('mileage') ||
      c.code.toLowerCase().includes('mileage') ||
      c.name.toLowerCase().includes('travel')
    );
    const mileageCatId = mileageCat?.id;

    const applicablePols = policies.filter((p) => {
      if (p.isActive === false) return false;
      const pCatId = p.categoryId !== undefined && p.categoryId !== null ? Number(p.categoryId) : 0;
      return pCatId === 0 || (mileageCatId && pCatId === Number(mileageCatId));
    });

    if (applicablePols.length === 0) return null;

    const catSpecificPols = applicablePols.filter((p) => {
      const pCatId = p.categoryId !== undefined && p.categoryId !== null ? Number(p.categoryId) : 0;
      return mileageCatId && pCatId === Number(mileageCatId);
    });
    const targetPols = catSpecificPols.length > 0 ? catSpecificPols : applicablePols;

    const unlimitedPol = targetPols.find((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0) === 0);
    if (unlimitedPol) {
      return {
        limit: 0,
        isUnlimited: true,
        policyName: unlimitedPol.policyName || (unlimitedPol as any).policy_name || 'Unlimited Policy'
      };
    }

    const numericLimits = targetPols
      .map((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0))
      .filter((lim) => lim > 0);

    if (numericLimits.length === 0) return null;

    const minLimit = Math.min(...numericLimits);
    const pol = targetPols.find((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0) === minLimit);
    const policyName = pol?.policyName || (pol as any)?.policy_name || 'Policy Limit';

    return {
      limit: minLimit,
      isUnlimited: false,
      policyName
    };
  };

  const handleCreateMileage = async () => {
    if (!fromLocation.trim() || !toLocation.trim() || distanceKm <= 0) {
      setToast({ type: 'error', message: 'Please enter valid trip location details and distance.' });
      return;
    }
    const limitInfo = getPolicyLimitInfo();
    if (limitInfo && !limitInfo.isUnlimited && limitInfo.limit > 0 && calculatedAmount > limitInfo.limit) {
      setToast({ type: 'error', message: `⚠️ Policy Limit Exceeded: Calculated claim (${money(calculatedAmount)}) exceeds policy limit of ${money(limitInfo.limit)}.` });
      return;
    }
    try {
      setSubmitting(true);
      await expenseApi.createMileageClaim({
        tripDate,
        fromLocation,
        toLocation,
        vehicleType,
        distanceKm,
        ratePerKm: currentRate,
        purpose
      });
      setIsModalOpen(false);
      setToast({ type: 'success', message: 'Mileage claim submitted successfully!' });
      fetchMileage();
      setFromLocation('');
      setToLocation('');
      setDistanceKm(0);
      setPurpose('');
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to submit mileage claim' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setApprovingId(id);
      const res = await expenseApi.approveMileageClaim(id, 'Approved by reviewer');
      setApproveConfirmId(null);
      setToast({ type: 'success', message: res?.message || 'Mileage claim approved successfully!' });
      fetchMileage();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to approve mileage claim' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      setToast({ type: 'error', message: 'Please provide a rejection reason.' });
      return;
    }
    try {
      setApprovingId(rejectTargetId);
      await expenseApi.rejectMileageClaim(rejectTargetId, rejectReason);
      setRejectTargetId(null);
      setRejectReason('');
      setToast({ type: 'success', message: 'Mileage claim rejected.' });
      fetchMileage();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to reject mileage claim' });
    } finally {
      setApprovingId(null);
    }
  };

  const isApprover = !!(window as any).__mileageIsApprover ||
    (user?.role && ['manager', 'team_lead', 'hr', 'hr_manager', 'hr_admin', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes(String(user.role).toLowerCase()));

  const formatStatusText = (status?: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'pending_level_1' || s === 'pending' || s === 'submitted') return 'Pending Level 1 (Team Lead)';
    if (s === 'pending_level_2' || s === 'pending_manager') return 'Pending Level 2 (Manager)';
    if (s === 'pending_level_3') return 'Pending Level 3 (HR)';
    if (s === 'pending_finance') return 'Pending Finance Verification';
    if (s === 'approved') return 'Approved';
    if (s === 'payment_pending') return 'Payment Pending';
    if (s === 'paid' || s === 'reimbursed') return 'Paid';
    if (s === 'rejected') return 'Rejected';
    if (s === 'returned') return 'Returned';
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const statusBadge = (status: string) => {
    const s = String(status || 'pending').toLowerCase();
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
    if (s === 'pending_finance') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    if (s.startsWith('pending_level_')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative">
      <LegacyWorkflowNotice rows={claims} prefix="mc_" onComplete={fetchMileage} />
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-2xl transition-all animate-in fade-in slide-in-from-top-2">
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-gray-500" />}
          {toast.type === 'error' && <AlertTriangle className="h-5 w-5 shrink-0 text-gray-500" />}
          {toast.type === 'info' && <CheckCircle className="h-5 w-5 shrink-0 text-gray-500" />}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold">✕</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-amber-600" />
            Mileage Reimbursement Claims
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Log official trips and automatically calculate distance-based per-kilometer rates
            {designationLabel ? ` for ${designationLabel}` : ''}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Log Mileage Claim
        </button>
      </div>

      {/* Rate Banner — employee's designation rates only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
          <Car className="w-8 h-8 text-amber-600" />
          <div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase">Four-Wheeler Rate</div>
            <div className="text-lg font-bold text-amber-900 dark:text-amber-200">
              ₹{carRate.toFixed(2)} / kilometer
            </div>
            {designationLabel && (
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Assigned for {designationLabel}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3">
          <Navigation className="w-8 h-8 text-blue-600" />
          <div>
            <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold uppercase">Two-Wheeler Rate</div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
              ₹{bikeRate.toFixed(2)} / kilometer
            </div>
            {designationLabel && (
              <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                Assigned for {designationLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading mileage claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Car className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Mileage Claims</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Log your official field travel distance to calculate automatic reimbursement amounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Trip Date</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Route (From → To)</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Distance (km)</th>
                  <th className="py-3.5 px-4">Rate / km</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  {<th className="py-3.5 px-4">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.map((rawMc) => {
                  const mc = rawMc as any;
                  const tDate = mc.tripDate || mc.trip_date;
                  const fName = mc.firstName || mc.first_name || '';
                  const lName = mc.lastName || mc.last_name || '';
                  const fLoc = mc.fromLocation || mc.from_location || '';
                  const tLoc = mc.toLocation || mc.to_location || '';
                  const vType = mc.vehicleType || mc.vehicle_type || 'car';
                  const dist = Number(mc.distanceKm ?? mc.distance_km ?? 0);
                  const rate = Number(mc.ratePerKm ?? mc.rate_per_km ?? 0);
                  const calcAmt = Number(mc.calculatedAmount ?? mc.calculated_amount ?? (dist * rate));

                  const formattedTripDate = tDate ? new Date(tDate).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={mc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {formattedTripDate}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {fLoc} → {tLoc}
                        {mc.purpose && <span className="block text-[11px] text-slate-400">{mc.purpose}</span>}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-slate-600 dark:text-slate-400">
                        {vType}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {dist} km
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        ₹{rate.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                        {money(calcAmt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(mc.status)}`}>
                          {formatStatusText(mc.status)}
                        </span>
                      </td>
                      {(
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {(() => {
                            const curUserId = user?.id || (user as any)?.userId || (user as any)?.employeeId;
                            const isSelfClaim = Boolean(
                              (mc.employeeId && user?.employeeId && Number(mc.employeeId) === Number(user.employeeId)) ||
                              (mc.submittedByUserId && curUserId && Number(mc.submittedByUserId) === Number(curUserId))
                            );
                            if (isSelfClaim) {
                              return <span className="text-xs text-slate-400 italic">Self Claim</span>;
                            }
                            const stLower = (mc.status || '').toLowerCase();
                            const isLevel1Stage = stLower === 'pending_level_1' || stLower === 'pending' || stLower === 'submitted';
                            const isLevel2Stage = stLower === 'pending_level_2' || stLower === 'pending_manager';
                            const isLevel3Stage = stLower === 'pending_level_3';
                            const isFinanceStage = stLower === 'pending_finance';

                            const pathName = window.location.pathname.toLowerCase();
                            const isHrOrAdminPortal = pathName.startsWith('/hr') || pathName.startsWith('/admin') || pathName.startsWith('/expenses');
                            const isManagerPortal = pathName.startsWith('/manager');
                            const isTeamLeadPortal = pathName.startsWith('/team-lead');

                            const canActAtStage = Boolean(mc.canApprove);

                            if (!canActAtStage) {
                              return <span className="text-xs text-slate-400">—</span>;
                            }

                            return (
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={approvingId === mc.id}
                                  onClick={() => setApproveConfirmId(Number(mc.id))}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {approvingId === mc.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  disabled={approvingId === mc.id}
                                  onClick={() => { setRejectTargetId(Number(mc.id)); setRejectReason(''); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            );
                          })()}
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

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              Log Mileage Expense
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Trip Date *</label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">From Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Office HQ"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Client Site"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle Type *</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="car">Car / 4-Wheeler (₹{carRate}/km)</option>
                    <option value="bike">Motorcycle / Bike (₹{bikeRate}/km)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Distance (km) *</label>
                  {(() => {
                    const limitInfo = getPolicyLimitInfo();
                    const isExceeded = Boolean(limitInfo && !limitInfo.isUnlimited && limitInfo.limit > 0 && calculatedAmount > limitInfo.limit);
                    return (
                      <input
                        type="number"
                        placeholder="e.g. 45"
                        value={distanceKm || ''}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          isExceeded
                            ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500 focus:outline-none'
                            : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Calculated total box */}
              {(() => {
                const limitInfo = getPolicyLimitInfo();
                const isExceeded = Boolean(limitInfo && !limitInfo.isUnlimited && limitInfo.limit > 0 && calculatedAmount > limitInfo.limit);
                return (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isExceeded
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                      : limitInfo?.isUnlimited
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Calculated Reimbursable Amount</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {money(calculatedAmount)} ({distanceKm} km × {vehicleType === 'car' ? `₹${carRate}` : `₹${bikeRate}`})
                      </p>
                    </div>
                    {isExceeded && limitInfo && (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        Amount exceeds set policy limit of {money(limitInfo.limit)}! Cannot claim above set limit.
                      </span>
                    )}
                    {limitInfo?.isUnlimited && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Unlimited Policy Active
                      </span>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Trip Purpose</label>
                <textarea
                  rows={2}
                  placeholder="State purpose of visit..."
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
                onClick={handleCreateMileage}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Mileage Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {approveConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Confirm Approval
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to approve this mileage claim? It will be forwarded to the next workflow approval tier.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setApproveConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={approvingId !== null}
                onClick={() => handleApprove(approveConfirmId)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
              >
                {approvingId ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Reject Mileage Claim
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rejection Reason *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State the reason for rejection..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => { setRejectTargetId(null); setRejectReason(''); }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || approvingId !== null}
                onClick={handleReject}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
              >
                {approvingId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
