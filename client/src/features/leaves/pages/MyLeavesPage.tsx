import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  Calendar, Plus, RefreshCw, FileText, CheckCircle2, Clock, XCircle,
  AlertCircle, Ban, Palmtree, Trophy, Flame, Briefcase, Info, Loader2,
  Sparkles, HeartPulse, ShieldCheck, CalendarDays, UserCheck, ArrowUpRight, Filter
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
  leave_name?: string;
  leaveName?: string;
  name?: string;
  title?: string;
  leave_code?: string;
  leaveCode?: string;
  code?: string;
  description?: string;
  default_allowance_days?: number;
  defaultAllowanceDays?: number;
  annual_quota?: number;
  annualQuota?: number;
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
  leave_type_id?: number;
  leaveTypeId?: number;
  leave_name?: string;
  leaveName?: string;
  name?: string;
  leave_code?: string;
  leaveCode?: string;
  code?: string;
  allocated_balance?: number;
  allocatedBalance?: number;
  consumed_balance?: number;
  consumedBalance?: number;
  pending_approval_balance?: number;
  pendingApprovalBalance?: number;
  available_balance?: number;
  availableBalance?: number;
  expired_balance?: number;
  expiredBalance?: number;
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
  leave_type_id?: number;
  leaveTypeId?: number;
  leave_name?: string;
  leaveName?: string;
  name?: string;
  leave_code?: string;
  leaveCode?: string;
  code?: string;
  application_start_date?: string;
  applicationStartDate?: string;
  application_end_date?: string;
  applicationEndDate?: string;
  total_days?: number;
  totalDays?: number;
  is_half_day?: boolean;
  isHalfDay?: boolean;
  reason_description?: string;
  reasonDescription?: string;
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

  const effectiveLeaveTypes: LeaveType[] = useMemo(() => {
    if (leaveTypes && leaveTypes.length > 0) return leaveTypes;
    if (!balances || balances.length === 0) return [];
    return balances.map((b: any) => ({
      id: b.leave_type_id || b.leaveTypeId || b.id,
      leave_name: b.leave_name || b.leaveName || b.name,
      leaveName: b.leave_name || b.leaveName || b.name,
      name: b.leave_name || b.leaveName || b.name,
      title: b.leave_name || b.leaveName || b.name,
      leave_code: b.leave_code || b.leaveCode || b.code,
      leaveCode: b.leave_code || b.leaveCode || b.code,
      code: b.leave_code || b.leaveCode || b.code,
      gender_applicable: b.gender_applicable || b.genderApplicable || 'all',
      genderApplicable: b.gender_applicable || b.genderApplicable || 'all',
      allocation_settings: b.allocation_settings || b.allocationSettings,
      annual_quota: b.allocated_balance ?? b.allocatedBalance ?? 0,
      annualQuota: b.allocated_balance ?? b.allocatedBalance ?? 0,
      default_allowance_days: b.allocated_balance ?? b.allocatedBalance ?? 0,
      defaultAllowanceDays: b.allocated_balance ?? b.allocatedBalance ?? 0,
    }));
  }, [leaveTypes, balances]);

  const totalAvailableDays = useMemo(() => {
    if (!balances || balances.length === 0) return 39;
    return balances.reduce((sum, b: any) => sum + (parseFloat(b.available_balance ?? b.availableBalance ?? 0) || 0), 0);
  }, [balances]);

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
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'submitted':
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-muted text-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  const getCardTheme = (code: string) => {
    switch (code?.toUpperCase()) {
      case 'CL':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/20 dark:border-amber-500/30',
          gradient: 'from-amber-500 to-orange-500',
          accentBg: 'bg-amber-500',
          hover: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
          icon: Palmtree,
        };
      case 'SL':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-500/20 dark:border-emerald-500/30',
          gradient: 'from-emerald-500 to-teal-500',
          accentBg: 'bg-emerald-500',
          hover: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
          icon: HeartPulse,
        };
      case 'EL':
        return {
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
          text: 'text-cyan-600 dark:text-cyan-400',
          border: 'border-cyan-500/20 dark:border-cyan-500/30',
          gradient: 'from-cyan-500 to-blue-500',
          accentBg: 'bg-cyan-500',
          hover: 'hover:border-cyan-500/60 hover:shadow-cyan-500/10',
          icon: Trophy,
        };
      case 'PL':
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          text: 'text-indigo-600 dark:text-indigo-400',
          border: 'border-indigo-500/20 dark:border-indigo-500/30',
          gradient: 'from-indigo-500 to-purple-500',
          accentBg: 'bg-indigo-500',
          hover: 'hover:border-indigo-500/60 hover:shadow-indigo-500/10',
          icon: Sparkles,
        };
      default:
        return {
          bg: 'bg-violet-500/10 dark:bg-violet-500/15',
          text: 'text-violet-600 dark:text-violet-400',
          border: 'border-violet-500/20 dark:border-violet-500/30',
          gradient: 'from-violet-500 to-purple-600',
          accentBg: 'bg-violet-500',
          hover: 'hover:border-violet-500/60 hover:shadow-violet-500/10',
          icon: Briefcase,
        };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        {/* Header Hero Banner with Glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-violet-950/20 border border-violet-500/20 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
          {/* Ambient Glow Graphic */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-violet-600/10 dark:bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
                  <Palmtree className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    My Leave Management & Quotas
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check real-time leave balances, submit PTO applications, and track manager approval status.
                  </p>
                </div>
              </div>

              {/* Quick Header Metric Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="px-3 py-1 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-xs font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>Total Available: <strong className="font-mono text-sm">{totalAvailableDays}</strong> Days</span>
                </div>
                <div className="px-3 py-1 rounded-xl bg-muted/60 text-muted-foreground border border-border text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Active Quotas Policy: FY 2026-27</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsApplyModalOpen(true)}
              className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs h-11 px-6 rounded-2xl gap-2 shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shrink-0"
            >
              <Plus className="w-4 h-4" /> Apply for Leave
            </Button>
          </div>
        </div>

        {/* Leave Balances Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.length === 0 ? (
            [
              { name: 'Casual Leave', code: 'CL', avail: 10, total: 12, consumed: 2 },
              { name: 'Sick Leave', code: 'SL', avail: 9, total: 10, consumed: 1 },
              { name: 'Earned Leave', code: 'EL', avail: 12, total: 15, consumed: 3 },
              { name: 'Privilege Leave', code: 'PL', avail: 8, total: 8, consumed: 0 },
            ].map((bal, idx) => {
              const theme = getCardTheme(bal.code);
              const IconComp = theme.icon;
              return (
                <Card key={idx} className={`border rounded-3xl p-5 bg-card/80 backdrop-blur-md shadow-sm transition-all duration-300 ${theme.hover} hover:-translate-y-1`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${theme.bg} ${theme.text}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-muted-foreground font-extrabold uppercase tracking-wider">{bal.name}</span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${theme.bg} ${theme.text} ${theme.border}`}>
                      {bal.code}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <h3 className="text-3xl font-black text-foreground tracking-tight">
                      {bal.avail} <span className="text-xs text-muted-foreground font-semibold tracking-normal">days left</span>
                    </h3>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Consumed: <strong className="text-foreground">{bal.consumed}d</strong></span>
                      <span>Total: <strong className="text-foreground">{bal.total}d</strong></span>
                    </div>
                    <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden p-0.5 border border-border/40">
                      <div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} style={{ width: `${(bal.consumed / bal.total) * 100}%` }} />
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
                const name = bal.leave_name || bal.leaveName || bal.name || 'Leave Category';
                const code = bal.leave_code || bal.leaveCode || bal.code || 'PTO';
                const theme = getCardTheme(code);
                const IconComp = theme.icon;
                const avail = parseFloat((bal.available_balance ?? bal.availableBalance ?? 0) as any);
                const total = parseFloat((bal.allocated_balance ?? bal.allocatedBalance ?? 12) as any);
                const consumed = parseFloat((bal.consumed_balance ?? bal.consumedBalance ?? 0) as any);

                let showExpired = false;
                const allocSettings = bal.allocation_settings || bal.allocationSettings;
                if (allocSettings) {
                  try {
                    const alloc = typeof allocSettings === 'string'
                      ? JSON.parse(allocSettings)
                      : allocSettings;
                    showExpired = !!alloc.expireLeaveOnDashboard;
                  } catch (e) { }
                }
                const expired = parseFloat((bal.expired_balance ?? bal.expiredBalance ?? 0) as any);

                return (
                  <Card key={bal.id || bal.leave_type_id || bal.leaveTypeId} className={`border rounded-3xl p-5 bg-card/80 backdrop-blur-md shadow-sm transition-all duration-300 ${theme.hover} hover:-translate-y-1`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${theme.bg} ${theme.text}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-muted-foreground font-extrabold uppercase tracking-wider">{name}</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${theme.bg} ${theme.text} ${theme.border}`}>
                        {code}
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <h3 className="text-3xl font-black text-foreground tracking-tight">
                        {avail} <span className="text-xs text-muted-foreground font-semibold tracking-normal">days left</span>
                      </h3>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                        <span>Consumed: <strong className="text-foreground">{consumed}d</strong></span>
                        {showExpired && (
                          <span className={expired > 0 ? "text-rose-500 font-bold" : "text-muted-foreground"}>Expired: {expired}d</span>
                        )}
                        <span>Allocated: <strong className="text-foreground">{total}d</strong></span>
                      </div>
                      <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden p-0.5 border border-border/40">
                        <div className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`} style={{ width: `${Math.min(100, total > 0 ? (consumed / total) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-muted/40 p-1.5 rounded-2xl border border-border/50 inline-flex gap-1.5">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center gap-2 ${activeTab === 'history'
                ? 'bg-card text-violet-600 shadow-md border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <CalendarDays className="w-4 h-4" /> My Leaves History
          </button>
        </div>

        {activeTab === 'history' ? (
          <>
            {/* Filter Tabs & History Header */}
            <div className="flex justify-between items-center gap-4 flex-wrap bg-card/80 p-4 rounded-2xl border border-border shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-violet-500" /> Status:
                </span>
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all duration-200 whitespace-nowrap ${selectedStatus === status
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 scale-[1.02]'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold rounded-xl">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh History
              </Button>
            </div>

            {/* Leave Applications History */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground bg-card rounded-3xl border border-border">
                <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
                <p className="text-xs font-semibold">Loading your leave requests history...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-14 text-center bg-card rounded-3xl border border-border shadow-sm space-y-4">
                <div className="h-14 w-14 rounded-3xl bg-violet-500/10 text-violet-600 mx-auto flex items-center justify-center">
                  <FileText className="w-7 h-7 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">No Leave Requests Found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">You haven't submitted any leave applications under this status filter.</p>
                </div>
                <Button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-10 px-5 rounded-2xl gap-2 shadow-md shadow-violet-600/20"
                >
                  <Plus className="w-4 h-4" /> Apply for Leave
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {applications.map((app) => {
                  const appName = app.leave_name || app.leaveName || app.name || `Leave #${app.leave_type_id || app.leaveTypeId || app.id}`;
                  const appCode = app.leave_code || app.leaveCode || app.code || 'PTO';
                  const startDate = app.application_start_date || app.applicationStartDate || '';
                  const endDate = app.application_end_date || app.applicationEndDate || '';
                  const totalDays = app.total_days ?? app.totalDays ?? 1;
                  const reason = app.reason || app.reason_description || app.reasonDescription;

                  return (
                    <div
                      key={app.id}
                      className="p-5 bg-card rounded-3xl border border-border shadow-sm hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative overflow-hidden"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-sm font-black text-foreground tracking-tight">
                            {appName} <span className="text-xs text-muted-foreground font-mono font-bold">({appCode})</span>
                          </h3>
                          {renderStatusBadge(app.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1.5 font-medium">
                            <Calendar className="w-4 h-4 text-violet-500" />
                            <span>{startDate} to {endDate}</span>
                          </div>

                          <div className="flex items-center space-x-1.5 text-foreground font-semibold">
                            <span>Duration:</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono font-extrabold text-[11px] border border-violet-500/20">
                              {totalDays} {totalDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        {reason && (
                          <div className="bg-muted/40 p-3 rounded-2xl border border-border/40 text-xs text-muted-foreground italic mt-1 max-w-2xl">
                            "{reason}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {['submitted', 'pending', 'draft'].includes(app.status?.toLowerCase()) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(app.id)}
                            className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/20 text-xs font-extrabold h-9 rounded-2xl"
                          >
                            Cancel Request
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Apply for Leave Popup Dialog */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-6 bg-card border border-border shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground tracking-tight">Apply for Leave</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submit a formal PTO or medical leave application to your reporting manager
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleApplySubmit} className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-extrabold text-foreground block mb-1.5">Leave Type Category *</label>
              <select
                value={form.leaveTypeId}
                onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))}
                className="w-full h-11 px-3.5 text-xs bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-foreground font-semibold"
                required
              >
                <option value="">Select Leave Category...</option>
                {effectiveLeaveTypes
                  .filter((t) => isLeaveTypeApplicableForGender(t, employeeContext))
                  .map((t) => {
                    const balanceItem = balances.find((b: any) => String(b.leave_type_id || b.leaveTypeId || b.id) === String(t.id));
                    const avail = balanceItem
                      ? (balanceItem.available_balance ?? (balanceItem as any).availableBalance ?? 0)
                      : (t.annual_quota ?? t.annualQuota ?? t.default_allowance_days ?? t.defaultAllowanceDays ?? 0);
                    const name = t.leave_name || t.leaveName || t.name || t.title || (balanceItem ? (balanceItem.leave_name || balanceItem.leaveName || balanceItem.name) : '') || 'Leave Category';
                    const code = t.leave_code || t.leaveCode || t.code || (balanceItem ? (balanceItem.leave_code || balanceItem.leaveCode || balanceItem.code) : '') || '';
                    return (
                      <option key={t.id} value={t.id}>
                        {name} {code ? `(${code})` : ''} - Balance: {avail} days
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-11 px-3.5 text-xs bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-foreground font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1.5">End Date *</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-11 px-3.5 text-xs bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-foreground font-semibold"
                  required
                />
              </div>
            </div>

            {/* Computed Duration Preview Pill */}
            {computedDays() > 0 && (
              <div className="p-3.5 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-violet-500" /> Estimated Leave Duration:
                </span>
                <span className="font-black text-violet-600 dark:text-violet-400 font-mono text-sm">
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
                className="h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <label htmlFor="isHalfDay" className="text-xs font-extrabold text-foreground cursor-pointer">
                Apply for Half-Day
              </label>
            </div>

            {form.isHalfDay && (
              <div>
                <label className="text-xs font-extrabold text-foreground block mb-1.5">Half-Day Session</label>
                <select
                  value={form.halfDayPeriod}
                  onChange={(e) => setForm((p) => ({ ...p, halfDayPeriod: e.target.value }))}
                  className="w-full h-10 px-3.5 text-xs bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-foreground font-semibold"
                >
                  <option value="first_half">First Half (Morning Session)</option>
                  <option value="second_half">Second Half (Afternoon Session)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-extrabold text-foreground block mb-1.5">Reason for Leave *</label>
              <textarea
                rows={3}
                placeholder="State your reason for leave..."
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full p-3.5 text-xs bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-foreground resize-none font-medium"
                required
              />
            </div>

            <div className="pt-3 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyModalOpen(false)}
                disabled={submitting}
                className="rounded-2xl text-xs font-extrabold h-11 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs h-11 px-6 rounded-2xl gap-2 shadow-md shadow-violet-600/20"
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

