import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Calendar, Palmtree, PlusCircle, CheckCircle2, Clock, XCircle, Ban, RefreshCw,
  Loader2, FileText, Sparkles, ShieldCheck, ArrowRight, Upload, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface LeaveType {
  id: number;
  leave_name?: string;
  leaveName?: string;
  leave_code?: string;
  leaveCode?: string;
  description?: string;
  default_allowance_days?: number;
  defaultAllowanceDays?: number;
}

interface LeaveBalanceItem {
  id: number;
  leave_type_id?: number;
  leaveTypeId?: number;
  leave_name?: string;
  leaveName?: string;
  leave_code?: string;
  leaveCode?: string;
  allocated_balance?: number | string;
  allocatedBalance?: number | string;
  consumed_balance?: number | string;
  consumedBalance?: number | string;
  pending_approval_balance?: number | string;
  pendingApprovalBalance?: number | string;
  available_balance?: number | string;
  availableBalance?: number | string;
}

interface LeaveApplicationItem {
  id: number;
  leave_type_id?: number;
  leaveTypeId?: number;
  leave_name?: string;
  leaveName?: string;
  leave_code?: string;
  leaveCode?: string;
  application_start_date?: string;
  applicationStartDate?: string;
  application_end_date?: string;
  applicationEndDate?: string;
  from_date?: string;
  to_date?: string;
  total_days?: number;
  totalDays?: number;
  duration_days?: number;
  is_half_day?: boolean;
  reason_description?: string;
  reason?: string;
  status: string;
  created_at?: string;
  approverName?: string;
}

