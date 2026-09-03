import React, { useEffect, useState } from 'react';
import { expenseApi, MileageClaim, ExpenseSettings } from '../api/expenseApi';
import { useAuthStore } from '../../auth/store/authStore';
import {
  Car,
  Plus,
  Navigation,
  Calculator,
  CheckCircle2,
  Calendar,
  MapPin
} from 'lucide-react';

export const MileageClaimsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<MileageClaim[]>([]);
  const [settings, setSettings] = useState<ExpenseSettings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [tripDate, setTripDate] = useState(new Date().toISOString().slice(0, 10));
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      // For managers/HR/CEO/Admin: fetch all employee mileage claims across org/team
      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const [mRes, sRes] = await Promise.all([
        expenseApi.getMileageClaims(empId),
        expenseApi.getSettings()
      ]);
      setClaims(mRes || []);
      setSettings(sRes || null);
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

  const handleCreateMileage = async () => {
    if (!fromLocation.trim() || !toLocation.trim() || distanceKm <= 0) {
      alert('Please enter valid trip location details and distance.');
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
      fetchMileage();
      setFromLocation('');
      setToLocation('');
      setDistanceKm(0);
      setPurpose('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit mileage claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
                        ₹{calcAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {mc.status || 'Pending'}
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
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    value={distanceKm || ''}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Calculated total box */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                <span className="text-amber-800 dark:text-amber-300 font-semibold">Calculated Mileage Claim:</span>
                <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  ₹{calculatedAmount.toLocaleString('en-IN')}
                </span>
              </div>

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
    </div>
  );
};
