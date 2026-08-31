import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/authStore';
import {
  Calendar, Plus, RefreshCw, FileText, CheckCircle2, Clock, XCircle,
  AlertCircle, Ban, Palmtree, Trophy, Flame, Briefcase, Info, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { isLeaveTypeApplicableForGender } from '@/utils/genderFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeaveType {
  id: number;
  leave_name: string;
  leave_code: string;
  description?: string;
  default_allowance_days?: number;
  gender_applicable?: string;
  genderApplicable?: string;
  allocation_settings?: any;
  allocationSettings?: any;
  allocation?: any;
  only_when?: any;
  onlyWhen?: any;
  [key: string]: any;
}

interface LeaveBalanceItem {
  id: number;
  leave_type_id: number;
  leave_name: string;
  leave_code: string;
  allocated_balance: number;
  consumed_balance: number;
  pending_approval_balance: number;
  available_balance: number;
  gender_applicable?: string;
  genderApplicable?: string;
  allocation_settings?: any;
  allocationSettings?: any;
  allocation?: any;
  only_when?: any;
  onlyWhen?: any;
  [key: string]: any;
}

interface LeaveApplicationItem {
  id: number;
  leave_type_id: number;
  leave_name?: string;
  leave_code?: string;
  application_start_date: string;
  application_end_date: string;
  total_days: number;
  is_half_day: boolean;
  reason_description?: string;
  reason?: string;
  status: string;
  created_at?: string;
}