export default function LeavePage() {
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || user?.id || 0;
  const { employee } = useEmployee(employeeId);

  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [applications, setApplications] = useState<LeaveApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success Confirmation Popup Modal state
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Form input states
  const [leaveTypeId, setLeaveTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [backupPerson, setBackupPerson] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string>('');

  // Day-wise breakdown state
  const [dayBreakdown, setDayBreakdown] = useState<any[]>([]);
  const [hasManuallyOverridden, setHasManuallyOverridden] = useState<boolean>(false);

  // OCR state
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);

  // Policy flag
  const allowQuarterDayLeave = true;
  const [sickLeaveDocThreshold, setSickLeaveDocThreshold] = useState<number>(3);

  // Mock team members with dynamic loading fallback
  const [teamMembers, setTeamMembers] = useState<any[]>([
    { id: 1, name: 'Amit Sharma', role: 'HR Manager' },
    { id: 2, name: 'Jane Doe', role: 'Tech Lead' },
    { id: 3, name: 'John Smith', role: 'Senior Developer' },
    { id: 4, name: 'Alice Johnson', role: 'Product Manager' },
    { id: 5, name: 'Rahul Verma', role: 'QA Engineer' }
  ]);

  const fetchTeamMembers = async () => {
    try {
      const res = await apiClient.get('/employees').catch(() => null);
      if (res && res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
        if (list.length > 0) {
          setTeamMembers(list.map((e: any) => ({
            id: e.id,
            name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email,
            role: e.designation || 'Team Member'
          })));
        }
      }
    } catch (e) {
      console.warn('Failed to load employee list, using fallback:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, typesRes, appsRes, settingsRes] = await Promise.all([
        apiClient.get('/leaves/balances').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/types').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/applications').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/org-settings').catch(() => ({ data: { data: {} } })),
      ]);

      if (balRes.data?.data) {
        const rawBals = Array.isArray(balRes.data.data) ? balRes.data.data : [];
        setBalances(rawBals);
      }
      if (typesRes.data?.data) {
        setLeaveTypes(Array.isArray(typesRes.data.data) ? typesRes.data.data : []);
      }
      if (appsRes.data?.data) {
        setApplications(Array.isArray(appsRes.data.data) ? appsRes.data.data : []);
      }
      if (settingsRes.data?.data) {
        setSickLeaveDocThreshold(settingsRes.data.data.sick_leave_doc_threshold ?? 3);
      }
    } catch (err) {
      console.error('Failed to fetch leave data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTeamMembers();
  }, []);

  // Helper to extract numeric balance values safely (handles both snake_case and camelCase)
  const getBalNum = (bal: LeaveBalanceItem, keySnake: string, keyCamel: string, defaultVal: number = 0): number => {
    const val = (bal as any)[keySnake] ?? (bal as any)[keyCamel];
    if (val === undefined || val === null) return defaultVal;
    const num = parseFloat(val);
    return isNaN(num) ? defaultVal : num;
  };

  // Helper to extract text string safely
  const getBalStr = (bal: any, keySnake: string, keyCamel: string, fallback: string): string => {
    return (bal as any)[keySnake] || (bal as any)[keyCamel] || fallback;
  };

  // 2026 Holidays list
  const HOLIDAYS_2026 = [
    '2026-01-01', // New Year's Day
    '2026-01-26', // Republic Day
    '2026-03-02', // Holi
    '2026-04-03', // Good Friday
    '2026-05-01', // May Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-11-09', // Diwali
    '2026-12-25', // Christmas
  ];

  const isWeekendOrHoliday = (date: Date): { isWorking: boolean; reason: string } => {
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return { isWorking: false, reason: day === 0 ? 'Sunday (Weekend)' : 'Saturday (Weekend)' };
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    if (HOLIDAYS_2026.includes(dateStr)) {
      return { isWorking: false, reason: 'Public Holiday' };
    }
    return { isWorking: true, reason: '' };
  };

  // Auto-generate day-wise breakdown list when date range changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setDayBreakdown([]);
      setHasManuallyOverridden(false);
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setDayBreakdown([]);
      setHasManuallyOverridden(false);
      return;
    }

    const breakdown: any[] = [];
    const current = new Date(start);
    while (current <= end) {
      const check = isWeekendOrHoliday(current);
      const dateStr = current.toISOString().split('T')[0];
      breakdown.push({
        date: dateStr,
        isWorkingDay: check.isWorking,
        reason: check.reason,
        dayType: 'FULL',
        quarterType: 'Q1',
        val: check.isWorking ? 1.0 : 0.0,
      });
      current.setDate(current.getDate() + 1);
    }
    setDayBreakdown(breakdown);
    setHasManuallyOverridden(false);
  }, [startDate, endDate]);

  const computedTotalRequestedDays = () => {
    const totalCents = dayBreakdown.reduce((acc, day) => {
      if (!day.isWorkingDay) return acc;
      let dayVal = 100;
      if (day.dayType === 'FIRST_HALF' || day.dayType === 'SECOND_HALF') {
        dayVal = 50;
      } else if (day.dayType === 'QUARTER') {
        dayVal = 25;
      }
      return acc + dayVal;
    }, 0);
    return totalCents / 100;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      toast.error('Only PDF, JPG, JPEG, and PNG files are accepted.');
      return;
    }

    setAttachedFile(file);
    setAttachedFileName(file.name);
    toast.success(`Attached certificate: ${file.name}`);

    // Invoke AI OCR API
    const reader = new FileReader();
    reader.onload = async () => {
      setAnalyzingFile(true);
      setOcrData(null);
      try {
        const rawBase64 = reader.result as string;
        const base64Data = rawBase64.split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const res = await apiClient.post('/leaves/ai/analyze-certificate', {
          base64Data,
          mimeType
        });

        if (res.data?.success && res.data.data) {
          const analysis = res.data.data;
          setOcrData(analysis);
          if (analysis.isValid) {
            toast.success(`AI Verified Certificate for: ${analysis.patientName}`);
          } else {
            toast.warning('AI Warning: Could not verify dates or patient details on certificate proof.');
          }
        }
      } catch (err) {
        console.error('AI Document Analysis failed', err);
      } finally {
        setAnalyzingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Core Validations
    if (!leaveTypeId) {
      toast.error('Please select a leave category.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select both start date and end date.');
      return;
    }
    if (!reason) {
      toast.error('Please enter a reason for the leave.');
      return;
    }

    if (reason.length < 10) {
      toast.error('Reason must be at least 10 characters long.');
      return;
    }
    if (reason.length > 300) {
      toast.error('Reason cannot exceed 300 characters.');
      return;
    }

    const totalDays = computedTotalRequestedDays();
    if (totalDays <= 0) {
      toast.error('The selected date range contains no working days.');
      return;
    }

    if (totalDays > 5 && !emergencyContact) {
      toast.error('Emergency contact is required for leave requests longer than 5 days.');
      return;
    }

    const selectedTypeObj = allLeaveTypes.find(t => String(t.id) === String(leaveTypeId));
    const leaveCode = selectedTypeObj ? (selectedTypeObj.leave_code || selectedTypeObj.leaveCode || '').toUpperCase() : '';
    const leaveName = selectedTypeObj ? (selectedTypeObj.leave_name || selectedTypeObj.leaveName || 'Leave Category') : 'Leave Category';

    // Balance validation (except LOP)
    const selectedDisplayBalance = displayBalances.find(b => String(b.leave_type_id || b.leaveTypeId || b.id) === String(leaveTypeId));
    const availableBalance = selectedDisplayBalance ? (typeof selectedDisplayBalance.available_balance === 'number' ? selectedDisplayBalance.available_balance : parseFloat(selectedDisplayBalance.available_balance as string) || 0) : 0;
    const balanceAfter = availableBalance - totalDays;

    if (balanceAfter < 0 && leaveCode !== 'LOP') {
      if (leaveCode !== 'SL') {
        const proceed = window.confirm(
          `Your current balance for this leave is ${availableBalance.toFixed(2)} days, and you are requesting ${totalDays.toFixed(2)} days. Your balance will become ${balanceAfter.toFixed(2)} days. Do you want to proceed?`
        );
        if (!proceed) return;
      }
    }

    if (leaveCode === 'SL') {
      if (totalDays >= sickLeaveDocThreshold && !attachedFile) {
        toast.error(`A medical certificate is required for Sick Leave of ${sickLeaveDocThreshold} or more days.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const dayWiseBreakdownPayload = dayBreakdown
        .filter(d => d.isWorkingDay)
        .map(d => ({
          date: d.date,
          dayType: d.dayType === 'QUARTER' ? `${d.quarterType}_QUARTER` : d.dayType
        }));

      const res = await apiClient.post('/leaves/applications', {
        leaveTypeId: parseInt(leaveTypeId, 10),
        startDate,
        endDate,
        isHalfDay: dayBreakdown.some(d => d.isWorkingDay && d.dayType !== 'FULL'),
        customDuration: totalDays,
        reason,
        backupPerson,
        emergencyContact: totalDays > 5 ? emergencyContact : undefined,
        attachedFileName: attachedFile ? attachedFileName : undefined,
        dayWiseBreakdown: dayWiseBreakdownPayload
      });

      if (res.data?.success || res.status === 201) {
        const appId = res.data?.data?.id || Math.floor(1000 + Math.random() * 9000);

        setSuccessData({
          refNo: `#LV-2026-${String(appId).padStart(4, '0')}`,
          leaveName,
          startDate,
          endDate,
          totalDays,
          reason,
          status: 'Pending Review',
          submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        });

        toast.success('Leave application submitted successfully!');
        setIsModalOpen(false);
        setIsSuccessModalOpen(true);

        // Reset states
        setLeaveTypeId('');
        setStartDate('');
        setEndDate('');
        setReason('');
        setBackupPerson('');
        setEmergencyContact('');
        setAttachedFile(null);
        setAttachedFileName('');
        setDayBreakdown([]);
        setHasManuallyOverridden(false);

        fetchData();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to submit leave request';
      toast.error(errorMsg);
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
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to cancel leave request';
      toast.error(errorMsg);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'submitted':
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Pending Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-muted text-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  const getCardTheme = (code: string) => {
    switch (code?.toUpperCase()) {
      case 'CL':
        return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', hover: 'hover:border-amber-500/80', bar: 'bg-amber-500' };
      case 'SL':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/80', bar: 'bg-emerald-500' };
      case 'EL':
        return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', hover: 'hover:border-blue-500/80', bar: 'bg-blue-500' };
      case 'PL':
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', hover: 'hover:border-indigo-500/80', bar: 'bg-indigo-500' };
      default:
        return { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', hover: 'hover:border-violet-500/80', bar: 'bg-violet-500' };
    }
  };

  // Processed Balances array (handles backend properties & defaults)
  const displayBalances = balances.filter(b => {
    const code = getBalStr(b, 'leave_code', 'leaveCode', '').toUpperCase();
    return code !== 'LOP'; // Keep main quota cards clean (exclude LOP 0-day quota)
  });

  const allLeaveTypes = leaveTypes;

  // Stats Calculations
  const totalAvailableDays = displayBalances.reduce((acc, b) => acc + getBalNum(b, 'available_balance', 'availableBalance', 0), 0);
  const totalConsumedDays = displayBalances.reduce((acc, b) => acc + getBalNum(b, 'consumed_balance', 'consumedBalance', 0), 0);
  const pendingCount = applications.filter(a => ['pending', 'submitted', 'pending_manager', 'pending_hr'].includes(a.status?.toLowerCase())).length;

  const filteredApplications = selectedStatus === 'all'
    ? applications
    : applications.filter(app => {
        const s = app.status?.toLowerCase();
        if (selectedStatus === 'pending') {
          return ['pending', 'submitted', 'pending_manager', 'pending_hr'].includes(s);
        }
        return s === selectedStatus;
      });

  return (
    <div className="space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-extrabold backdrop-blur-md border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Employee Self-Service PTO Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Palmtree className="w-8 h-8 text-amber-300" /> My Leave Management & Quotas
            </h1>
            <p className="text-xs sm:text-sm text-violet-100 max-w-xl font-medium">
              View real-time leave balances, submit PTO applications with instant feedback, and monitor manager review status.
            </p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-violet-700 hover:bg-violet-50 font-black text-sm h-12 px-6 rounded-2xl gap-2.5 shadow-lg shrink-0">
                <PlusCircle className="w-5 h-5 text-violet-600" /> Apply for Leave
              </Button>
            </DialogTrigger>
 
            {/* Apply Leave Modal Form */}
            <DialogContent className="sm:max-w-[550px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-card border border-border shadow-2xl">
              <DialogHeader className="pb-3 border-b">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-extrabold text-foreground">
                  <Palmtree className="w-5 h-5 text-violet-600" /> Apply for Leave
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select leave category, pick date range, and specify reason for manager approval.
                </DialogDescription>
              </DialogHeader>
 
              <form onSubmit={handleApply} className="space-y-4 py-2">
                {/* Leave Category */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Leave Category</label>
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-semibold"
                  >
                    <option value="">Select Leave Category...</option>
                    {allLeaveTypes.map((t) => {
                      const name = t.leave_name || t.leaveName || 'Leave';
                      const code = t.leave_code || t.leaveCode || 'PTO';
                      const balObj = displayBalances.find(b => String(b.leave_type_id || b.leaveTypeId || b.id) === String(t.id));
                      const avail = balObj ? (typeof balObj.available_balance === 'number' ? balObj.available_balance : parseFloat(balObj.available_balance as string) || 0) : 0;
                      return (
                        <option key={t.id} value={t.id}>
                          {name} ({code}) - Allowance: {avail} days
                        </option>
                      );
                    })}
                  </select>
                </div>
 
                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-medium"
                    />
                  </div>
 
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-11 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-medium"
                    />
                  </div>
                </div>
 
                {/* Overrides Table Toggle */}
                {dayBreakdown.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Detailed Daily Configuration</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasManuallyOverridden) {
                            setDayBreakdown(prev => prev.map(d => ({
                              ...d,
                              dayType: 'FULL',
                              quarterType: 'Q1',
                              val: d.isWorkingDay ? 1.0 : 0.0
                            })));
                            setHasManuallyOverridden(false);
                          } else {
                            setHasManuallyOverridden(true);
                          }
                        }}
                        className="text-[11px] font-extrabold text-violet-600 hover:text-violet-700 bg-violet-500/5 hover:bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/10 transition-all"
                      >
                        {hasManuallyOverridden ? 'Reset to Full Days' : 'Customize Days (Half/Quarter)'}
                      </button>
                    </div>
 
                    {hasManuallyOverridden && (
                      <div className="space-y-2 border border-border bg-muted/20 p-3 rounded-2xl">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground block border-b pb-1 mb-2">
                          Day-by-Day Overrides
                        </span>
                        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                          {dayBreakdown.map((day, idx) => (
                            <div key={day.date} className="flex items-center justify-between gap-3 text-xs bg-card p-2.5 rounded-xl border border-border">
                              <div className="min-w-0">
                                <span className="font-bold text-foreground block">
                                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                {!day.isWorkingDay && (
                                  <span className="text-[9px] font-extrabold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                    {day.reason}
                                  </span>
                                )}
                              </div>
 
                              {day.isWorkingDay ? (
                                <div className="flex gap-1.5 items-center">
                                  <select
                                    value={day.dayType}
                                    onChange={(e) => {
                                      const type = e.target.value;
                                      setDayBreakdown(prev => prev.map((d, i) => {
                                        if (i !== idx) return d;
                                        let val = 1.0;
                                        if (type === 'FIRST_HALF' || type === 'SECOND_HALF') val = 0.5;
                                        if (type === 'QUARTER') val = 0.25;
                                        return { ...d, dayType: type, val };
                                      }));
                                    }}
                                    className="bg-muted border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-foreground focus:ring-1 focus:ring-violet-500 focus:outline-none"
                                  >
                                    <option value="FULL">Full Day</option>
                                    <option value="FIRST_HALF">First Half</option>
                                    <option value="SECOND_HALF">Second Half</option>
                                    {allowQuarterDayLeave && <option value="QUARTER">Quarter Day</option>}
                                  </select>
 
                                  {day.dayType === 'QUARTER' && (
                                    <select
                                      value={day.quarterType || 'Q1'}
                                      onChange={(e) => {
                                        const qType = e.target.value;
                                        setDayBreakdown(prev => prev.map((d, i) => {
                                          if (i !== idx) return d;
                                          return { ...d, quarterType: qType };
                                        }));
                                      }}
                                      className="bg-muted border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-foreground focus:ring-1 focus:ring-violet-500 focus:outline-none"
                                    >
                                      <option value="Q1">1st Quarter</option>
                                      <option value="Q2">2nd Quarter</option>
                                      <option value="Q3">3rd Quarter</option>
                                      <option value="Q4">4th Quarter</option>
                                    </select>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] font-bold text-muted-foreground">0.0 Days</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
 
                {/* Sick Leave Medical Document Upload */}
                {(() => {
                  const selectedTypeObj = allLeaveTypes.find(t => String(t.id) === String(leaveTypeId));
                  const leaveCode = selectedTypeObj ? (selectedTypeObj.leave_code || selectedTypeObj.leaveCode || '').toUpperCase() : '';
                  const totalDays = computedTotalRequestedDays();
                  const isSick = leaveCode === 'SL';
                  if (!isSick) return null;
 
                  const isMandatory = totalDays >= sickLeaveDocThreshold;
 
                  return (
                    <div className="space-y-1.5 p-3 rounded-2xl border border-border bg-muted/30">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Attach Medical Certificate {isMandatory ? <span className="text-rose-500 font-extrabold">(Required)</span> : <span className="text-muted-foreground">(Optional)</span>}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">PDF, JPG, PNG (Max 5MB)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('medicalFile')?.click()}
                          className="rounded-xl h-10 px-4 text-xs font-bold gap-2 hover:bg-muted"
                        >
                          <Upload className="w-4 h-4 text-violet-500" />
                          {attachedFileName ? 'Change Certificate' : 'Choose File'}
                        </Button>
                        <input
                          id="medicalFile"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">
                          {attachedFileName || 'No file selected'}
                        </span>
                      </div>
                      
                      {analyzingFile && (
                        <div className="text-[10px] text-violet-600 font-extrabold flex items-center gap-1.5 mt-1.5 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                          Analyzing certificate via OCR AI...
                        </div>
                      )}
                      
                      {ocrData && (
                        <div className="mt-2 p-2.5 rounded-xl border border-violet-500/10 bg-violet-500/5 text-[11px] space-y-1 text-muted-foreground">
                          <div className="flex justify-between items-center text-foreground font-bold border-b pb-1 mb-1">
                            <span className="flex items-center gap-1 text-violet-600"><Sparkles className="w-3 h-3 text-violet-500" /> AI OCR Analysis</span>
                            <span className={ocrData.isValid ? "text-emerald-600" : "text-amber-600"}>
                              {ocrData.isValid ? "Valid Proof" : "Unverified"}
                            </span>
                          </div>
                          <div>Patient: <strong className="text-foreground">{ocrData.patientName}</strong></div>
                          <div>Dates: <strong className="text-foreground">{ocrData.startDate} to {ocrData.endDate}</strong></div>
                          {ocrData.notes && <div className="italic text-[10px] mt-1">"{ocrData.notes}"</div>}
                        </div>
                      )}
                    </div>
                  );
                })()}
 
                {/* Balance Live Preview Info Box */}
                {leaveTypeId && (
                  (() => {
                    const selectedDisplayBalance = displayBalances.find(b => String(b.leave_type_id || b.leaveTypeId || b.id) === String(leaveTypeId));
                    const availableBalance = selectedDisplayBalance ? (typeof selectedDisplayBalance.available_balance === 'number' ? selectedDisplayBalance.available_balance : parseFloat(selectedDisplayBalance.available_balance as string) || 0) : 0;
                    const totalDays = computedTotalRequestedDays();
                    const balanceAfter = availableBalance - totalDays;
 
                    const selectedTypeObj = allLeaveTypes.find(t => String(t.id) === String(leaveTypeId));
                    const leaveCode = selectedTypeObj ? (selectedTypeObj.leave_code || selectedTypeObj.leaveCode || '').toUpperCase() : '';
                    const isLOP = leaveCode === 'LOP';
 
                    return (
                      <div className="space-y-2">
                        <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex flex-col gap-1.5 text-xs">
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Available Quota:</span>
                            <span className="font-bold text-foreground font-mono">{availableBalance.toFixed(2)} Days</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Requesting Duration:</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400 font-mono">{totalDays.toFixed(2)} Days</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-1.5 mt-0.5 text-muted-foreground">
                            <span className="font-bold">Estimated Balance After:</span>
                            <span className={`font-mono font-extrabold ${balanceAfter < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {balanceAfter.toFixed(2)} Days
                            </span>
                          </div>
                        </div>
 
                        {/* Insufficient / Warning Messages */}
                        {balanceAfter < 0 && (
                          isLOP ? (
                            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span>Notice: Unpaid Leave (LOP) allows negative balances. This request will result in salary deductions.</span>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-2 text-[11px] text-rose-600 dark:text-rose-400 font-medium animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <span>Error: Insufficient balance. You cannot submit this request.</span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()
                )}
 
                {/* Reason description */}
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-bold">
                    <label className="text-foreground">Reason for Leave</label>
                    <span className={`text-[10px] font-mono ${reason.length < 10 || reason.length > 300 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {reason.length}/300 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Provide details about why you need this leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground resize-none focus:ring-violet-500/40"
                  />
                  {reason.length > 0 && reason.length < 10 && (
                    <span className="text-[10px] text-rose-500 block mt-1">* Reason must be at least 10 characters</span>
                  )}
                </div>
 
                {/* Handover Backup & Optional Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Backup Person (Optional)</label>
                    <select
                      value={backupPerson}
                      onChange={(e) => setBackupPerson(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-semibold"
                    >
                      <option value="">Select Backup Person...</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
 
                  {computedTotalRequestedDays() > 5 && (
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">Emergency Contact <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Phone number / details"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        className="w-full h-11 px-3.5 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-medium"
                      />
                    </div>
                  )}
                </div>
 
                {/* Manager Routing info */}
                <div className="pt-1.5 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <ShieldCheck className="w-4 h-4 text-violet-500" />
                  <span>This request will route to manager: <strong>{employee?.reportingManager || 'HR Admin'}</strong> for verification.</span>
                </div>
 
                {/* Action Buttons */}
                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="rounded-xl text-xs font-bold h-10 px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-10 px-6 rounded-xl gap-2 shadow-md shadow-violet-600/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" /> Submit for Approval
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Top Quick Overview Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Total Available</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{totalAvailableDays} <span className="text-xs text-muted-foreground font-medium">Days</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Consumed Leave</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{totalConsumedDays} <span className="text-xs text-muted-foreground font-medium">Days</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Pending Review</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{pendingCount} <span className="text-xs text-muted-foreground font-medium">Requests</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Total Applications</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{applications.length} <span className="text-xs text-muted-foreground font-medium">Total</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Leave Balances Cards Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayBalances.map((bal) => {
          const leaveCode = getBalStr(bal, 'leave_code', 'leaveCode', 'PTO');
          const leaveName = getBalStr(bal, 'leave_name', 'leaveName', `Leave (${leaveCode})`);

          const theme = getCardTheme(leaveCode);

          const total = getBalNum(bal, 'allocated_balance', 'allocatedBalance', 12);
          const consumed = getBalNum(bal, 'consumed_balance', 'consumedBalance', 0);
          const pending = getBalNum(bal, 'pending_approval_balance', 'pendingApprovalBalance', 0);

          // Formula: Available = Total Allocated - Consumed - Pending Approval
          const avail = Math.max(0, total - consumed - pending);

          const percent = total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0;

          return (
            <Card key={bal.id} className={`border rounded-2xl p-5 bg-card/80 backdrop-blur-sm shadow-sm transition-all ${theme.hover}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground tracking-tight">{leaveName}</span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border ${theme.bg} ${theme.text} ${theme.border}`}>
                  {leaveCode}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-foreground">{avail} <span className="text-xs text-muted-foreground font-semibold">days left</span></h3>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                  <span>Consumed: {consumed}d</span>
                  <span>Quota: {total}d</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Leave Applications History Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap bg-card p-4 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center space-x-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-600" /> Leave Application History
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 font-bold border border-violet-500/20">
              {filteredApplications.length} Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground font-extrabold capitalize cursor-pointer hover:bg-muted"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-xs font-bold text-muted-foreground h-9">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* History Application List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground bg-card rounded-3xl border border-border">
            <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
            <p className="text-xs font-bold">Fetching live leave history...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-3xl border border-border shadow-sm space-y-3">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-foreground">No Leave Applications Found</h3>
              <p className="text-xs text-muted-foreground mt-0.5">You haven't submitted any leave requests matching this filter status.</p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl gap-1.5 shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Apply for Leave
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((app) => {
              const cleanDateStr = (str?: string) => {
                if (!str) return '';
                if (str.includes('T')) return str.split('T')[0];
                return str;
              };

              const startDate = cleanDateStr(app.application_start_date || app.applicationStartDate || app.from_date) || '2026-07-10';
              const endDate = cleanDateStr(app.application_end_date || app.applicationEndDate || app.to_date) || '2026-07-11';
              const days = app.total_days ?? app.totalDays ?? app.duration_days ?? 1;
              const leaveCode = app.leave_code || app.leaveCode || 'PTO';
              const leaveName = app.leave_name || app.leaveName || `Leave #${app.leave_type_id || app.leaveTypeId || 1}`;

              return (
                <div
                  key={app.id}
                  className="p-5 bg-card rounded-2xl border border-border shadow-sm hover:border-violet-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-violet-500/10 text-violet-600 border border-violet-500/20">
                        {leaveCode}
                      </span>
                      <h4 className="text-sm font-black text-foreground">
                        {leaveName}
                      </h4>
                      {renderStatusBadge(app.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-foreground font-semibold">{startDate}</span>
                        <span>to</span>
                        <span className="text-foreground font-semibold">{endDate}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <span>Total Duration:</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-[11px]">
                          {days} {days === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>

                      {app.approverName && (
                        <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-border/60">
                          <span className="text-muted-foreground">Approver:</span>
                          <span className="text-foreground font-bold">{app.approverName}</span>
                        </div>
                      )}
                    </div>

                    {(app.reason || app.reason_description) && (
                      <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl border border-border/50">
                        "{app.reason || app.reason_description}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {['submitted', 'pending', 'draft', 'pending_manager', 'pending_hr'].includes(app.status?.toLowerCase()) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRequest(app.id)}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/20 text-xs font-bold h-9 rounded-xl gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancel Request
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🎉 SUCCESS CONFIRMATION POPUP MODAL */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 bg-card border border-border shadow-2xl text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <DialogHeader className="pt-3">
            <DialogTitle className="text-xl font-black text-foreground text-center">
              Leave Application Submitted!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Your leave request has been logged successfully and sent to your manager for approval.
            </DialogDescription>
          </DialogHeader>

          {successData && (
            <div className="my-4 p-4 bg-muted/40 rounded-2xl border border-border text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-semibold">Reference ID:</span>
                <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{successData.refNo}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Leave Category:</span>
                <span className="font-bold text-foreground">{successData.leaveName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Date Range:</span>
                <span className="font-semibold text-foreground">{successData.startDate} to {successData.endDate}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Total Duration:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-600">{successData.totalDays} Days</span>
              </div>

              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-muted-foreground font-semibold">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  {successData.status}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs h-11 rounded-xl shadow-lg shadow-violet-600/20 gap-2"
            >
              Done & View Leave History <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
