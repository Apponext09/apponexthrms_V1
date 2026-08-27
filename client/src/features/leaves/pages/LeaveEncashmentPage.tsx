import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { useIsAdmin } from '@/lib/rbac';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  CreditCard, Plus, RefreshCw, CheckCircle2, Clock, XCircle,
  AlertCircle, Database, User, DollarSign, Calendar, Landmark
} from 'lucide-react';

export function LeaveEncashmentPage() {
  const isAdmin = useIsAdmin();

  // Reference lists
  const [employees, setEmployees] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [myBalances, setMyBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    leaveEncashmentSettingId: '',
    encashmentDays: '',
    isFullAndFinal: false,
  });

  // Preview Calculation State
  const [preview, setPreview] = useState<any>(null);

  const fetchReferenceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current employee profile
      const meRes = await apiClient.get('/employees/me').catch(() => null);
      const me = meRes?.data?.data || meRes?.data || null;
      setCurrentUserProfile(me);

      // 2. Fetch lists
      const [empRes, polRes, typeRes, balRes] = await Promise.all([
        isAdmin ? apiClient.get('/employees', { params: { pageSize: 500 } }).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        apiClient.get('/leaves/encashment-settings').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/types').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/balances').catch(() => ({ data: { data: [] } })),
      ]);

      const emps = empRes.data?.data || [];
      setEmployees(emps);

      const activePolicies = (polRes.data?.data || []).filter((p: any) => p.is_active || p.isActive);
      setPolicies(activePolicies);
      setLeaveTypes(typeRes.data?.data || []);
      setMyBalances(balRes.data?.data || []);

      // If regular employee, preset their employee ID in form
      if (!isAdmin && me) {
        setForm(prev => ({ ...prev, employeeId: String(me.id) }));
      } else if (isAdmin && emps.length > 0) {
        setForm(prev => ({ ...prev, employeeId: String(emps[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load reference data', err);
      toast.error('Failed to initialize page data.');
    } finally {
      setLoading(false);
    }
  };

  const [encashmentViewTab, setEncashmentViewTab] = useState<'pending' | 'my'>('pending');

  const fetchRequestsList = async () => {
    try {
      const endpoint = (isAdmin && encashmentViewTab === 'pending') ? '/leaves/encashments/pending' : '/leaves/encashments/my';
      const res = await apiClient.get(endpoint);
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, [isAdmin]);

  useEffect(() => {
    fetchRequestsList();
  }, [isAdmin, encashmentViewTab]);

  // Handle Live Preview on form change
  useEffect(() => {
    const runPreview = async () => {
      const { employeeId, leaveTypeId, leaveEncashmentSettingId, encashmentDays, isFullAndFinal } = form;
      if (!employeeId || !leaveTypeId || !leaveEncashmentSettingId || !encashmentDays || isNaN(parseFloat(encashmentDays))) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const res = await apiClient.post('/leaves/encashments/preview', {
          employeeId: parseInt(employeeId, 10),
          leaveTypeId: parseInt(leaveTypeId, 10),
          leaveEncashmentSettingId: parseInt(leaveEncashmentSettingId, 10),
          encashmentDays: parseFloat(encashmentDays),
          isFullAndFinal
        });
        if (res.data?.success) {
          setPreview(res.data.data);
        }
      } catch (err: any) {
        console.error('Preview generation failed', err);
        setPreview({ error: err.response?.data?.message || err.response?.data?.error?.message || 'Failed to generate preview' });
      } finally {
        setPreviewLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      runPreview();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.leaveTypeId || !form.leaveEncashmentSettingId || !form.encashmentDays) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/leaves/encashments/request', {
        employeeId: parseInt(form.employeeId, 10),
        leaveTypeId: parseInt(form.leaveTypeId, 10),
        leaveEncashmentSettingId: parseInt(form.leaveEncashmentSettingId, 10),
        encashmentDays: parseFloat(form.encashmentDays),
        isFullAndFinal: form.isFullAndFinal
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Encashment request submitted successfully!');
        setForm(prev => ({
          ...prev,
          leaveTypeId: '',
          leaveEncashmentSettingId: '',
          encashmentDays: '',
          isFullAndFinal: false,
        }));
        setPreview(null);
        fetchRequestsList();
        // Reload balances too
        const balRes = await apiClient.get('/leaves/balances').catch(() => ({ data: { data: [] } }));
        setMyBalances(balRes.data?.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin/HR Action Triggers
  const handleApprove = async (id: number) => {
    if (!confirm('Are you sure you want to approve this leave encashment request?')) return;
    try {
      const res = await apiClient.post(`/leaves/encashments/${id}/approve`);
      if (res.data?.success) {
        toast.success('Request approved successfully!');
        fetchRequestsList();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve request.');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Please enter a rejection reason:');
    if (reason === null) return; // cancelled
    try {
      const res = await apiClient.post(`/leaves/encashments/${id}/reject`, { reason });
      if (res.data?.success) {
        toast.success('Request rejected successfully!');
        fetchRequestsList();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject request.');
    }
  };

  const handleMarkAsPaid = async (id: number) => {
    if (!confirm('Are you sure you want to mark this request as Paid? This will deduct leave balance and log it.')) return;
    try {
      const res = await apiClient.post(`/leaves/encashments/${id}/pay`);
      if (res.data?.success) {
        toast.success('Request marked as Paid successfully and balance deducted!');
        fetchRequestsList();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payment.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-gray-950/20 min-h-screen">
      <LeaveHeaderNav />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Encashment</h1>
            <p className="text-xs text-gray-500 mt-1">Request payout for accrued unused leaves or manage employee requests.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchReferenceData(); fetchRequestsList(); }} className="h-9 gap-1.5 text-xs font-semibold rounded-xl">
            <RefreshCw className="w-4 h-4" /> Sync Data
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Apply & Preview Form */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border shadow-sm rounded-2xl bg-white dark:bg-gray-900">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" /> Apply Encashment
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Submit a request for leave balance payout.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isAdmin && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Select Employee *</Label>
                      <select
                        value={form.employeeId}
                        onChange={e => setForm({ ...form, employeeId: e.target.value })}
                        className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        required
                      >
                        <option value="">Choose employee...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} ({emp.employee_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Leave Category *</Label>
                    <select
                      value={form.leaveTypeId}
                      onChange={e => setForm({ ...form, leaveTypeId: e.target.value })}
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      required
                    >
                      <option value="">Choose category...</option>
                      {leaveTypes
                        .filter(type => {
                          const leaveGender = (type.gender_applicable || type.genderApplicable || 'all').toLowerCase();
                          if (leaveGender === 'all') return true;
                          const empGender = (currentUserProfile?.gender || '').toLowerCase();
                          if (!empGender) return true;
                          return empGender === leaveGender;
                        })
                        .map(type => {
                          const balItem = myBalances.find(b => b.leave_type_id === type.id);
                          const balText = balItem ? ` (Balance: ${balItem.available_balance} days)` : '';
                        return (
                          <option key={type.id} value={type.id}>
                            {type.leave_name} ({type.leave_code}){balText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Encashment Policy Setting *</Label>
                    <select
                      value={form.leaveEncashmentSettingId}
                      onChange={e => setForm({ ...form, leaveEncashmentSettingId: e.target.value })}
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-gray-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      required
                    >
                      <option value="">Choose policy...</option>
                      {policies.map(policy => (
                        <option key={policy.id} value={policy.id}>
                          {policy.name} (Formula: {policy.formula}, Basis: {policy.days_basis || 30} days)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Encashment Days *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={form.encashmentDays}
                      onChange={e => setForm({ ...form, encashmentDays: e.target.value })}
                      placeholder="e.g. 5 or 10.5"
                      className="h-10 text-xs font-semibold rounded-xl bg-slate-50 border"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="isFullAndFinal"
                      checked={form.isFullAndFinal}
                      onChange={e => setForm({ ...form, isFullAndFinal: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 cursor-pointer"
                    />
                    <label htmlFor="isFullAndFinal" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                      Is Full & Final Settlement (Cap limit matches policy)
                    </label>
                  </div>

                  {/* PREVIEW CONTAINER */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-gray-850 dark:text-white mb-2.5 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Live Calculation Preview
                    </h4>

                    {previewLoading && (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Calculating...
                      </div>
                    )}

                    {!previewLoading && !preview && (
                      <div className="p-3 rounded-xl border border-dashed text-center text-[10px] text-muted-foreground bg-slate-50/50">
                        Fill all inputs above to view payout preview.
                      </div>
                    )}

                    {!previewLoading && preview && preview.error && (
                      <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-[10px] text-red-700 font-semibold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{preview.error}</span>
                      </div>
                    )}

                    {!previewLoading && preview && !preview.error && (
                      <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/10 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-medium text-slate-500">Employee Name:</span>
                          <span className="font-bold">{preview.employeeName}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-medium text-slate-500">Selected Policy:</span>
                          <span className="font-bold">{preview.policyName}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-medium text-slate-500">Available Balance:</span>
                          <span className="font-bold text-indigo-700">{preview.availableBalance} Days</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-medium text-slate-500">Capped Days:</span>
                          <span className="font-bold text-amber-700">{preview.cappedDays} Days</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-medium text-slate-500">Daily Salary Rate:</span>
                          <span className="font-bold">₹{preview.dailyRate} ({preview.daysBasis} Days basis)</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800 border-t border-emerald-100/60 pt-2 text-sm mt-1">
                          <span className="font-extrabold text-emerald-800">Total Payout:</span>
                          <span className="font-black text-emerald-700">₹{preview.totalAmount}</span>
                        </div>

                        {preview.cappedDays > preview.availableBalance && (
                          <div className="p-2 rounded bg-amber-50 text-[10px] text-amber-700 font-bold flex items-center gap-1.5 mt-2 border border-amber-100">
                            <AlertCircle className="w-3.5 h-3.5" /> Out of balance! Cannot submit request.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-10 rounded-xl mt-4"
                    disabled={submitting || !preview || preview.error || (preview && preview.cappedDays > preview.availableBalance)}
                  >
                    {submitting ? 'Submitting...' : 'Submit Encashment Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Requests History */}
          <div className="lg:col-span-7">
            <Card className="border shadow-sm rounded-2xl bg-white dark:bg-gray-900 min-h-[480px]">
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" /> Requests History
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {isAdmin ? 'Manage leave encashment requests for all employees.' : 'Review your leave encashment application history.'}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setEncashmentViewTab('pending')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                        encashmentViewTab === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Pending Approvals
                    </button>
                    <button
                      type="button"
                      onClick={() => setEncashmentViewTab('my')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                        encashmentViewTab === 'my'
                          ? 'bg-white dark:bg-slate-900 text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      My Submissions
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {requests.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground space-y-2">
                    <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs font-semibold">No leave encashments requested.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="text-[10px] bg-slate-50 border-b uppercase font-bold text-slate-500">
                        <tr>
                          {isAdmin && <th className="px-4 py-3">Employee</th>}
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Policy / Category</th>
                          <th className="px-4 py-3 text-center">Days</th>
                          <th className="px-4 py-3 text-right">Rate</th>
                          <th className="px-4 py-3 text-right">Total Amount</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          {isAdmin && <th className="px-4 py-3 text-center">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requests.map(req => {
                          const dateStr = req.encashment_date ? new Date(req.encashment_date).toLocaleDateString() : '';
                          const statusColors: Record<string, string> = {
                            pending: 'bg-amber-50 text-amber-700 border-amber-100',
                            approved: 'bg-blue-50 text-blue-700 border-blue-100',
                            paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                            rejected: 'bg-rose-50 text-rose-700 border-rose-100'
                          };

                          return (
                            <tr key={req.id} className="hover:bg-slate-50/50">
                              {isAdmin && (
                                <td className="px-4 py-3.5 font-semibold text-slate-800">
                                  {req.first_name} {req.last_name}
                                  <div className="text-[9px] text-slate-400 font-medium">{req.employee_code}</div>
                                </td>
                              )}
                              <td className="px-4 py-3.5 font-semibold text-slate-500">{dateStr}</td>
                              <td className="px-4 py-3.5 font-bold">
                                {req.policy_name || 'Standard'}
                                <div className="text-[9px] text-indigo-600 font-medium">{req.leave_name} ({req.leave_code})</div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800">{req.encashment_days || req.encashmentDays}</td>
                              <td className="px-4 py-3.5 text-right font-mono font-semibold">₹{req.daily_rate || req.dailyRate}</td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">₹{req.total_amount || req.totalAmount}</td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusColors[req.status] || 'bg-slate-50 text-slate-500'}`}>
                                  {req.status}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3.5 text-center">
                                  <div className="flex justify-center items-center gap-1.5">
                                    {req.status === 'pending' && (
                                      <>
                                        <Button
                                          onClick={() => handleApprove(req.id)}
                                          size="sm"
                                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] h-6 px-2 rounded"
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          onClick={() => handleReject(req.id)}
                                          size="sm"
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] h-6 px-2 rounded"
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    {req.status === 'approved' && (
                                      <Button
                                        onClick={() => handleMarkAsPaid(req.id)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] h-6 px-2 rounded"
                                      >
                                        Mark Paid
                                      </Button>
                                    )}
                                    {req.status === 'paid' && (
                                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                                      </span>
                                    )}
                                    {req.status === 'rejected' && (
                                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