export function MyLeavesPage() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employeeGender, setEmployeeGender] = useState<string>('');
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [applications, setApplications] = useState<LeaveApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [optionalHolidays, setOptionalHolidays] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'optional-holidays'>('history');

  const employeeContext = useMemo(() => ({
    ...(user || {}),
    ...(employeeProfile || {}),
    gender: (employeeProfile?.gender || (user as any)?.gender || (user as any)?.personal_info?.gender || employeeGender || '').toString().trim().toLowerCase(),
    marital_status: ((employeeProfile as any)?.marital_status || (employeeProfile as any)?.maritalStatus || (user as any)?.marital_status || (user as any)?.maritalStatus || '').toString().trim().toLowerCase(),
    current_department_id: employeeProfile?.current_department_id || (user as any)?.department_id || (user as any)?.departmentId,
    current_location_id: employeeProfile?.current_location_id || (user as any)?.location_id || (user as any)?.locationId,
    current_grade_id: employeeProfile?.current_grade_id || (user as any)?.grade_id,
    current_designation_id: employeeProfile?.current_designation_id || (user as any)?.designation_id,
    employment_type: (employeeProfile?.employment_type || (user as any)?.employment_type || '').toString(),
    status: (employeeProfile?.status || (user as any)?.status || '').toString(),
    date_of_joining: employeeProfile?.date_of_joining || (user as any)?.date_of_joining,
    date_of_confirmation: employeeProfile?.date_of_confirmation || (user as any)?.date_of_confirmation,
  }), [user, employeeProfile, employeeGender]);

  // Apply Leave Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDayPeriod: 'first_half',
    reason: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, typesRes, appsRes, optRes] = await Promise.all([
        apiClient.get('/leaves/balances').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/types').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/applications', { params: { status: selectedStatus } }).catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/optional-holidays').catch(() => ({ data: { data: [] } })),
      ]);

      if (balRes.data?.data) {
        setBalances(balRes.data.data);
      }
      if (balRes.data?.employee) {
        setEmployeeProfile(balRes.data.employee);
        setEmployeeGender(balRes.data.employee.gender || '');
      }
      if (typesRes.data?.data) {
        setLeaveTypes(typesRes.data.data);
      }
      if (appsRes.data?.data) {
        setApplications(Array.isArray(appsRes.data.data) ? appsRes.data.data : []);
      }
      if (optRes.data?.data) {
        setOptionalHolidays(optRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch leave data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOptionalHoliday = async (holidayId: number) => {
    try {
      const res = await apiClient.post('/leaves/optional-holidays', { holidayId });
      if (res.data?.success) {
        toast.success('Optional holiday selected successfully!');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to select optional holiday');
    }
  };

  const handleCancelOptionalHoliday = async (selectionId: number) => {
    try {
      const res = await apiClient.delete(`/leaves/optional-holidays/${selectionId}`);
      if (res.data?.success) {
        toast.success('Optional holiday selection cancelled successfully');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to cancel optional holiday selection');
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  // Calculated Days for form
  const computedDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    if (form.isHalfDay) return 0.5;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Please fill in Leave Type, Start Date, and End Date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/leaves/applications', {
        leaveTypeId: parseInt(form.leaveTypeId, 10),
        startDate: form.startDate,
        endDate: form.endDate,
        isHalfDay: form.isHalfDay,
        halfDayPeriod: form.halfDayPeriod,
        reason: form.reason,
      });

      if (res.data?.success) {
        toast.success('Leave application submitted successfully!');
        setIsApplyModalOpen(false);
        setForm({
          leaveTypeId: '',
          startDate: '',
          endDate: '',
          isHalfDay: false,
          halfDayPeriod: 'first_half',
          reason: '',
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: number) => {
    try {
      const res = await apiClient.post(`/leaves/applications/${id}/cancel`);
      if (res.data?.success) {
        toast.success('Leave request cancelled successfully');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'submitted':
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border flex items-center gap-1">
            <Ban className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  const getCardTheme = (code: string) => {
    switch (code) {
      case 'CL':
        return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', hover: 'hover:border-amber-500/80' };
      case 'SL':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/80' };
      case 'EL':
        return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', hover: 'hover:border-blue-500/80' };
      default:
        return { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', hover: 'hover:border-violet-500/80' };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <Palmtree className="w-6 h-6 text-amber-500" /> My Leave Management & Quotas
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check real-time leave balances, submit PTO applications, and track manager approval status.
            </p>
          </div>

          <Button
            onClick={() => setIsApplyModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-10 px-5 rounded-2xl gap-2 shadow-md shadow-violet-600/20"
          >
            <Plus className="w-4 h-4" /> Apply for Leave
          </Button>
        </div>

        {/* Leave Balances Header Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.length === 0 ? (
            [
              { name: 'Casual Leave', code: 'CL', avail: 10, total: 12, consumed: 2 },
              { name: 'Sick Leave', code: 'SL', avail: 9, total: 10, consumed: 1 },
              { name: 'Earned Leave', code: 'EL', avail: 12, total: 15, consumed: 3 },
              { name: 'Privilege Leave', code: 'PL', avail: 8, total: 8, consumed: 0 },
            ].map((bal, idx) => {
              const theme = getCardTheme(bal.code);
              return (
                <Card key={idx} className={`border rounded-2xl p-4.5 bg-card/80 backdrop-blur-sm shadow-sm transition-all ${theme.hover}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">{bal.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${theme.bg} ${theme.text} ${theme.border}`}>
                      {bal.code}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-foreground">{bal.avail} <span className="text-xs text-muted-foreground font-semibold">days left</span></h3>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Consumed: {bal.consumed}d</span>
                      <span>Total: {bal.total}d</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${theme.text.replace('text-', 'bg-')}`} style={{ width: `${(bal.consumed / bal.total) * 100}%` }} />
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            balances
              .filter((bal: any) => {
                const matchingType = leaveTypes.find(t => String(t.id) === String(bal.leave_type_id || bal.leaveTypeId || bal.id));
                const mergedItem = matchingType ? { ...matchingType, ...bal } : bal;
                return isLeaveTypeApplicableForGender(mergedItem, employeeContext);
              })
              .map((bal: any) => {
                const theme = getCardTheme(bal.leave_code);
                const avail = parseFloat(bal.available_balance as any) || 0;
              const total = parseFloat(bal.allocated_balance as any) || 12;
              const consumed = parseFloat(bal.consumed_balance as any) || 0;

              let showExpired = false;
              if (bal.allocation_settings) {
                try {
                  const alloc = typeof bal.allocation_settings === 'string'
                    ? JSON.parse(bal.allocation_settings)
                    : bal.allocation_settings;
                  showExpired = !!alloc.expireLeaveOnDashboard;
                } catch (e) {}
              }
              const expired = parseFloat(bal.expired_balance as any) || 0;

              return (
                <Card key={bal.id} className={`border rounded-2xl p-4.5 bg-card/80 backdrop-blur-sm shadow-sm transition-all ${theme.hover}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">{bal.leave_name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold border ${theme.bg} ${theme.text} ${theme.border}`}>
                       {bal.leave_code}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <h3 className="text-2xl font-black text-foreground">{avail} <span className="text-xs text-muted-foreground font-semibold">days left</span></h3>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Consumed: {consumed}d</span>
                      {showExpired && (
                        <span className={expired > 0 ? "text-red-500 font-bold" : "text-muted-foreground"}>Expired: {expired}d</span>
                      )}
                      <span>Allocated: {total}d</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${theme.text.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, (consumed / total) * 100)}%` }} />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-4 pb-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Leaves History
          </button>
          <button
            onClick={() => setActiveTab('optional-holidays')}
            className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 ${
              activeTab === 'optional-holidays'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Optional Holidays Pool
          </button>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* Filter Tabs & History Header */}
            <div className="flex justify-between items-center gap-4 flex-wrap bg-card p-4 rounded-2xl border border-border shadow-sm">
              <div className="flex gap-2 overflow-x-auto">
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all whitespace-nowrap ${
                      selectedStatus === status
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh History
              </Button>
            </div>

            {/* Leave Applications History */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                <p className="text-xs font-medium">Loading leave requests history...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-3xl border border-border shadow-sm space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">No Leave Requests Found</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">You haven't submitted any leave requests under this status.</p>
                </div>
                <Button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Apply for Leave
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-card rounded-2xl border border-border shadow-sm hover:border-violet-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-xs font-extrabold text-foreground">
                          {app.leave_name || `Leave #${app.leave_type_id}`} ({app.leave_code || 'PTO'})
                        </h3>
                        {renderStatusBadge(app.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-violet-500" />
                          <span>{app.application_start_date} to {app.application_end_date}</span>
                        </div>

                        <div className="flex items-center space-x-1 text-foreground font-semibold">
                          <span>Duration:</span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono text-[11px]">
                            {app.total_days} {app.total_days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </div>

                      {(app.reason || app.reason_description) && (
                        <p className="text-xs text-muted-foreground pt-0.5 italic">
                          "{app.reason || app.reason_description}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {['submitted', 'pending', 'draft'].includes(app.status?.toLowerCase()) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(app.id)}
                          className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/20 text-xs font-bold h-8 rounded-xl"
                        >
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-card p-5 border border-border rounded-3xl flex items-start gap-3">
              <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-extrabold text-foreground">Floating Holidays Guide</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your optional holidays from the calendar pool below. Your assigned policy allows you to select regional/festival holidays up to your designated annual quota limit.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-600" />
                <p className="text-xs font-medium">Loading optional holidays...</p>
              </div>
            ) : optionalHolidays.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-3xl border border-border shadow-sm space-y-2">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No Optional Holidays</h3>
                <p className="text-xs text-muted-foreground">No regional optional holidays are currently configured for your location calendar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optionalHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className={`p-5 bg-card rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      holiday.selected ? 'border-violet-600 bg-violet-600/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-foreground">{holiday.holiday_name}</h4>
                      <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-500" />
                        {new Date(holiday.holiday_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {holiday.description && <p className="text-[10px] text-muted-foreground italic mt-0.5">{holiday.description}</p>}
                    </div>

                    <div>
                      {holiday.selected ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Selected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOptionalHoliday(holiday.selection_id)}
                            className="text-[10px] h-7 text-rose-600 hover:bg-rose-500/10 font-bold rounded-lg px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSelectOptionalHoliday(holiday.id)}
                          className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] h-8 rounded-xl px-3"
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply for Leave Popup Dialog */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 bg-card border border-border shadow-2xl">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold">Apply for Leave</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submit a formal PTO or medical leave application to your reporting manager
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Leave Type</label>
              <select
                value={form.leaveTypeId}
                onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground font-semibold"
                required
              >
                <option value="">Select Leave Category...</option>
                {leaveTypes
                  .filter((t) => isLeaveTypeApplicableForGender(t, employeeContext))
                  .map((t) => {
                    const balanceItem = balances.find((b: any) => (b.leave_type_id || b.leaveTypeId) === t.id);
                    const avail = balanceItem ? (balanceItem.available_balance ?? (balanceItem as any).availableBalance ?? 0) : 0;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.leave_name} ({t.leave_code}) - Allowance: {avail} days
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground"
                  required
                />
              </div>
            </div>

            {/* Computed Duration Badge */}
            {computedDays() > 0 && (
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Estimated Duration:</span>
                <span className="font-extrabold text-violet-600 dark:text-violet-400 font-mono">
                  {computedDays()} {computedDays() === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isHalfDay"
                checked={form.isHalfDay}
                onChange={(e) => setForm((p) => ({ ...p, isHalfDay: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="isHalfDay" className="text-xs font-semibold text-foreground cursor-pointer">
                Apply for Half-Day
              </label>
            </div>

            {form.isHalfDay && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Half-Day Session</label>
                <select
                  value={form.halfDayPeriod}
                  onChange={(e) => setForm((p) => ({ ...p, halfDayPeriod: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground font-semibold"
                >
                  <option value="first_half">First Half (Morning Session)</option>
                  <option value="second_half">Second Half (Afternoon Session)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Reason for Leave</label>
              <textarea
                rows={3}
                placeholder="State your reason for leave..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full p-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground resize-none"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl gap-2 shadow-md"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Submit Leave Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
