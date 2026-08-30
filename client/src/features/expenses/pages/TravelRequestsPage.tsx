import React, { useEffect, useState } from 'react';
import { expenseApi, TravelRequest } from '../api/expenseApi';
import { useAuthStore } from '../../auth/store/authStore';
import {
  Compass,
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

export const TravelRequestsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuthStore();

  const fetchTravelRequests = async () => {
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

      // For managers/HR/CEO/Admin: fetch all employee travel requests across org/team
      const empId = isManagement ? undefined : (user?.employeeId || (user as any)?.employee_id);
      const res = await expenseApi.getTravelRequests(empId);
      setRequests(res || []);
    } catch (err) {
      console.error('Failed to load travel requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravelRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!fromLocation.trim() || !toLocation.trim() || !purpose.trim()) {
      alert('Please fill in all required travel fields.');
      return;
    }
    try {
      setSubmitting(true);
      await expenseApi.createTravelRequest({
        fromLocation,
        toLocation,
        purpose,
        startDate,
        endDate,
        estimatedBudget
      });
      setIsModalOpen(false);
      fetchTravelRequests();
      setFromLocation('');
      setToLocation('');
      setPurpose('');
      setEstimatedBudget(0);
    } catch (err: any) {
      alert(err.message || 'Failed to submit travel request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await expenseApi.updateTravelRequestStatus(id, status);
      fetchTravelRequests();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap';
    switch (status) {
      case 'approved':
        return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>Approved</span>;
      case 'pending_finance':
        return <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300`}>Pending finance</span>;
      case 'rejected':
        return <span className={`${base} bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300`}>Rejected</span>;
      default:
        return <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}>Pending</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600" />
            Travel Management Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit official business travel pre-approvals and estimated travel budgets
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Travel Request
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading travel requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Travel Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Create a pre-approved travel request before booking flights or requesting advances.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Request #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">From → To</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Estimated Budget</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((rawTr) => {
                  const tr = rawTr as any;
                  const reqNum = tr.requestNumber || tr.request_number || `TRV-${tr.id}`;
                  const fName = tr.firstName || tr.first_name || '';
                  const lName = tr.lastName || tr.last_name || '';
                  const dept = tr.departmentName || tr.department_name || 'General';
                  const fromLoc = tr.fromLocation || tr.from_location || '';
                  const toLoc = tr.toLocation || tr.to_location || '';
                  const sDate = tr.startDate || tr.start_date;
                  const eDate = tr.endDate || tr.end_date;
                  const budget = Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0);

                  const formattedStartDate = sDate ? new Date(sDate).toLocaleDateString() : 'N/A';
                  const formattedEndDate = eDate ? new Date(eDate).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {reqNum}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {fName || lName ? `${fName} ${lName}`.trim() : 'Employee'}
                        </div>
                        <div className="text-[11px] text-slate-500">{dept}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {fromLoc} → {toLoc}
                        <span className="block text-[11px] text-slate-400 font-normal">{tr.purpose}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formattedStartDate} - {formattedEndDate}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{budget.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(tr.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {tr.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStatusUpdate(tr.id, 'approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(tr.id, 'rejected')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92dvh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0">Create Travel Request</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">From Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estimated Budget (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose of Travel *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Client Annual Strategy Meeting & Product Pitch"
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
                onClick={handleCreateRequest}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
