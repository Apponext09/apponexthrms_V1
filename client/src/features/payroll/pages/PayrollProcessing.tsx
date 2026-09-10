import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  Filter,
  RefreshCw,
  Info,
  ChevronDown,
  ClipboardList,
  ListChecks,
  CheckCircle2,
  Check,
  Edit3,
  XCircle,
  FileText,
  BarChart2,
  CheckSquare,
  Search,
  Maximize2,
  Minimize2,
  Expand,
  CreditCard,
  CalendarDays,
  Eye,
  X,
  Layers,
  AlertTriangle,
  Scale,
  Lock,
  Send,
  ShieldCheck,
  Building2,
  Users,
  FileSpreadsheet,
  AlertCircle,
  CheckCheck,
  TrendingUp,
  Clock,
  Printer,
} from 'lucide-react';

interface PayrollCycle {
  id?: number | string;
  uuid?: string;
  cycle_name?: string;
  name?: string;
  frequency?: string;
  status?: string;
}

const fmt = (v?: number) => (v == null ? '0' : Number(v).toLocaleString('en-IN'));

function deduplicate<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return (items || []).filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const titleCaseLabel = (s: string) => {
  if (!s) return '';
  return String(s)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

type MainTab = 'process' | 'payroll_requests' | 'payroll_download' | 'payroll_runs';

const MAIN_TABS = [
  { key: 'process', label: 'Process Payroll', icon: BarChart2 },
  { key: 'payroll_requests', label: 'Payroll Requests', icon: ShieldCheck },
  { key: 'payroll_download', label: 'Payroll Download', icon: Download },
  { key: 'payroll_runs', label: 'Payroll Runs', icon: ClipboardList },
];

const Sel: React.FC<{
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onChange, children, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none border border-border rounded-lg px-3 py-1.5 pr-8 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8 cursor-pointer"
    >
      {children}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
  </div>
);

// â”€â”€ Tab 1: Upload Payroll Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UploadPayrollDataTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [cycleId, setCycleId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!cycleId) { showToast.error('Missing', 'Select a payroll cycle'); return; }
    if (!file) { showToast.error('Missing', 'Choose a file to upload'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('cycleId', cycleId);
      fd.append('month', month);
      await apiClient.post('/payroll/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast.success('Upload Successful âœ…', 'Payroll data uploaded.');
      setFile(null);
    } catch (err: any) {
      showToast.error('Upload Failed', err?.message || 'Error during upload');
    } finally { setUploading(false); }
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-sm font-bold text-foreground">Upload Attendance / Payroll CSV</h2>
        <p className="text-xs text-muted-foreground">Upload bulk attendance or adjustments file for the payroll cycle</p>
      </div>
      <div className="p-4 space-y-4 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Payroll Cycle *</label>
            <Sel value={cycleId} onChange={setCycleId}>
              <option value="">- Select -</option>
              {cycles.map(c => <option key={c.id} value={String(c.id)}>{c.cycle_name || c.name}</option>)}
            </Sel>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Month *</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-xs bg-background text-foreground h-8"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">CSV File *</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload Data'}
        </button>
      </div>
    </div>
  );
};

// ── Tab 3: Payroll Download (Matches Hoshi HRMS 1:1) ──────────────────────
const PayrollDownloadTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [cycleId, setCycleId] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    if (!cycleId) {
      showToast.error('Missing Cycle', 'Please select a Payroll Cycle.');
      return;
    }
    setDownloading(true);
    try {
      const res = await apiClient.get('/payroll/process-register', {
        params: { cycleId, fromDate, toDate }
      });
      const data = res.data?.data || res.data || [];
      if (!Array.isArray(data) || data.length === 0) {
        showToast.error('No Records', 'No payroll records found for the selected cycle and date range.');
        return;
      }

      const headers = [
        'Employee Code', 'First Name', 'Last Name', 'Designation', 'Department',
        'Pay Slab', 'Bank Name', 'Account No', 'Payroll Cycle', 'Salary Days',
        'Paid Days', 'Unpaid Days', 'Basic Monthly', 'HRA Monthly', 'Gross Monthly',
        'Total Deductions', 'Net Take Home', 'From Date', 'To Date'
      ];

      const rows = data.map((emp: any) => [
        `"${emp.employee_code || `EMP-${emp.id}`}"`,
        `"${emp.first_name || ''}"`,
        `"${emp.last_name || ''}"`,
        `"${emp.designation || 'Employee'}"`,
        `"${emp.department_name || emp.department || 'General'}"`,
        `"${emp.slab_name || 'Standard Pay Slab'}"`,
        `"${emp.bank_name || 'N/A'}"`,
        `"=""${emp.account_number || emp.account_no || 'N/A'}"""`,
        `"${emp.cycle_name || 'Monthly'}"`,
        emp.salary_days || emp.total_working_days || 30,
        emp.paid_days ?? 30,
        emp.unpaid_days ?? 0,
        emp.basic_earned ?? emp.basic_monthly ?? emp.basic ?? 0,
        emp.hra_earned ?? emp.hra_monthly ?? emp.hra ?? 0,
        emp.total_gross_earned ?? emp.gross_earned ?? emp.gross_monthly ?? emp.gross ?? 0,
        emp.total_deduction ?? emp.total_deductions ?? 0,
        emp.net_salary ?? 0,
        `"${fromDate}"`,
        `"${toDate}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Payroll_Export_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast.success('Download Complete 🚀', 'Payroll Excel/CSV sheet downloaded successfully.');
    } catch (err: any) {
      showToast.error('Download Failed', err?.message || 'Error generating export file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-sm">
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Payroll Cycle <span className="text-rose-500">*</span>
            </label>
            <Sel value={cycleId} onChange={setCycleId}>
              <option value="">- Select -</option>
              {cycles.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.cycle_name || c.name || 'Standard Monthly Cycle'}
                </option>
              ))}
            </Sel>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Select Range <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground h-9 font-medium"
                />
              </div>
              <span className="text-xs text-muted-foreground font-bold">to</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground h-9 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="flex items-center gap-2 bg-[#2b90d9] hover:bg-[#2080c4] text-white text-xs font-bold px-5 py-2.5 rounded-md shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Generating Excel Sheet...' : 'Download Excel Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tab 2: Payroll Requests (Approval & Review Hub) ────────────────────────
const PayrollRequestsTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [filterMode, setFilterMode] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runDetailsLoading, setRunDetailsLoading] = useState(false);
  const [runDetailsData, setRunDetailsData] = useState<any | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [isApproving, setIsApproving] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetRun, setRejectTargetRun] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['payroll-requests-runs'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll');
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }
  });

  const pendingRuns = runs.filter((r: any) => String(r.status || '').toLowerCase() === 'locked');
  const approvedRuns = runs.filter((r: any) => ['approved', 'published'].includes(String(r.status || '').toLowerCase()));

  const filteredList = (filterMode === 'pending' ? pendingRuns : filterMode === 'approved' ? approvedRuns : runs).filter((r: any) => {
    const name = (r.cycle_name || r.name || '').toLowerCase();
    const period = String(r.payroll_month || r.month || r.year || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || period.includes(q) || String(r.id).includes(q);
  });

  const totalPendingGross = pendingRuns.reduce((sum: number, r: any) => sum + Number(r.total_gross_pay || 0), 0);
  const totalPendingNet = pendingRuns.reduce((sum: number, r: any) => sum + Number(r.total_net_pay || 0), 0);
  const totalPendingStaff = pendingRuns.reduce((sum: number, r: any) => sum + Number(r.employee_count || r.total_employees || 0), 0);

  const handleOpenReportModal = async (run: any) => {
    setSelectedRun(run);
    setRunDetailsLoading(true);
    try {
      const res = await apiClient.get(`/payroll/${run.id}`);
      const data = res.data?.data || res.data || {};
      setRunDetailsData(data);
    } catch (e) {
      console.error(e);
      setRunDetailsData(null);
    } finally {
      setRunDetailsLoading(false);
    }
  };

  const handleApprove = async (runId: number) => {
    setIsApproving(runId);
    try {
      await apiClient.post(`/payroll/${runId}/approve`);
      showToast.success('Payroll Approved 🎉', `Run #${runId} approved. HR has been notified to publish.`);
      refetch();
      if (selectedRun?.id === runId) {
        setSelectedRun(null);
      }
    } catch (err: any) {
      showToast.error('Approval Error', err?.response?.data?.message || 'Failed to approve payroll.');
    } finally {
      setIsApproving(null);
    }
  };

  const handleOpenRejectModal = (run: any) => {
    setRejectTargetRun(run);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetRun) return;
    if (!rejectionReason.trim()) {
      showToast.error('Reason Required', 'Please provide a note for requesting revision.');
      return;
    }
    setIsRejecting(true);
    try {
      await apiClient.post(`/payroll/${rejectTargetRun.id}/unlock`, { reason: rejectionReason.trim() });
      showToast.info('Revision Requested ⚠️', `Run #${rejectTargetRun.id} returned to draft. HR notified.`);
      setRejectModalOpen(false);
      setRejectTargetRun(null);
      refetch();
      if (selectedRun?.id === rejectTargetRun.id) {
        setSelectedRun(null);
      }
    } catch (err: any) {
      showToast.error('Action Failed', err?.response?.data?.message || 'Could not return run.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDownloadBankCSV = (run: any, emps: any[]) => {
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Bank Name', 'Account Number', 'IFSC Code', 'Net Salary (INR)', 'Payment Status'];
    const rows = emps.map(e => [
      `"${e.employee_code || e.code || ''}"`,
      `"${((e.first_name || e.name || '') + ' ' + (e.last_name || '')).trim()}"`,
      `"${e.department || 'General'}"`,
      `"${e.bank_name || 'Standard Bank'}"`,
      `"${e.account_number || e.account_no || 'N/A'}"`,
      `"${e.ifsc_code || 'N/A'}"`,
      Math.round(Number(e.netSalary ?? e.net_salary ?? 0)),
      `"${e.payment_status || 'Release'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bank_Disbursal_Run_${run.id}_${run.payroll_month || 'payout'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success('Bank CSV Downloaded', 'Bank disbursement file generated.');
  };

  const handleDownloadRegisterCSV = (run: any, emps: any[]) => {
    const headers = ['Code', 'Name', 'Department', 'Designation', 'Slab', 'Days', 'Gross Earned', 'Deductions', 'Net Salary'];
    const rows = emps.map(e => [
      `"${e.employee_code || e.code || ''}"`,
      `"${((e.first_name || e.name || '') + ' ' + (e.last_name || '')).trim()}"`,
      `"${e.department || 'General'}"`,
      `"${e.designation || 'Staff'}"`,
      `"${e.slab_name || 'Standard'}"`,
      e.workingDays ?? e.working_days ?? e.paid_days ?? 30,
      Math.round(Number(e.totalEarnings ?? e.total_earnings ?? 0)),
      Math.round(Number(e.totalDeductions ?? e.total_deductions ?? 0)),
      Math.round(Number(e.netSalary ?? e.net_salary ?? 0))
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Register_Run_${run.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success('Register CSV Downloaded', 'Full payroll register generated.');
  };

  return (
    <div className="space-y-4">
      {/* 4 Executive KPI Outlay Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Lock className="w-3 h-3" /> Pending Approvals
          </p>
          <p className="text-xl font-black text-foreground mt-0.5">{pendingRuns.length}</p>
          <span className="text-[10px] text-muted-foreground">Locked by HR</span>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCheck className="w-3 h-3" /> Approved / Published
          </p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{approvedRuns.length}</p>
          <span className="text-[10px] text-muted-foreground">Ready / Disbursed</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Pending Gross Outlay
          </p>
          <p className="text-lg font-black text-foreground mt-0.5">
            ₹{Math.round(totalPendingGross).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-muted-foreground">Total CTC to Authorize</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" /> Total Staff Impacted
          </p>
          <p className="text-lg font-black text-foreground mt-0.5">
            {totalPendingStaff} Employees
          </p>
          <span className="text-[10px] text-muted-foreground">Net Payout: ₹{Math.round(totalPendingNet).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Main Request Card */}
      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
        {/* Header & Sub-filters */}
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
            <button
              onClick={() => setFilterMode('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'pending'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="w-3 h-3" /> Pending Approvals ({pendingRuns.length})
            </button>
            <button
              onClick={() => setFilterMode('approved')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'approved'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCheck className="w-3 h-3" /> Approved History ({approvedRuns.length})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({runs.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search run # or cycle..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Refresh requests"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              Loading payroll approval requests...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/40 mb-1" />
              <p className="font-bold text-foreground">No pending payroll requests found</p>
              <p className="text-[11px]">When HR locks a payroll calculation, it will appear here for executive approval.</p>
            </div>
          ) : (
            filteredList.map((r: any) => {
              const runCode = `#RUN-${String(r.id).padStart(3, '0')}`;
              const cycleName = r.cycle_name || r.name || `Cycle #${r.payroll_cycle_id || 1}`;
              const period = r.payroll_month || (r.month && r.year ? `${r.year}-${String(r.month).padStart(2, '0')}` : r.month || 'Active Period');
              const gross = Number(r.total_gross_pay || 0);
              const net = Number(r.total_net_pay || 0);
              const ded = Math.max(0, gross - net);
              const empCount = Number(r.employee_count || r.total_employees || 0);
              const statusStr = String(r.status || 'draft').toLowerCase();
              const isLocked = statusStr === 'locked';
              const isApproved = statusStr === 'approved';
              const isPublished = statusStr === 'published';

              return (
                <div
                  key={r.id}
                  className={`border rounded-xl p-4 transition-all ${
                    isLocked
                      ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-xs'
                      : 'border-border/80 bg-card hover:bg-muted/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-black text-sm text-primary">{runCode}</span>
                        <span className="font-bold text-foreground text-sm">{cycleName}</span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          Period: {period}
                        </Badge>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isApproved
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : isLocked
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 animate-pulse'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {statusStr.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>👥 <strong>{empCount}</strong> Staff Included</span>
                        <span>•</span>
                        <span>
                          {r.locked_at ? `🔒 Locked on ${new Date(r.locked_at).toLocaleDateString('en-IN')}` : 'Draft Cycle'}
                        </span>
                        {r.approved_at && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-semibold">✓ Approved on {new Date(r.approved_at).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle: Financial Metrics */}
                    <div className="flex items-center gap-6 text-xs bg-background/80 p-2.5 rounded-lg border border-border/60">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Gross Outlay</span>
                        <span className="font-mono font-bold text-foreground">₹{Math.round(gross).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Deductions</span>
                        <span className="font-mono text-rose-500 font-bold">-₹{Math.round(ded).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Net Bank Payout</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₹{Math.round(net).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenReportModal(r)}
                        className="flex items-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg transition-colors cursor-pointer border border-border/80 shadow-2xs"
                        title="View complete financial report and employee breakdown"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> View Report
                      </button>

                      {isLocked && (
                        <>
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={isApproving === r.id}
                            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {isApproving === r.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isApproving === r.id ? 'Approving...' : 'Approve Run'}
                          </button>

                          <button
                            onClick={() => handleOpenRejectModal(r)}
                            className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs rounded-lg transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
                            title="Request HR to revise numbers"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Request Revision
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Approved (Ready for Publish)
                        </span>
                      )}

                      {isPublished && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comprehensive Report & Breakdown Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Payroll Financial Report & Approval Sheet — #RUN-{String(selectedRun.id).padStart(3, '0')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedRun.cycle_name || 'Cycle'} • Period: {selectedRun.payroll_month || selectedRun.month || 'Active'} • Status:{' '}
                    <span className="font-bold text-foreground">{String(selectedRun.status).toUpperCase()}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {runDetailsLoading ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading comprehensive financial report...
                </div>
              ) : (
                <>
                  {/* 4 Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted/20 border border-border rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Gross CTC Outlay</span>
                      <span className="text-lg font-black text-foreground">
                        ₹{Math.round(Number(selectedRun.total_gross_pay || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">Net Bank Disbursement</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{Math.round(Number(selectedRun.total_net_pay || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                      <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold block">Total Deductions</span>
                      <span className="text-lg font-black text-rose-600">
                        ₹{Math.round(Math.max(0, Number(selectedRun.total_gross_pay || 0) - Number(selectedRun.total_net_pay || 0))).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-bold block">Staff Included</span>
                      <span className="text-lg font-black text-indigo-600">
                        {selectedRun.employee_count || selectedRun.total_employees || (runDetailsData?.employees?.length || 0)} Staff
                      </span>
                    </div>
                  </div>

                  {/* Department Breakdown Bar if available */}
                  {runDetailsData?.departmentBreakdown && runDetailsData.departmentBreakdown.length > 0 && (
                    <div className="border border-border/80 rounded-xl p-3.5 bg-muted/10 space-y-2">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> Department Cost Allocation
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {runDetailsData.departmentBreakdown.map((d: any) => (
                          <div key={d.department} className="p-2 bg-background rounded-lg border border-border/60">
                            <span className="font-bold text-foreground block truncate">{d.department}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {d.count} staff • ₹{Math.round(d.totalNet).toLocaleString('en-IN')} Net
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Itemized Table Header Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee or code..."
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadBankCSV(selectedRun, runDetailsData?.employees || [])}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        <Download className="w-3 h-3" /> Bank Disbursal CSV
                      </button>
                      <button
                        onClick={() => handleDownloadRegisterCSV(selectedRun, runDetailsData?.employees || [])}
                        className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg transition-colors cursor-pointer border border-border"
                      >
                        <Download className="w-3 h-3" /> Full Register CSV
                      </button>
                    </div>
                  </div>

                  {/* Employee Register Table */}
                  <div className="border border-border/80 rounded-xl overflow-x-auto max-h-[350px]">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Dept & Designation</th>
                          <th className="py-2.5 px-3">Bank Details</th>
                          <th className="py-2.5 px-3 text-center">Days</th>
                          <th className="py-2.5 px-3 text-right">Gross Earned</th>
                          <th className="py-2.5 px-3 text-right">Deductions</th>
                          <th className="py-2.5 px-3 text-right">Net Salary</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(runDetailsData?.employees || [])
                          .filter((e: any) => {
                            const name = `${e.first_name || e.name || ''} ${e.last_name || ''}`.toLowerCase();
                            const code = String(e.employee_code || e.code || '').toLowerCase();
                            return name.includes(empSearch.toLowerCase()) || code.includes(empSearch.toLowerCase());
                          })
                          .map((emp: any, idx: number) => {
                            const empName = `${emp.first_name || emp.name || 'Staff Member'} ${emp.last_name || ''}`.trim();
                            const gross = Number(emp.totalEarnings ?? emp.total_earnings ?? emp.gross_earned ?? 0);
                            const ded = Number(emp.totalDeductions ?? emp.total_deductions ?? emp.deductions ?? 0);
                            const net = Number(emp.netSalary ?? emp.net_salary ?? (gross - ded));

                            return (
                              <tr key={emp.id || idx} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-medium">
                                  <div className="font-bold text-foreground">{empName}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{emp.employee_code || emp.code || `EMP-${idx + 1}`}</div>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground">
                                  <div>{emp.department || 'General'}</div>
                                  <div className="text-[10px]">{emp.designation || 'Staff'}</div>
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                                  <div>{emp.bank_name || 'Standard Bank'}</div>
                                  <div className="text-[10px]">{emp.account_number || emp.account_no || '—'}</div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold">
                                  {emp.workingDays ?? emp.working_days ?? emp.paid_days ?? 30}d
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold">₹{Math.round(gross).toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-500 font-semibold">-₹{Math.round(ded).toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{Math.round(net).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {emp.payment_status || 'Release'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Review the numbers above before granting final executive approval.
              </span>

              <div className="flex items-center gap-2">
                {String(selectedRun.status).toLowerCase() === 'locked' && (
                  <>
                    <button
                      onClick={() => handleOpenRejectModal(selectedRun)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Request Revision
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRun.id)}
                      disabled={isApproving === selectedRun.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isApproving === selectedRun.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve Payroll Run
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedRun(null)}
                  className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision / Reject Reason Modal */}
      {rejectModalOpen && rejectTargetRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Request Payroll Revision — #RUN-{String(rejectTargetRun.id).padStart(3, '0')}
              </h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Provide instructions for the HR team. The payroll run will be unlocked to <strong>Draft</strong> so adjustments can be made.
              </p>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Please verify overtime hours and recheck deduction for Engineering staff..."
                rows={4}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {isRejecting ? 'Returning...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab 4: Payroll Runs Historical Ledger ──────────────────────────────────
const PayrollRunsTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runDetailsLoading, setRunDetailsLoading] = useState(false);
  const [runEmployees, setRunEmployees] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [isApproving, setIsApproving] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState<number | null>(null);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['payroll-runs-history'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll');
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    }
  });

  const handleOpenRunDetails = async (run: any) => {
    setSelectedRun(run);
    setRunDetailsLoading(true);
    try {
      const res = await apiClient.get(`/payroll/${run.id}`);
      const data = res.data?.data || res.data || {};
      const emps = data.employees || data.payroll_run_employees || data.runEmployees || [];
      if (Array.isArray(emps) && emps.length > 0) {
        setRunEmployees(emps);
      } else {
        const regRes = await apiClient.get('/payroll/process-register');
        const regEmps = regRes.data?.data || [];
        setRunEmployees(regEmps);
      }
    } catch {
      setRunEmployees([]);
    } finally {
      setRunDetailsLoading(false);
    }
  };

  const handleApproveRun = async (runId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApproving(runId);
    try {
      await apiClient.post(`/payroll/${runId}/approve`);
      showToast.success('Payroll Approved 🎉', `Run #${runId} approved. HR has been notified.`);
      refetch();
    } catch (err: any) {
      showToast.error('Approval Error', err?.response?.data?.message || 'Failed to approve run');
    } finally {
      setIsApproving(null);
    }
  };

  const handlePublishRun = async (runId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPublishing(runId);
    try {
      await apiClient.post(`/payroll/${runId}/publish`);
      showToast.success('Payslips Published 🚀', `Run #${runId} payslips released to employees.`);
      refetch();
    } catch (err: any) {
      showToast.error('Publish Error', err?.response?.data?.message || 'Failed to publish run');
    } finally {
      setIsPublishing(null);
    }
  };

  const filteredRuns = runs.filter((r: any) => {
    const cycleName = (r.cycle_name || r.name || '').toLowerCase();
    const period = String(r.payroll_month || r.month || r.year || '').toLowerCase();
    const status = String(r.status || '').toLowerCase();
    const matchesSearch = cycleName.includes(searchQuery.toLowerCase()) || period.includes(searchQuery.toLowerCase()) || String(r.id).includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalOutlaySum = runs.reduce((s: number, r: any) => s + Number(r.total_gross_pay || 0), 0);
  const totalNetSum = runs.reduce((s: number, r: any) => s + Number(r.total_net_pay || 0), 0);

  const getStatusBadge = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'published') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Published</span>;
    }
    if (s === 'approved') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800"><CheckCheck className="w-3 h-3 text-purple-600" /> Approved</span>;
    }
    if (s === 'locked') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"><Lock className="w-3 h-3 text-indigo-600" /> Locked</span>;
    }
    if (s === 'calculated') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><RefreshCw className="w-3 h-3 text-amber-600" /> Calculated</span>;
    }
    if (s === 'processing') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800"><RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> Processing...</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"><ClipboardList className="w-3 h-3 text-slate-500" /> Draft</span>;
  };

  return (
    <div className="space-y-4">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Payroll Runs</p>
          <p className="text-xl font-black text-foreground mt-0.5">{runs.length}</p>
          <span className="text-[10px] text-muted-foreground">Historical Cycles</span>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Published Runs</p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {runs.filter((r: any) => ['published'].includes(String(r.status).toLowerCase())).length}
          </p>
          <span className="text-[10px] text-muted-foreground">Bank Disbursed</span>
        </div>
        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Outlay Tracked</p>
          <p className="text-lg font-black text-foreground mt-0.5">
            ₹{Math.round(totalOutlaySum).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-muted-foreground">Total CTC Processed</span>
        </div>
        <div className="p-3.5 rounded-xl border border-border/80 bg-card">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Salary Disbursed</p>
          <p className="text-lg font-black text-foreground mt-0.5">
            ₹{Math.round(totalNetSum).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-muted-foreground">Direct Bank Payouts</span>
        </div>
      </div>

      {/* Runs Table Card */}
      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Historical Payroll Execution Runs</h2>
            <span className="text-xs text-muted-foreground">({filteredRuns.length} runs found)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search run, month, or cycle..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-8 border border-border bg-background rounded-lg px-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="published">Published</option>
              <option value="approved">Approved</option>
              <option value="locked">Locked</option>
              <option value="calculated">Calculated</option>
              <option value="draft">Draft</option>
            </select>

            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Refresh runs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Run #</th>
                <th className="py-3 px-4">Cycle & Period</th>
                <th className="py-3 px-4">Run Type</th>
                <th className="py-3 px-4">Employees</th>
                <th className="py-3 px-4">Gross Pay</th>
                <th className="py-3 px-4">Net Disbursal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Processed Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                    Loading payroll execution runs from database...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    No payroll execution runs match the current search filters.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r: any) => {
                  const runCode = `#RUN-${String(r.id).padStart(3, '0')}`;
                  const cycleName = r.cycle_name || r.name || (r.payroll_cycle_id ? `Cycle #${r.payroll_cycle_id}` : 'Standard Monthly Cycle');
                  const period = r.payroll_month || (r.month && r.year ? `${r.year}-${String(r.month).padStart(2, '0')}` : r.month || 'Active Period');
                  const gross = Number(r.total_gross_pay || 0);
                  const net = Number(r.total_net_pay || 0);
                  const empCount = Number(r.employee_count || r.total_employees || 0);
                  const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
                  const s = String(r.status || 'draft').toLowerCase();

                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{runCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{cycleName}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">{period}</div>
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-muted-foreground text-[10px]">
                        {r.run_type || 'regular'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {empCount} Staff
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        ₹{Math.round(gross).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Math.round(net).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRunDetails(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-[11px] cursor-pointer transition-colors shadow-2xs border border-border/60"
                          >
                            <Eye className="w-3 h-3 text-primary" /> Details
                          </button>

                          {s === 'locked' && (
                            <button
                              onClick={(e) => handleApproveRun(r.id, e)}
                              disabled={isApproving === r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                          )}

                          {s === 'approved' && (
                            <button
                              onClick={(e) => handlePublishRun(r.id, e)}
                              disabled={isPublishing === r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                            >
                              <Send className="w-3 h-3" /> Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Run Breakdown Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Payroll Run Breakdown — #RUN-{String(selectedRun.id).padStart(3, '0')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedRun.cycle_name || 'Standard Cycle'} • Period: {selectedRun.payroll_month || selectedRun.month || 'Active'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border/60 bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter employees in this run..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-muted/20 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span>Status: {getStatusBadge(selectedRun.status)}</span>
                <span className="font-mono font-bold text-emerald-600">
                  Total Net: ₹{Math.round(Number(selectedRun.total_net_pay || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {runDetailsLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading employee records for this run...
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-4">Designation</th>
                      <th className="py-2.5 px-4">Days</th>
                      <th className="py-2.5 px-4">Earned Gross</th>
                      <th className="py-2.5 px-4">Deductions</th>
                      <th className="py-2.5 px-4">Net Salary</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {runEmployees
                      .filter((e: any) => {
                        const name = `${e.first_name || e.name || ''} ${e.last_name || ''}`.toLowerCase();
                        const code = String(e.employee_code || e.code || '').toLowerCase();
                        return name.includes(empSearch.toLowerCase()) || code.includes(empSearch.toLowerCase());
                      })
                      .map((emp: any, idx: number) => {
                        const empName = `${emp.first_name || emp.name || 'Staff Member'} ${emp.last_name || ''}`.trim();
                        const gross = Number(emp.totalEarnings ?? emp.total_earnings ?? emp.gross_earned ?? 0);
                        const ded = Number(emp.totalDeductions ?? emp.total_deductions ?? emp.deductions ?? 0);
                        const net = Number(emp.netSalary ?? emp.net_salary ?? (gross - ded));

                        return (
                          <tr key={emp.id || idx} className="hover:bg-muted/20">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-foreground">{empName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{emp.employee_code || emp.code || `EMP-${idx + 1}`}</div>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">{emp.designation || emp.designation_name || 'Full-Time'}</td>
                            <td className="py-2.5 px-4 font-mono font-medium">{emp.workingDays ?? emp.working_days ?? emp.payable_days ?? '—'} Days</td>
                            <td className="py-2.5 px-4 font-mono font-semibold">₹{Math.round(gross).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4 font-mono text-rose-500 font-semibold">-₹{Math.round(ded).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(net).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                {emp.status || 'Processed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab 2: Process Payroll Register Table ─────────────────────────────────
const ProcessPayrollTab: React.FC<{ cycles: PayrollCycle[]; selectedCompanyId?: string }> = ({ cycles, selectedCompanyId }) => {
  const [generateOnMode, setGenerateOnMode] = useState('Attendance');
  const [cycleId, setCycleId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [subPeriod, setSubPeriod] = useState('W1');
  const [sortBy, setSortBy] = useState('Name');
  const [payrollStatus, setPayrollStatus] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [removePagination, setRemovePagination] = useState(true);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reportingOfficerId, setReportingOfficerId] = useState('');
  const [empStatus, setEmpStatus] = useState('');
  const [empType, setEmpType] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [slabId, setSlabId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const [bypassCache, setBypassCache] = useState(false);
  const [paymentStatusMap, setPaymentStatusMap] = useState<Record<number, string>>({});
  const [filtered, setFiltered] = useState(false); // ← must be false: data ONLY loads after HR clicks Filter
  const [selectedViewItem, setSelectedViewItem] = useState<any | null>(null);
  const [attendanceCalendarItem, setAttendanceCalendarItem] = useState<any | null>(null);
  const [attendanceCalendarLoading, setAttendanceCalendarLoading] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const openAttendanceCalendar = async (row: any) => {
    const empId = row.employeeId || row.employee_id || row.id;
    const empName = `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim() || `Employee #${empId}`;

    const [yr, mo] = (payrollMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const maxDaysInMonth = new Date(yr, mo, 0).getDate();

    let cycleStartDay = Math.max(1, Math.min(maxDaysInMonth, Number(row.cycle_start_day || row.cycle_start_date_num || selectedCycleObj?.start_date || selectedCycleObj?.startDate || 1)));
    const cycleCutoffDay = Math.max(1, Math.min(maxDaysInMonth, Number(row.cycle_cutoff_day || selectedCycleObj?.cutoff_day || selectedCycleObj?.cutoffDay || maxDaysInMonth)));

    // Dynamic from Slab / Structure Effective Date or Date of Joining
    const effRaw = row.effective_from || row.effectiveFrom || row.slab_effective_from || row.slabEffectiveFrom;
    if (effRaw) {
      const eff = new Date(effRaw);
      if (!isNaN(eff.getTime())) {
        const effY = eff.getFullYear();
        const effM = eff.getMonth() + 1;
        if (effY === yr && effM === mo) {
          cycleStartDay = Math.max(cycleStartDay, eff.getDate());
        }
      }
    }

    const dojRaw = row.date_of_joining || row.dateOfJoining || row.doj;
    if (dojRaw) {
      const doj = new Date(dojRaw);
      if (!isNaN(doj.getTime())) {
        const dojY = doj.getFullYear();
        const dojM = doj.getMonth() + 1;
        if (dojY === yr && dojM === mo) {
          cycleStartDay = Math.max(cycleStartDay, doj.getDate());
        }
      }
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = `${payrollMonth}-${pad(cycleStartDay)}`;
    const monthEnd = `${payrollMonth}-${pad(cycleCutoffDay)}`;

    setAttendanceCalendarItem({ employeeName: empName, startDate: monthStart, endDate: monthEnd, days: [] });
    setAttendanceCalendarLoading(true);
    try {
      const res: any = await apiClient.get('/payroll/attendance-calendar', {
        params: { employeeId: empId, startDate: monthStart, endDate: monthEnd }
      });
      const data = res.data?.data || res.data;
      setAttendanceCalendarItem(data);
    } catch {
      showToast.error('Failed to load', 'Could not load attendance calendar for this employee.');
    } finally {
      setAttendanceCalendarLoading(false);
    }
  };

  // ── Company-scoped cycle logic ────────────────────────────────────────────
  // When a specific company is chosen in the Company filter, fetch only that
  // company's cycles. When no company filter is set and we are in parent-org
  // context (selectedCompanyId == null/empty), return all org cycles so the
  // admin can see every company's cycle and choose.
  const effectiveCycleCompanyId = companyId || selectedCompanyId || '';

  // Reset selected cycle when the effective company changes
  useEffect(() => {
    setCycleId('');
  }, [effectiveCycleCompanyId]);

  // Lookup data from database masters — cycle list scoped to effective company
  const { data: cyclesData = [] } = useQuery({
    queryKey: ['payroll-cycles-process-tab', effectiveCycleCompanyId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (effectiveCycleCompanyId) params.companyId = String(effectiveCycleCompanyId);
      const res = await apiClient.get('/payroll/cycles', { params });
      return res.data?.data || res.data?.cycles || res.data || [];
    },
    staleTime: 0
  });

  const rawCyclesList = cyclesData.length > 0 ? cyclesData : cycles;
  const activeCycles = deduplicate(rawCyclesList as any[], (c: any) => String(c.id || c.cycle_name || c.name));

  // When company filter changes, also reset the cycle selection
  const handleCompanyChange = (val: string) => {
    setCompanyId(val);
    setCycleId(''); // cycles will refetch via effectiveCycleCompanyId
  };

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: async () => { const r = await apiClient.get('/settings/companies'); return r.data?.data || r.data || []; } });
  const { data: locations = [] } = useQuery({ queryKey: ['locs'], queryFn: async () => { const r = await apiClient.get('/settings/locations'); return r.data?.data || r.data || []; } });
  const { data: departments = [] } = useQuery({ queryKey: ['depts'], queryFn: async () => { const r = await apiClient.get('/settings/departments'); return r.data?.data || r.data || []; } });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: async () => { const r = await apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')); return r.data?.data || r.data || []; } });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: async () => { const r = await apiClient.get('/settings/designations'); return r.data?.data || r.data || []; } });
  const { data: slabs = [] } = useQuery({ queryKey: ['slabs-list'], queryFn: async () => { const r = await apiClient.get('/payroll/slabs'); return r.data?.data || r.data || []; } });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const r = await apiClient.get('/employees', { params: { pageSize: 500, limit: 500 } });
      const raw = r.data?.data?.items || r.data?.data || r.data || [];
      return Array.isArray(raw) ? raw : [];
    }
  });

  useEffect(() => {
    if (activeCycles.length > 0 && !cycleId) {
      const firstId = activeCycles[0].id ?? activeCycles[0].uuid ?? 1;
      if (firstId) setCycleId(String(firstId));
    }
  }, [activeCycles, cycleId]);
  // Resume the current run's status for this cycle + month (so Process/
  // Lock/Publish reflect reality after a page reload, not just the current
  // session). Keyed on payrollMonth too — without it, switching months kept
  // showing whichever run was most recently dated for the cycle, so an
  // already-published month could make a different, unprocessed month look
  // locked as well.
  useEffect(() => {
    // Clear the register table whenever the cycle or month changes —
    // prevents stale data from a previous filter appearing for the new selection.
    setFiltered(false);
    setActiveRunId(null);
    setActiveRunStatus('');
    if (!cycleId || !payrollMonth) return;
    apiClient.get('/payroll', { params: { cycleId, month: payrollMonth } }).then((res: any) => {
      const runs = res.data?.data || res.data || [];
      const latest = Array.isArray(runs) ? runs[0] : null;
      if (latest?.id) {
        setActiveRunId(latest.id);
        setActiveRunStatus(latest.status || '');
      }
    }).catch(() => { });
  }, [cycleId, payrollMonth]);

  // Selected cycle details & frequency detection
  const selectedCycleObj = (activeCycles || []).find((c: any) => String(c.id ?? c.uuid) === String(cycleId));
  const cycleFreq = (selectedCycleObj?.frequency || (selectedCycleObj as any)?.cycle_type || (selectedCycleObj as any)?.cycleType || 'Monthly').toString();
  const isWeekly = cycleFreq.toLowerCase().includes('week') && !cycleFreq.toLowerCase().includes('bi');
  const isBiWeekly = cycleFreq.toLowerCase().includes('bi-week') || cycleFreq.toLowerCase().includes('biweek');
  const isSemiMonthly = cycleFreq.toLowerCase().includes('semi') || cycleFreq.toLowerCase().includes('fortnight');

  const getSubPeriodOptions = () => {
    const [yearStr, monthStr] = (payrollMonth || '').split('-');
    const year = parseInt(yearStr || '2026', 10);
    const month = parseInt(monthStr || '3', 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });

    if (isWeekly) {
      return [
        { id: 'W1', label: `Week 1 (${monthName} 01 - ${monthName} 07)` },
        { id: 'W2', label: `Week 2 (${monthName} 08 - ${monthName} 14)` },
        { id: 'W3', label: `Week 3 (${monthName} 15 - ${monthName} 21)` },
        { id: 'W4', label: `Week 4 (${monthName} 22 - ${monthName} 28)` },
        { id: 'W5', label: `Week 5 (${monthName} 29 - ${monthName} ${daysInMonth})` },
      ];
    } else if (isBiWeekly) {
      return [
        { id: 'BW1', label: `Bi-Week 1 (${monthName} 01 - ${monthName} 14)` },
        { id: 'BW2', label: `Bi-Week 2 (${monthName} 15 - ${monthName} 28)` },
      ];
    } else if (isSemiMonthly) {
      return [
        { id: 'SM1', label: `1st Half (${monthName} 01 - ${monthName} 15)` },
        { id: 'SM2', label: `2nd Half (${monthName} 16 - ${monthName} ${daysInMonth})` },
      ];
    }
    return [];
  };

  const subPeriodOptions = getSubPeriodOptions();

  // Dynamic Cycle Cutoff & Remaining Days calculation
  const getCycleCutoffInfo = () => {
    const selectedCycleObj = activeCycles.find(
      (c: any) => String(c.id ?? c.uuid) === String(cycleId)
    ) || activeCycles[0];

    if (!selectedCycleObj) return null;

    const cutoffDay = Number(
      selectedCycleObj.cutoff_day ||
      selectedCycleObj.cutoffDay ||
      selectedCycleObj.cut_off_date ||
      28
    );
    const startDay = Number(
      selectedCycleObj.calculation_start_day ||
      selectedCycleObj.start_date ||
      1
    );

    const [yearStr, monthStr] = (payrollMonth || '').split('-');
    const year = parseInt(yearStr || '2026', 10);
    const month = parseInt(monthStr || '8', 10);
    const maxDaysInMonth = new Date(year, month, 0).getDate();
    const effectiveCutoffDay = Math.min(maxDaysInMonth, cutoffDay);

    const cutoffDate = new Date(year, month - 1, effectiveCutoffDay, 23, 59, 59);
    const now = new Date();

    const diffMs = cutoffDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
    const formattedCutoff = `${effectiveCutoffDay} ${monthName} ${year}`;
    const cycleName = selectedCycleObj.cycle_name || selectedCycleObj.name || 'Monthly';

    return {
      cycleName,
      cutoffDay: effectiveCutoffDay,
      startDay,
      formattedCutoff,
      diffDays,
      isPassed: diffDays < 0,
      isToday: diffDays === 0
    };
  };

  const cycleCutoffInfo = getCycleCutoffInfo();

  // Reset default subPeriod when cycle frequency changes
  useEffect(() => {
    if (subPeriodOptions.length > 0) {
      setSubPeriod(subPeriodOptions[0].id);
    }
  }, [cycleId, payrollMonth]);

  const buildParams = () => {
    const p: Record<string, string> = {};
    if (companyId) p.companyId = companyId;
    if (cycleId) p.cycleId = cycleId;
    if (payrollMonth) p.month = payrollMonth;
    if (subPeriodOptions.length > 0 && subPeriod) p.subPeriod = subPeriod;
    if (departmentId) p.departmentId = departmentId;
    if (locationId) p.locationId = locationId;
    if (payrollStatus) p.payrollStatus = payrollStatus;
    if (paymentMode) p.paymentMode = paymentMode;
    if (empStatus) p.status = empStatus;
    if (empType) p.employment_type = empType;
    if (gradeId) p.gradeId = gradeId;
    if (designationId) p.designationId = designationId;
    if (slabId) p.slabId = slabId;
    if (employeeId) p.employeeId = employeeId;
    if (reportingOfficerId) p.reportingOfficerId = reportingOfficerId;
    if (sortBy) p.sortBy = sortBy;
    if (bypassCache) p.bypassCache = 'true';
    return p;
  };

  // `filtered || true` always evaluated to true regardless of the filtered
  // state — the register silently auto-fetched on mount and on every
  // dropdown change even with no cycle/month selected, and kept showing
  // whatever it last loaded (react-query keeps stale data visible during a
  // background refetch) even when the current cycle/month selection was
  // invalid or hadn't been filtered yet.
  const [componentDefs, setComponentDefs] = useState<any[]>([]);
  // Derived from componentDefs — hoisted here so both the header row (<thead>)
  // and the data rows (<tbody>) can reference it without scope issues.
  const activeEarnings = (componentDefs || []).filter((c: any) => c.is_earning !== false);
  const activeDeductions = (componentDefs || []).filter((c: any) => c.is_earning === false);
  const [previewPayslipRow, setPreviewPayslipRow] = useState<any | null>(null);
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['process-register', companyId, cycleId, payrollMonth, subPeriod, departmentId, locationId, payrollStatus, paymentMode, empStatus, empType, gradeId, designationId, slabId, employeeId, reportingOfficerId, sortBy, bypassCache],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/process-register', { params: buildParams() });
      const payload = res.data || {};
      if (payload.component_definitions?.length) {
        setComponentDefs(payload.component_definitions);
      }
      return payload.data || payload || [];
    },
    // ── strict gate: NEVER auto-fetch on mount or filter-value change ─────────
    // Only fires when HR explicitly clicks the Filter button (setFiltered(true)).
    // cycleId and payrollMonth must also be set to avoid a useless empty request.
    enabled: filtered === true && !!cycleId && !!payrollMonth,
  });

  const handleStatusChange = async (rowId: number, newStatus: string) => {
    setPaymentStatusMap(prev => ({ ...prev, [rowId]: newStatus }));
    try {
      await apiClient.patch(`/payroll/run-employees/${rowId}`, { payment_status: newStatus });
      showToast.success('Saved ✅', `Payment status updated to ${newStatus}`);
    } catch {
      showToast.error('Failed', 'Could not update status.');
    }
  };

  const handleReset = () => {
    setGenerateOnMode('- Select -');
    setCycleId(cycles.length > 0 ? String(cycles[0].id) : '');
    setPayrollMonth(new Date().toISOString().slice(0, 7));
    setSortBy('Name');
    setPayrollStatus('');
    setPaymentMode('');
    setRemovePagination(true);
    setCompanyId('');
    setLocationId('');
    setDepartmentId('');
    setReportingOfficerId('');
    setEmpStatus('');
    setEmpType('');
    setGradeId('');
    setDesignationId('');
    setSlabId('');
    setEmployeeId('');
    setBypassCache(false);
    setFiltered(false);
  };

  const handleExportCSV = () => {
    const dataToExport = uniqueRows && uniqueRows.length > 0 ? uniqueRows : (employees && employees.length > 0 ? employees : []);
    if (dataToExport.length === 0) {
      showToast.error('No Data', 'No payroll register data available to export.');
      return;
    }

    const headers = [
      'Employee Code',
      'First Name',
      'Middle Name',
      'Last Name',
      'Designation',
      'Department',
      'Pay Slab',
      'Bank Name',
      'Account No',
      'Payment Status',
      'Salary Days',
      'Paid Days',
      'Unpaid Days',
      'Basic Monthly',
      'HRA Monthly',
      'Gross Monthly',
      'Total Deductions',
      'Net Take Home'
    ];

    const rows = dataToExport.map((emp: any) => {
      const computed = computeRowValues(emp);
      return [
        `"${computed.employee_code || `EMP-${computed.id}`}"`,
        `"${computed.first_name || '-'}"`,
        `"${computed.middle_name || '-'}"`,
        `"${computed.last_name || '-'}"`,
        `"${computed.designation || 'Employee'}"`,
        `"${computed.department_name || computed.department || 'General'}"`,
        `"${computed.slab_name || computed.slab || 'Standard Pay Slab'}"`,
        `"${computed.bank_name || 'N/A'}"`,
        `"=""${computed.account_number || computed.account_no || 'N/A'}"""`,
        `"${paymentStatusMap[computed.id] || computed.payment_status || 'Freeze'}"`,
        computed.salary_days || 30,
        computed.paid_days ?? 30,
        computed.unpaid_days ?? 0,
        computed.basic_earned ?? computed.basic ?? 0,
        computed.hra_earned ?? computed.hra ?? 0,
        computed.total_gross_earned ?? computed.gross_earned ?? computed.gross ?? 0,
        computed.total_deduction ?? 0,
        computed.net_salary ?? 0
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payroll_Register_${payrollMonth || 'Current'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success('Export Successful 🚀', 'Payroll Register exported to CSV file successfully.');
  };

  const selectedCompaniesCount = companyId ? 1 : 0;
  const selectedLocationsCount = locationId ? 1 : 0;
  const selectedDeptsCount = departmentId ? 1 : 0;
  const selectedOfficersCount = reportingOfficerId ? 1 : 0;
  const selectedStatusCount = empStatus ? 1 : 0;
  const selectedTypesCount = empType ? 1 : 0;
  const selectedGradesCount = gradeId ? 1 : 0;
  const selectedDesignationsCount = designationId ? 1 : 0;
  const selectedSlabsCount = slabId ? 1 : 0;
  const selectedEmpsCount = employeeId ? 1 : 0;

  // Filter employees for Reporting Officer dropdown to dynamically display Department Managers & Reporting Officers
  const reportingManagerIds = new Set(
    (employees as any[])
      .map(e => e.reporting_manager_id || e.reportingManagerId)
      .filter(Boolean)
      .map(id => String(id))
  );

  const managerKeywords = ['manager', 'lead', 'head', 'director', 'vp', 'cxo', 'supervisor', 'chief', 'officer', 'admin'];

  let reportingOfficersList = (employees as any[]).filter((e: any) => {
    const isDirectManager = reportingManagerIds.has(String(e.id));
    const title = (e.job_title || e.designation || e.role || '').toLowerCase();
    const isTitleManager = managerKeywords.some(kw => title.includes(kw));
    const isDeptManager = Boolean(e.is_manager || e.is_dept_head || e.is_reporting_officer);
    return isDirectManager || isTitleManager || isDeptManager;
  });

  // Fallback resilience: Ensure list is never empty if database has employees
  if (reportingOfficersList.length === 0) {
    reportingOfficersList = employees as any[];
  }



  const uniqueCompanies = deduplicate(companies as any[], c => String(c.id || c.name || c.company_name));
  const uniqueLocations = deduplicate(locations as any[], l => String(l.id || l.name));
  const uniqueDepartments = deduplicate(departments as any[], d => String(d.id || d.name));
  const uniqueGrades = deduplicate(grades as any[], g => String(g.id || g.name || g.grade_name));
  const uniqueDesignations = deduplicate(designations as any[], d => String(d.id || d.name || d.designation_name));
  const uniqueSlabs = deduplicate(slabs as any[], s => String(s.id || s.name || s.slab_name));
  const uniqueEmployees = deduplicate(employees as any[], e => String(e.id));
  const uniqueReportingOffs = deduplicate(reportingOfficersList, e => String(e.id));

  // Employee Status / Employment Type filters must only ever offer values that
  // genuinely exist on real employee records — a filter option that matches no
  // one (e.g. a hardcoded "Notice Period" when every record actually stores
  // "notice") silently returns zero rows. Derive both from the same live
  // `employees` data source Company/Location/Department already use, so the
  // literal value sent back to the server always exact-matches a real row.
  const uniqueEmployeeStatuses = deduplicate(
    (employees as any[]).map(e => e.status).filter(Boolean).map(v => ({ value: String(v) })),
    s => s.value
  );
  const uniqueEmploymentTypes = deduplicate(
    (employees as any[]).map(e => e.employment_type || e.employmentType).filter(Boolean).map(v => ({ value: String(v) })),
    t => t.value
  );
  const rawUniqueRows = deduplicate(rows as any[], r => String(r.id));
  const [tableSearch, setTableSearch] = useState('');
  const uniqueRows = tableSearch.trim()
    ? rawUniqueRows.filter((r: any) => {
        const query = tableSearch.toLowerCase();
        const fName = (r.first_name || r.firstName || '').toLowerCase();
        const lName = (r.last_name || r.lastName || '').toLowerCase();
        const code = (r.employee_code || r.employeeCode || `EMP-${r.id}`).toLowerCase();
        const desig = (r.designation_name || r.designation || '').toLowerCase();
        const slab = (r.slab_name || r.slab || '').toLowerCase();
        return fName.includes(query) || lName.includes(query) || `${fName} ${lName}`.includes(query) || code.includes(query) || desig.includes(query) || slab.includes(query);
      })
    : rawUniqueRows;

  const [isEditMode, setIsEditMode] = useState(false);
  const [editMap, setEditMap] = useState<Record<number, any>>({});
  const [savingRowsMap, setSavingRowsMap] = useState<Record<number, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Recalculates full financial and attendance breakdown for an employee row
  const computeRowValues = (baseRow: any, overrides: any = {}) => {
    const merged = { ...baseRow, ...(editMap[baseRow.id] || {}), ...overrides };

    const salaryDays = Number(merged.salary_days ?? 30);
    const paidDays = Math.min(salaryDays, Math.max(0, Number(merged.paid_days ?? salaryDays)));
    const unpaidDays = Math.max(0, salaryDays - paidDays);
    const ratio = salaryDays > 0 ? paidDays / salaryDays : 1;

    // Handle dynamic component values dictionary
    let dynamicComponentValues: Record<string, any> = {};
    if (merged.component_values && typeof merged.component_values === 'object') {
      dynamicComponentValues = { ...merged.component_values };
    }
    if (overrides.component_values) {
      dynamicComponentValues = { ...dynamicComponentValues, ...overrides.component_values };
    }

    // Prorate attendance-based dynamic components
    for (const [id, comp] of Object.entries<any>(dynamicComponentValues)) {
      if (comp && comp.category !== 'Deduction') {
        const monthly = Number(comp.monthly ?? comp.earned ?? 0);
        const earned = comp.based_on_attendance === false ? monthly : Math.round(monthly * ratio);
        dynamicComponentValues[id] = { ...comp, monthly, earned };
      }
    }

    const dynEarningComps = Object.values(dynamicComponentValues).filter((c: any) => c && c.category !== 'Deduction');
    const dynDeductionComps = Object.values(dynamicComponentValues).filter((c: any) => c && c.category === 'Deduction');

    const basic = Number(merged.basic ?? 0);
    const hra = Number(merged.hra ?? 0);
    const specialAllow = Number(merged.special_allowance ?? merged.special_allowance_monthly ?? merged.specialAllowance ?? 0);
    const stdAllow = Number(merged.standard_allowance ?? 0);
    const meal = Number(merged.meal_allowance ?? 0);
    const comm = Number(merged.communication_allowance ?? 0);
    const edu = Number(merged.children_education_allowance ?? 0);
    const lta = Number(merged.lta ?? 0);

    const gross = basic + hra + specialAllow + stdAllow + meal + comm + edu + lta;

    const basicEarned = Math.round(basic * ratio);
    const hraEarned = Math.round(hra * ratio);
    const specialEarned = Math.round(specialAllow * ratio);
    const stdEarned = Math.round(stdAllow * ratio);
    const mealEarned = Math.round(meal * ratio);
    const commEarned = Math.round(comm * ratio);
    const eduEarned = Math.round(edu * ratio);
    const ltaEarned = Math.round(lta * ratio);
    let grossEarned = basicEarned + hraEarned + specialEarned + stdEarned + mealEarned + commEarned + eduEarned + ltaEarned;

    if (dynEarningComps.length > 0) {
      const sumEarned = dynEarningComps.reduce((s: number, c: any) => s + Number(c.earned || 0), 0);
      if (sumEarned > 0) grossEarned = sumEarned;
    }

    const adjustment = Number(merged.adjustment ?? 0);
    const otHours = Number(merged.ot_hours ?? 0);
    const ot = Number(merged.ot ?? 0);
    const totalGrossEarned = grossEarned + adjustment + ot;

    const pt = Number(merged.pt ?? 0);
    const pf = Number(merged.pf ?? 0);
    const tds = Number(merged.tds ?? 0);
    const esic = Number(merged.esic ?? 0);
    const esicEmployer = Number(merged.esic_employer ?? 0);
    const loanDeduction = Number(merged.loan_deduction ?? baseRow.loan_deduction ?? baseRow.loanDeduction ?? 0);

    let totalDeduction = pt + pf + tds + esic + loanDeduction;
    if (dynDeductionComps.length > 0) {
      const sumDed = dynDeductionComps.reduce((s: number, c: any) => s + Number(c.earned ?? c.monthly ?? 0), 0);
      if (sumDed > 0) totalDeduction = sumDed + loanDeduction;
    }

    const netSalary = Math.max(0, totalGrossEarned - totalDeduction);
    // CTC = the fixed annual value set in the employee's salary structure.
    // Never recompute from gross × 12 — that inflates when employer contributions
    // (PF, ESIC) are included. Fall back to gross × 12 only if no CTC is stored.
    const ctc = Number(merged.ctc ?? merged.annual_ctc ?? 0) || Math.round(gross * 12);

    return {
      ...merged,
      salary_days: salaryDays,
      paid_days: paidDays,
      unpaid_days: unpaidDays,
      basic,
      hra,
      special_allowance: specialAllow,
      standard_allowance: stdAllow,
      meal_allowance: meal,
      communication_allowance: comm,
      children_education_allowance: edu,
      lta,
      gross,
      basic_earned: basicEarned,
      hra_earned: hraEarned,
      special_allowance_earned: specialEarned,
      standard_allowance_earned: stdEarned,
      meal_allowance_earned: mealEarned,
      communication_allowance_earned: commEarned,
      children_education_allowance_earned: eduEarned,
      lta_earned: ltaEarned,
      gross_earned: grossEarned,
      total_gross_earned: totalGrossEarned,
      adjustment,
      ot_hours: otHours,
      ot,
      pt,
      pf,
      tds,
      esic,
      esic_employer: esicEmployer,
      loan_deduction: loanDeduction,
      total_deduction: totalDeduction,
      net_salary: netSalary,
      ctc,
      component_values: dynamicComponentValues,
      payment_status: merged.payment_status || 'Freeze',
      notes: merged.notes || '',
      isDirty: true
    };
  };

  const handleFieldChange = (row: any, field: string, value: any) => {
    const updated = computeRowValues(row, { [field]: value });
    setEditMap(prev => ({ ...prev, [row.id]: updated }));
  };

  const handleSaveRow = async (row: any) => {
    const dataToSave = computeRowValues(row);
    setSavingRowsMap(prev => ({ ...prev, [row.id]: true }));
    try {
      await apiClient.post('/payroll/process-register/override', {
        employee_id: row.id,
        month: payrollMonth,
        cycle_id: cycleId ? Number(cycleId) : null,
        ...dataToSave
      });
      showToast.success('Saved! 💾', `Updated payroll calculation for ${row.first_name || row.firstName || 'Employee'}.`);
      setEditMap(prev => {
        const next = { ...prev };
        if (next[row.id]) next[row.id] = { ...next[row.id], isDirty: false };
        return next;
      });
      refetch();
    } catch (err: any) {
      showToast.error('Save Failed', err?.response?.data?.message || 'Could not save payroll row.');
    } finally {
      setSavingRowsMap(prev => ({ ...prev, [row.id]: false }));
    }
  };

  const handleSaveAllRows = async () => {
    const dirtyIds = Object.keys(editMap).map(Number);
    if (dirtyIds.length === 0) {
      showToast.info('No Changes', 'No edits to save.');
      return;
    }

    setIsSavingAll(true);
    let successCount = 0;
    try {
      for (const id of dirtyIds) {
        const rowData = editMap[id];
        if (rowData) {
          await apiClient.post('/payroll/process-register/override', {
            employee_id: id,
            month: payrollMonth,
            cycle_id: cycleId ? Number(cycleId) : null,
            ...rowData
          });
          successCount++;
        }
      }
      showToast.success('All Changes Saved! 🎉', `Updated ${successCount} employee payroll rows in database.`);
      setEditMap({});
      refetch();
    } catch (err: any) {
      showToast.error('Save Incomplete', err?.response?.data?.message || 'Some rows could not be saved.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleResetRowToMaster = async (row: any) => {
    try {
      await apiClient.post('/payroll/process-register/reset-override', {
        employee_id: row.id,
        month: payrollMonth
      });
      setEditMap(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      showToast.success('Re-synced with Master 🔄', `Reset ${row.first_name || 'Employee'} back to contractual Salary Structure.`);
      refetch();
    } catch (err: any) {
      showToast.error('Reset Failed', err?.response?.data?.message || 'Could not reset employee row');
    }
  };

  const handleResetAllRowsToMaster = async () => {
    try {
      await apiClient.post('/payroll/process-register/reset-override', {
        month: payrollMonth
      });
      setEditMap({});
      showToast.success('Register Reset 🔄', 'All employee rows restored to Master Salary Structures.');
      refetch();
    } catch (err: any) {
      showToast.error('Reset Failed', err?.response?.data?.message || 'Could not reset register');
    }
  };

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isApprovingRun, setIsApprovingRun] = useState(false);

  // Checkbox helpers
  const toggleSelectAll = (allRows: any[]) => {
    if (selectedRowIds.size === allRows.length && allRows.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(allRows.map((r: any) => r.id)));
    }
  };

  const toggleSelectRow = (rowId: number) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleSaveSelectedRows = async (rowsToSave: any[]) => {
    if (selectedRowIds.size === 0) {
      showToast.info('No Selection', 'Please check at least one employee checkbox first.');
      return;
    }

    setIsSavingAll(true);
    let count = 0;
    try {
      for (const r of rowsToSave) {
        if (selectedRowIds.has(r.id)) {
          const rowData = editMap[r.id];
          if (rowData) {
            await apiClient.post('/payroll/process-register/override', {
              employee_id: r.id,
              month: payrollMonth,
              cycle_id: cycleId ? Number(cycleId) : null,
              ...rowData
            });
            count++;
          }
        }
      }
      showToast.success('Saved Selected Rows! 🎉', `Saved overrides for ${count > 0 ? count : selectedRowIds.size} selected employee(s).`);
      refetch();
    } catch (err: any) {
      showToast.error('Save Incomplete', err?.response?.data?.message || 'Could not save some selected rows.');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Step 1 — Generate the run for this cycle and calculate every employee's salary.
  const handleProcessPayroll = async () => {
    if (!cycleId) {
      showToast.error('Missing Cycle', 'Please select a Payroll Cycle before processing.');
      return;
    }
    if (!payrollMonth) {
      showToast.error('Missing Month', 'Please select a Month / Period before processing.');
      return;
    }
    if (selectedRowIds.size === 0) {
      showToast.error('No Employees Selected', 'Please select at least one employee using the checkboxes (or click the table header checkbox to Select All) before clicking Process Payroll.');
      return;
    }
    setIsProcessingPayroll(true);
    try {
      // 1. Auto-save overrides for selected employees if any edits exist
      if (selectedRowIds.size > 0) {
        for (const empId of selectedRowIds) {
          const rowData = editMap[empId];
          if (rowData) {
            await apiClient.post('/payroll/process-register/override', {
              employee_id: empId,
              month: payrollMonth,
              cycle_id: cycleId ? Number(cycleId) : null,
              ...rowData
            }).catch(() => {});
          }
        }
      }

      const activeCompId = companyId || selectedCompanyId;
      const targetEmployeeIds = selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined;
      const effectiveCycleId = cycleId || (activeCycles.length > 0 ? String(activeCycles[0].id ?? activeCycles[0].uuid ?? '') : '');
      if (!effectiveCycleId) {
        showToast.error('Missing Cycle', 'Please select a Payroll Cycle before processing.');
        return;
      }

      // 2. Generate the run (only if no existing run)
      const genRes = await apiClient.post('/payroll', {
        payrollCycleId: Number(effectiveCycleId),
        runType: 'regular',
        month: payrollMonth,
        companyId: activeCompId ? Number(activeCompId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        employeeIds: targetEmployeeIds,
      });

      const run = genRes.data?.data;
      if (!run?.id) {
        throw new Error('Failed to initialize payroll run');
      }

      // 3. Process the newly created run
      const processRes = await apiClient.post(`/payroll/${run.id}/process`);
      const processedRun = processRes.data?.data;
      const errorCount = Number(processedRun?.error_count ?? processedRun?.errorCount ?? 0);

      setActiveRunId(run.id);
      setActiveRunStatus(processedRun?.status || 'calculated');

      if (errorCount > 0) {
        showToast.warning('Payroll Processed with Errors ⚠️', `${errorCount} employee(s) failed to process — see the register for details.`);
      } else {
        const countMsg = targetEmployeeIds ? `for ${targetEmployeeIds.length} selected employee(s)` : 'for all employees';
        showToast.success('Payroll Processed ✅', `Salaries calculated ${countMsg}. Review the register, then lock the figures.`);
      }
      refetch();
    } catch (err: any) {
      showToast.error('Process Failed', err?.response?.data?.message || err?.message || 'Could not process payroll');
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  // Step 2 — Freeze the calculated figures so no further edits/reprocessing can change them.
  const handleLockPayroll = async () => {
    if (!activeRunId) return;
    setIsLocking(true);
    try {
      await apiClient.post(`/payroll/${activeRunId}/lock`);
      setActiveRunStatus('locked');
      showToast.success('Payroll Locked 🔒', 'Figures are frozen. Approval request sent to Executive/CEO.');
      refetch();
    } catch (err: any) {
      showToast.error('Lock Failed', err?.response?.data?.message || err?.message || 'Could not lock payroll');
    } finally {
      setIsLocking(false);
    }
  };

  // Step 2b — Unlock payroll run back to draft so HR can make corrections.
  const [isUnlocking, setIsUnlocking] = useState(false);
  const handleUnlockPayroll = async () => {
    if (!activeRunId) {
      showToast.error('Missing Run', 'No active payroll run to unlock.');
      return;
    }
    const reason = window.prompt(
      'Enter reason for unlocking payroll (e.g., Attendance corrections, salary structure adjustments):',
      'Corrections needed before approval'
    );
    if (!reason || !reason.trim()) return;
    setIsUnlocking(true);
    try {
      await apiClient.post(`/payroll/${activeRunId}/unlock`, { reason: reason.trim() });
      setActiveRunStatus('draft');
      showToast.success('Payroll Unlocked 🔓', `Run #${activeRunId} reverted to Draft for adjustments.`);
      refetch();
    } catch (err: any) {
      showToast.error('Unlock Failed', err?.response?.data?.message || err?.message || 'Could not unlock payroll run.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Step 3 — Executive / CEO Approval. Only allowed after Lock.
  const handleApprovePayroll = async () => {
    if (!activeRunId) {
      showToast.error('Missing Run', 'Please process and lock payroll first.');
      return;
    }
    if (activeRunStatus !== 'locked') {
      showToast.warning(
        'Lock First',
        `Payroll must be locked before approval. Current status: "${activeRunStatus}". Click "Lock Figures" first.`
      );
      return;
    }
    setIsApprovingRun(true);
    try {
      await apiClient.post(`/payroll/${activeRunId}/approve`);
      setActiveRunStatus('approved');
      showToast.success('Payroll Approved 🎉', `Run #${activeRunId} approved! HR notified to publish payslips.`);
      refetch();
    } catch (err: any) {
      showToast.error('Approval Failed', err?.response?.data?.message || 'Could not approve payroll');
    } finally {
      setIsApprovingRun(false);
    }
  };

  // Step 4 — Release payslips to employees. Only allowed once the run is approved.
  const handlePublishPayslips = async () => {
    if (!activeRunId) return;
    if (activeRunStatus !== 'approved') {
      showToast.warning(
        'Approval Required',
        `Payroll must be approved by CEO before publishing. Current status: "${activeRunStatus}".`
      );
      return;
    }
    setIsPublishing(true);
    try {
      await apiClient.post(`/payroll/${activeRunId}/publish`);
      setActiveRunStatus('published');
      showToast.success('Payslips Published 🚀', 'Payslips are now visible to employees.');
      refetch();
    } catch (err: any) {
      showToast.error('Publish Failed', err?.response?.data?.message || err?.message || 'Could not publish payslips');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Outer Card Container */}
      <div className="border border-border/80 rounded-xl bg-card p-5 shadow-sm space-y-4">
        {/* Top Header Row with Link & Icons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-sm font-bold text-foreground">Process Payroll Filters</h2>
            {cycleCutoffInfo && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors shadow-2xs ${
                cycleCutoffInfo.isPassed
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : cycleCutoffInfo.isToday
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                  : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {cycleCutoffInfo.isPassed
                    ? `Cutoff Passed: ${cycleCutoffInfo.formattedCutoff}`
                    : cycleCutoffInfo.isToday
                    ? `Cutoff Today (${cycleCutoffInfo.formattedCutoff})`
                    : `${cycleCutoffInfo.diffDays} Days Remaining (Cutoff: ${cycleCutoffInfo.formattedCutoff})`}
                </span>
                <span className="text-[10px] font-semibold opacity-75 border-l border-current/25 pl-1.5 ml-0.5">
                  Cycle Days: {cycleCutoffInfo.startDay} - {cycleCutoffInfo.cutoffDay}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <button className="p-1 hover:bg-muted rounded text-foreground"><Expand className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-foreground"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Core Primary Filters Grid (4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Payroll Cycle */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Payroll Cycle <span className="text-rose-500">*</span>
            </label>
            <select
              value={cycleId}
              onChange={e => setCycleId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">- Select Cycle ({activeCycles.length}) -</option>
              {activeCycles.map((c: any, index: number) => {
                const cid = String(c.id ?? c.uuid ?? index + 1);
                const cname = c.cycleName || c.cycle_name || c.name || 'Standard Monthly Cycle';
                return (
                  <option key={`cycle_${cid}_${index}`} value={cid}>
                    {cname}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Month / Period */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1 flex items-center justify-between">
              <span>Month / Period <span className="text-rose-500">*</span></span>
              {isWeekly && <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 px-1 rounded border border-indigo-200">Weekly</span>}
              {isBiWeekly && <span className="text-[9px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950 px-1 rounded border border-purple-200">Bi-Weekly</span>}
              {isSemiMonthly && <span className="text-[9px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950 px-1 rounded border border-teal-200">Semi-Monthly</span>}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={payrollMonth}
                onChange={e => setPayrollMonth(e.target.value)}
                className="w-full h-9 border border-input rounded-lg px-2.5 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {subPeriodOptions.length > 0 && (
                <select
                  value={subPeriod}
                  onChange={e => setSubPeriod(e.target.value)}
                  className="w-full h-9 border border-indigo-300 dark:border-indigo-800 rounded-lg px-2 text-xs bg-indigo-50/70 dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  {subPeriodOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Generate Payroll On */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Generate Payroll On <span className="text-rose-500">*</span>
            </label>
            <select
              value={generateOnMode}
              onChange={e => setGenerateOnMode(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="- Select -">- Select -</option>
              <option value="Attendance">Attendance</option>
              <option value="Active for selected period">Active for selected period</option>
              <option value="Last Working day in selected period">Last Working day in period</option>
              <option value="Active User Except whose last working day is in selected period">Active (excl. last working day)</option>
            </select>
          </div>

          {/* Payroll Status */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Payroll Status</label>
            <select
              value={payrollStatus}
              onChange={e => setPayrollStatus(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">Choose Status</option>
              <option value="Freeze">Freeze</option>
              <option value="Unfreeze">Unfreeze</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters Grid (4 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Company */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Company
              {selectedCompanyId && (
                <span className="ml-1 text-[10px] text-amber-600 font-bold">(Locked)</span>
              )}
            </label>
            {selectedCompanyId ? (
              <div className="w-full h-9 border border-amber-300 dark:border-amber-700 rounded-lg px-3 text-xs bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                {uniqueCompanies.find((c: any) => String(c.id) === String(selectedCompanyId))?.name ||
                  uniqueCompanies.find((c: any) => String(c.company_id) === String(selectedCompanyId))?.name ||
                  'My Company'}
              </div>
            ) : (
              <select
                value={companyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              >
                <option value="">All Companies ({uniqueCompanies.length})▾</option>
                {uniqueCompanies.map((c: any, idx: number) => (
                  <option key={`comp_${c.id ?? idx}`} value={String(c.id)}>{c.name || c.company_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Department</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Departments ({uniqueDepartments.length})▾</option>
              {uniqueDepartments.map((d: any, idx: number) => (
                <option key={`dept_${d.id ?? idx}`} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Location</label>
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Locations ({uniqueLocations.length})▾</option>
              {uniqueLocations.map((l: any, idx: number) => (
                <option key={`loc_${l.id ?? idx}`} value={String(l.id)}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Pay Slab */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Pay Slab</label>
            <select
              value={slabId}
              onChange={e => setSlabId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Pay Slabs ({uniqueSlabs.length})▾</option>
              {uniqueSlabs.map((s: any, idx: number) => (
                <option key={`slab_${s.id ?? idx}`} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Designation</label>
            <select
              value={designationId}
              onChange={e => setDesignationId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Designations ({uniqueDesignations.length})▾</option>
              {uniqueDesignations.map((d: any, idx: number) => (
                <option key={`desig_${d.id ?? idx}`} value={String(d.id)}>{d.name || d.designation_name || d.title}</option>
              ))}
            </select>
          </div>

          {/* Reporting Officer */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Reporting Officer</label>
            <select
              value={reportingOfficerId}
              onChange={e => setReportingOfficerId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Officers ({uniqueReportingOffs.length})▾</option>
              {uniqueReportingOffs.map((e: any, idx: number) => (
                <option key={`off_${e.id ?? idx}`} value={String(e.id)}>
                  {(e.firstName || e.first_name || e.name || 'Officer')} {(e.lastName || e.last_name || '')} {e.jobTitle || e.job_title || e.designation ? `(${e.jobTitle || e.job_title || e.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Status */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Employee Status</label>
            <select
              value={empStatus}
              onChange={e => setEmpStatus(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Statuses ({uniqueEmployeeStatuses.length})▾</option>
              {uniqueEmployeeStatuses.map((s: any) => (
                <option key={s.value} value={s.value}>{titleCaseLabel(s.value)}</option>
              ))}
            </select>
          </div>

          {/* Employee (Individual Select) */}
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">Employee (Individual)</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full h-9 border border-input rounded-lg px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              <option value="">All Employees ({uniqueEmployees.length} total)▾</option>
              {uniqueEmployees.map((e: any, idx: number) => (
                <option key={`emp_${e.id ?? idx}`} value={String(e.id)}>
                  {(e.firstName || e.first_name || e.name || 'Employee')} {(e.lastName || e.last_name || '')} ({e.employeeCode || e.employee_code || `EMP-${e.id}`})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls & Workflow Pipeline Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-border/60">
          {/* Left: Filter Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!cycleId) {
                  showToast.error('Payroll Cycle Required', 'Please select a Payroll Cycle from the dropdown above before filtering.');
                  return;
                }
                if (!payrollMonth) {
                  showToast.error('Month Required', 'Please select a Month / Period before filtering.');
                  return;
                }
                setFiltered(true);
                refetch();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>

            <button
              onClick={handleReset}
              className="px-3.5 py-2 border border-border/80 bg-background/80 hover:bg-muted/80 active:scale-95 text-foreground text-xs font-medium rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Right: Smart Payroll Pipeline — stepper + single active action */}
          <div className="flex flex-col gap-2.5 items-end">
            {/* Horizontal stepper progress track */}
            <div className="flex items-center gap-0">
              {[
                { label: 'Calculate', status: 'calculated', activeStatus: ['calculated','locked','approved','published'], icon: CheckCircle2, color: 'emerald' },
                { label: 'Lock', status: 'locked', activeStatus: ['locked','approved','published'], icon: Lock, color: 'indigo' },
                { label: 'Approve', status: 'approved', activeStatus: ['approved','published'], icon: CheckCheck, color: 'violet' },
                { label: 'Publish', status: 'published', activeStatus: ['published'], icon: Send, color: 'sky' },
              ].map((step, idx, arr) => {
                const isDone = step.activeStatus.includes(activeRunStatus);
                const isActive = !isDone && (
                  (idx === 0 && !activeRunStatus) ||
                  (idx === 0 && !['calculated','locked','approved','published'].includes(activeRunStatus)) ||
                  (idx === 1 && activeRunStatus === 'calculated') ||
                  (idx === 2 && activeRunStatus === 'locked') ||
                  (idx === 3 && activeRunStatus === 'approved')
                );
                const colorMap: Record<string, string> = {
                  emerald: 'bg-emerald-600 text-white border-emerald-600',
                  indigo:  'bg-indigo-600 text-white border-indigo-600',
                  violet:  'bg-violet-600 text-white border-violet-600',
                  sky:     'bg-sky-600 text-white border-sky-600',
                };
                const activeRing: Record<string, string> = {
                  emerald: 'ring-2 ring-emerald-400/50',
                  indigo:  'ring-2 ring-indigo-400/50',
                  violet:  'ring-2 ring-violet-400/50',
                  sky:     'ring-2 ring-sky-400/50',
                };
                const StepIcon = step.icon;
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        isDone ? colorMap[step.color] :
                        isActive ? `${colorMap[step.color]} ${activeRing[step.color]} animate-pulse` :
                        'bg-muted border-border text-muted-foreground'
                      }`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[9px] font-bold whitespace-nowrap ${isDone ? `text-${step.color}-600 dark:text-${step.color}-400` : isActive ? `text-${step.color}-600` : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`w-8 h-0.5 mb-3 mx-0.5 transition-all ${step.activeStatus.includes(activeRunStatus) ? 'bg-primary/60' : 'bg-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Single smart action button */}
            <div className="flex items-center gap-2">
              {activeRunStatus && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                  activeRunStatus === 'published' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' :
                  activeRunStatus === 'approved'  ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20' :
                  activeRunStatus === 'locked'    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' :
                  activeRunStatus === 'calculated' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' :
                  'bg-muted/80 text-muted-foreground border-border'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  Run #{activeRunId} · {activeRunStatus.toUpperCase()}
                </span>
              )}

              {/* Current step actions */}
              {activeRunStatus === 'published' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Payslips Published ✓
                  </span>
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.pathname = '/payroll/payslips';
                      window.location.href = url.toString();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-lg cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> View All Payslips
                  </button>
                </div>
              ) : activeRunStatus === 'approved' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePublishPayslips}
                    disabled={isPublishing}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {isPublishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {isPublishing ? 'Publishing...' : 'Publish Payslips'}
                  </button>
                  <button
                    onClick={handleUnlockPayroll}
                    disabled={isUnlocking}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold rounded-lg cursor-pointer"
                    title="Unlock to revert approval and make corrections"
                  >
                    {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Unlock & Edit
                  </button>
                </div>
              ) : activeRunStatus === 'locked' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprovePayroll}
                    disabled={isApprovingRun}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {isApprovingRun ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {isApprovingRun ? 'Approving...' : 'Approve Payroll'}
                  </button>
                  <button
                    onClick={handleUnlockPayroll}
                    disabled={isUnlocking}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold rounded-lg cursor-pointer"
                    title="Unlock figures to modify attendance or register data"
                  >
                    {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Unlock Figures
                  </button>
                </div>
              ) : activeRunStatus === 'calculated' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLockPayroll}
                    disabled={isLocking}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {isLocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    {isLocking ? 'Locking...' : 'Lock Figures'}
                  </button>
                  <button
                    onClick={handleProcessPayroll}
                    disabled={isProcessingPayroll}
                    className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="Re-run calculation with latest attendance and overrides"
                  >
                    {isProcessingPayroll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Re-Calculate
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleProcessPayroll}
                  disabled={isProcessingPayroll}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {isProcessingPayroll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isProcessingPayroll
                    ? 'Processing...'
                    : selectedRowIds.size > 0
                    ? `Process Payroll (${selectedRowIds.size})`
                    : 'Process Payroll'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Run Health & Metrics KPI Ribbon */}
      {filtered && rawUniqueRows.length > 0 && (() => {
        const totalGrossAll = uniqueRows.reduce((s: number, r: any) => s + Number(r.gross || r.gross_monthly || 0), 0);
        const totalNetAll = uniqueRows.reduce((s: number, r: any) => s + Number(r.net_salary || (Number(r.gross || 0) - Number(r.total_deductions || 2000))), 0);
        const totalDedAll = uniqueRows.reduce((s: number, r: any) => s + Number(r.total_deduction || r.total_deductions || 0), 0);
        const totalLopCount = uniqueRows.filter((r: any) => Number(r.unpaid_days || 0) > 0).length;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 bg-card/90 backdrop-blur-xs border border-border/80 hover:border-border rounded-xl shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Enrolled Roster</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">{uniqueRows.length} Staff</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">100% Slabs Mapped</span>
            </div>
            <div className="p-3.5 bg-card/90 backdrop-blur-xs border border-border/80 hover:border-border rounded-xl shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Total Gross Outlay</span>
              <span className="text-base font-bold text-foreground mt-0.5 block truncate">₹{Math.round(totalGrossAll).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">Base Monthly Wage</span>
            </div>
            <div className="p-3.5 bg-card/90 backdrop-blur-xs border border-border/80 hover:border-border rounded-xl shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Net Bank Disbursal</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">₹{Math.round(totalNetAll).toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-muted-foreground font-medium block mt-0.5 truncate">After ₹{Math.round(totalDedAll).toLocaleString('en-IN')} Deductions</span>
            </div>
            <div className="p-3.5 bg-card/90 backdrop-blur-xs border border-border/80 hover:border-border rounded-xl shadow-2xs transition-all">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Attendance & LOP</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">{totalLopCount > 0 ? `${totalLopCount} with LOP` : 'Full Attendance'}</span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">Synced via Biometric</span>
            </div>
          </div>
        );
      })()}

      {/* Register Table - Directly Editable */}
      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>
                Payroll Register
                {filtered
                  ? ` (${uniqueRows.length} of ${rawUniqueRows.length} Employees)`
                  : ''}
                {' '}&mdash; Directly Editable
              </span>
              {!filtered && (
                <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  ⚠ Select Cycle &amp; Month, then click Filter to load employees
                </span>
              )}
              {['locked', 'approved', 'published'].includes(activeRunStatus) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked (Read-Only)
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {filtered && rawUniqueRows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleResetAllRowsToMaster}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-muted text-foreground border border-border/80 text-xs font-medium rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Reset all manual row overrides back to Contractual Master Salary Structures"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" /> Re-sync All
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
                  title="Export Payroll Register to CSV file"
                >
                  <Download className="w-3.5 h-3.5" /> Export (CSV)
                </button>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Quick search employee..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-52 font-normal placeholder:text-muted-foreground/60 shadow-2xs"
                  />
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}

            <span className="text-[11px] text-muted-foreground font-normal">
              {['locked', 'approved', 'published'].includes(activeRunStatus)
                ? 'Figures are frozen for approval. Unlock to make edits.'
                : 'Select checkboxes to edit and save rows • Auto-recalculates & saves'}
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-xs text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading register...
          </div>
        ) : !filtered ? (
          <div className="flex flex-col items-center justify-center h-44 gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-50 border-2 border-sky-200 flex items-center justify-center">
              <Filter className="w-5 h-5 text-sky-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No data loaded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select a <strong>Payroll Cycle</strong> and <strong>Month</strong>, then click the <strong>Filter</strong> button to load the employee register.
              </p>
            </div>
          </div>
        ) : uniqueRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 gap-2 text-center px-6">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">No employees found for these filters</p>
            <p className="text-xs text-muted-foreground">
              Check that employees have an active salary structure assigned, attendance is locked for this month, and the selected Payroll Cycle is correct.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="px-3 py-2 text-center sticky left-0 bg-muted/90 z-20 border-r border-border/60">
                    <input
                      type="checkbox"
                      checked={uniqueRows.length > 0 && uniqueRows.every((r: any) => selectedRowIds.has(r.id))}
                      onChange={() => toggleSelectAll(uniqueRows)}
                      className="rounded accent-primary w-4 h-4 cursor-pointer"
                      title="Select / Deselect All Rows"
                    />
                  </th>
                  {(() => {
                    const masterHeaders = activeEarnings.length > 0
                      ? [...activeEarnings.map((c: any) => c.name), 'Gross']
                      : ['Basic', 'HRA', 'Conveyance Allowance', 'Medical Allowance', 'Special Allowance', 'Gross'];
                    const earnedHeaders = activeEarnings.length > 0
                      ? [...activeEarnings.map((c: any) => `${c.name} Earned`), 'Gross Earned', 'Total Gross Earned']
                      : ['Basic Earned', 'HRA Earned', 'Conveyance Earned', 'Medical Earned', 'Special Allowance Earned', 'Gross Earned', 'Total Gross Earned'];

                    const deductionHeaders = activeDeductions.length > 0
                      ? activeDeductions.map((c: any) => c.name)
                      : ['PT', 'PF', 'TDS', 'ESIC'];

                    const allHeaders = [
                      'Action', 'Payment Status', 'First Name', 'Middle Name', 'Last Name', 'Designation', 'Pay Slab', 'Bank Name',
                      'Salary Days', 'Paid Days', 'Unpaid Days',
                      ...masterHeaders,
                      ...earnedHeaders,
                      'Adjustment', 'OT Hour', 'OT',
                      ...deductionHeaders,
                      'ESIC Employer',
                      'Total Deduction', 'Net Salary', 'CTC', 'Notes'
                    ];

                    return allHeaders.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-muted-foreground uppercase text-[10px] whitespace-nowrap">{h}</th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {uniqueRows.map((r: any) => {
                  // Prefer live edits from editMap (set by handleFieldChange) so that
                  // changing Paid Days, Adjustment, OT etc. instantly recalculates all
                  // earned columns, deductions and Net Salary without a page refresh.
                  // Falls back to fresh compute from server data for unedited rows.
                  const curr = editMap[r.id] ?? computeRowValues(r);
                  const isChecked = selectedRowIds.has(r.id);
                  const isFrozen = ['locked', 'approved', 'published'].includes(activeRunStatus);

                  return (
                    <tr key={r.id} className={`transition-colors ${isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'}`}>
                      {/* Row Checkbox */}
                      <td className="px-3 py-2.5 text-center sticky left-0 bg-card z-10 border-r border-border/50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(r.id)}
                          className="rounded accent-primary w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap border-r border-border/50">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedViewItem(curr)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] rounded transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shadow-2xs"
                            title="View / Edit Breakdown Modal"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => openAttendanceCalendar(r)}
                            className="p-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 rounded transition-colors cursor-pointer border border-amber-200 dark:border-amber-800 shadow-2xs"
                            title="View Attendance Calendar"
                          >
                            <CalendarDays className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleResetRowToMaster(r)}
                            className="p-1 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 rounded transition-colors cursor-pointer border border-sky-200 dark:border-sky-800 shadow-2xs"
                            title="Re-sync row with Contractual Master Salary Structure"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setPreviewPayslipRow(curr)}
                            className="p-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 rounded transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                            title="Preview Payslip for this Employee"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={curr.payment_status || 'Freeze'}
                          disabled={isFrozen}
                          onChange={e => {
                            handleFieldChange(r, 'payment_status', e.target.value);
                            handleSaveRow(r);
                          }}
                          className="h-7 px-2 border border-border rounded-md text-[11px] font-semibold bg-background cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          <option value="Freeze">Freeze</option>
                          <option value="Unfreeze">Unfreeze</option>
                          <option value="Hold">Hold</option>
                          <option value="Release">Release</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.first_name || r.firstName || '-'}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.middle_name || r.middleName || '-'}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.last_name || r.lastName || '-'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.designation || r.job_title || '-'}</td>
                      <td className="px-3 py-2.5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{r.slab_name || r.slabName || 'Standard Pay Slab'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.bank_name || '-'}</td>

                      {/* Salary Days (Standard month days) */}
                      <td className="px-3 py-2.5 text-center font-medium text-muted-foreground">{curr.salary_days}</td>

                      {/* Paid Days - EDITABLE */}
                      <td className="px-1.5 py-2 text-center">
                        <input
                          type="number"
                          value={curr.paid_days}
                          disabled={isFrozen}
                          onChange={e => handleFieldChange(r, 'paid_days', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-14 h-7 text-center border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 rounded px-1 text-xs font-bold bg-emerald-50/20 dark:bg-emerald-950/20 shadow-2xs focus:border-emerald-600 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Unpaid Days (Computed) */}
                      <td className="px-3 py-2.5 text-center font-bold text-rose-600">{curr.unpaid_days}</td>

                      {/* Master Pay Slab Components (Dynamic from Component Definitions) */}
                      {activeEarnings.length > 0 ? (
                        activeEarnings.map((c: any) => {
                          const val = r.component_values?.[c.id]?.monthly ?? (
                            c.name.toLowerCase().includes('basic') ? curr.basic :
                            c.name.toLowerCase().includes('hra') ? curr.hra :
                            c.name.toLowerCase().includes('special') ? curr.special_allowance : 0
                          );
                          return <td key={`m_${c.id}`} className="px-3 py-2.5 text-right">{fmt(val)}</td>;
                        })
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-right">{fmt(curr.basic)}</td>
                          <td className="px-3 py-2.5 text-right">{fmt(curr.hra)}</td>
                          <td className="px-3 py-2.5 text-right">{fmt(curr.special_allowance)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(curr.gross)}</td>

                      {/* Earned Components (Computed based on Paid Days) */}
                      {activeEarnings.length > 0 ? (
                        activeEarnings.map((c: any) => {
                          const ratio = (curr.salary_days || 30) > 0 ? (curr.paid_days / (curr.salary_days || 30)) : 1;
                          const val = r.component_values?.[c.id]?.earned ?? Math.round((
                            r.component_values?.[c.id]?.monthly ?? (
                              c.name.toLowerCase().includes('basic') ? curr.basic :
                              c.name.toLowerCase().includes('hra') ? curr.hra :
                              c.name.toLowerCase().includes('special') ? curr.special_allowance : 0
                            )
                          ) * ratio);
                          return <td key={`e_${c.id}`} className="px-3 py-2.5 text-right font-semibold">{fmt(val)}</td>;
                        })
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.basic_earned)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.hra_earned)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.special_allowance_earned)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(curr.gross_earned)}</td>
                      <td className="px-3 py-2.5 text-right font-black bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">{fmt(curr.total_gross_earned)}</td>

                      {/* Adjustment - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.adjustment}
                          disabled={isFrozen}
                          onChange={e => handleFieldChange(r, 'adjustment', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-border/80 focus:border-primary rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* OT Hours - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.ot_hours}
                          disabled={isFrozen}
                          onChange={e => handleFieldChange(r, 'ot_hours', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-14 h-7 text-right border border-border/80 focus:border-primary rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* OT Amount - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.ot}
                          disabled={isFrozen}
                          onChange={e => handleFieldChange(r, 'ot', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-emerald-300 text-emerald-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Dynamic Deductions from Component Master */}
                      {activeDeductions.length > 0 ? (
                        activeDeductions.map((c: any) => {
                          const val = curr.component_values?.[c.id]?.earned ?? curr.component_values?.[c.id]?.monthly ?? (
                            c.name.toLowerCase().includes('pf') ? curr.pf :
                            c.name.toLowerCase().includes('pt') ? curr.pt :
                            c.name.toLowerCase().includes('esic') ? curr.esic :
                            c.name.toLowerCase().includes('tds') ? curr.tds : 0
                          );
                          return (
                            <td key={`d_${c.id}`} className="px-1.5 py-2 text-right">
                              <input
                                type="number"
                                value={val}
                                disabled={isFrozen}
                                onChange={e => {
                                  const num = Number(e.target.value);
                                  const updatedCompVals = {
                                    ...(curr.component_values || {}),
                                    [c.id]: {
                                      ...(curr.component_values?.[c.id] || {}),
                                      id: c.id,
                                      name: c.name,
                                      category: 'Deduction',
                                      earned: num,
                                      monthly: num,
                                    }
                                  };
                                  handleFieldChange(r, 'component_values', updatedCompVals);
                                  if (c.name.toLowerCase().includes('pf')) handleFieldChange(r, 'pf', num);
                                  else if (c.name.toLowerCase().includes('pt')) handleFieldChange(r, 'pt', num);
                                  else if (c.name.toLowerCase().includes('esic')) handleFieldChange(r, 'esic', num);
                                  else if (c.name.toLowerCase().includes('tds')) handleFieldChange(r, 'tds', num);
                                }}
                                onBlur={() => handleSaveRow(r)}
                                className="w-16 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })
                      ) : (
                        <>
                          {/* PT - EDITABLE */}
                          <td className="px-1.5 py-2 text-right">
                            <input
                              type="number"
                              value={curr.pt}
                              disabled={isFrozen}
                              onChange={e => handleFieldChange(r, 'pt', e.target.value)}
                              onBlur={() => handleSaveRow(r)}
                              className="w-16 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* PF - EDITABLE */}
                          <td className="px-1.5 py-2 text-right">
                            <input
                              type="number"
                              value={curr.pf}
                              disabled={isFrozen}
                              onChange={e => handleFieldChange(r, 'pf', e.target.value)}
                              onBlur={() => handleSaveRow(r)}
                              className="w-18 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* TDS - EDITABLE */}
                          <td className="px-1.5 py-2 text-right">
                            <input
                              type="number"
                              value={curr.tds}
                              disabled={isFrozen}
                              onChange={e => handleFieldChange(r, 'tds', e.target.value)}
                              onBlur={() => handleSaveRow(r)}
                              className="w-18 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* ESIC Employee - EDITABLE */}
                          <td className="px-1.5 py-2 text-right">
                            <input
                              type="number"
                              value={curr.esic}
                              disabled={isFrozen}
                              onChange={e => handleFieldChange(r, 'esic', e.target.value)}
                              onBlur={() => handleSaveRow(r)}
                              className="w-16 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                          </td>
                        </>
                      )}

                      {/* ESIC Employer (Display) */}
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(curr.esic_employer)}</td>

                      {/* Total Deduction (Computed) */}
                      <td className="px-3 py-2.5 text-right font-black text-rose-700 bg-rose-50/50 dark:bg-rose-950/30">{fmt(curr.total_deduction)}</td>

                      {/* Net Salary (Computed) */}
                      <td className="px-3 py-2.5 text-right font-black text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30">{fmt(curr.net_salary)}</td>

                      {/* CTC (Computed) */}
                      <td className="px-3 py-2.5 text-right font-bold text-sky-600">{fmt(curr.ctc)}</td>

                      {/* Notes - EDITABLE */}
                      <td className="px-1.5 py-2 whitespace-nowrap">
                        <input
                          type="text"
                          value={curr.notes}
                          disabled={isFrozen}
                          onChange={e => handleFieldChange(r, 'notes', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          placeholder="Add remark..."
                          className="w-28 h-7 border border-border/80 focus:border-primary rounded px-1.5 text-xs bg-background shadow-2xs transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Button - Employee Detailed Salary Breakdown & Recalculation Modal */}
        {selectedViewItem && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Edit & Recalculate Payroll — {selectedViewItem.first_name || selectedViewItem.firstName || 'Employee'} {selectedViewItem.last_name || selectedViewItem.lastName || ''}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Code: {selectedViewItem.employee_code || selectedViewItem.employeeCode || `EMP-${selectedViewItem.id}`} • Pay Slab: {selectedViewItem.slab_name || 'Standard'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedViewItem(null)}
                  className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Attendance & Days Input Section */}
              <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Attendance & Working Days</span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Total Salary Days</label>
                    <input
                      type="number"
                      value={selectedViewItem.salary_days}
                      onChange={e => {
                        const updated = computeRowValues(selectedViewItem, { salary_days: Number(e.target.value) });
                        setSelectedViewItem(updated);
                        handleFieldChange(selectedViewItem, 'salary_days', Number(e.target.value));
                      }}
                      className="w-full h-8 px-2 border border-border rounded font-bold bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Paid Days (Present)</label>
                    <input
                      type="number"
                      value={selectedViewItem.paid_days}
                      onChange={e => {
                        const updated = computeRowValues(selectedViewItem, { paid_days: Number(e.target.value) });
                        setSelectedViewItem(updated);
                        handleFieldChange(selectedViewItem, 'paid_days', Number(e.target.value));
                      }}
                      className="w-full h-8 px-2 border border-emerald-300 text-emerald-700 dark:text-emerald-300 rounded font-bold bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Unpaid Days (LOP)</label>
                    <div className="w-full h-8 px-2 flex items-center border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 rounded font-bold text-xs">
                      {selectedViewItem.unpaid_days} Days
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings (Editable) */}
                <div className="border border-emerald-200 dark:border-emerald-950/60 rounded-xl p-4 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase text-[11px] block border-b pb-1.5">
                    Earnings & Allowances
                  </span>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeEarnings.length > 0 ? (
                      activeEarnings.map((c: any) => {
                        const comp = selectedViewItem.component_values?.[c.id];
                        const monthlyVal = comp?.monthly ?? (
                          c.name.toLowerCase().includes('basic') ? (selectedViewItem.basic ?? 0) :
                          c.name.toLowerCase().includes('hra') ? (selectedViewItem.hra ?? 0) :
                          c.name.toLowerCase().includes('special') ? (selectedViewItem.special_allowance ?? 0) :
                          c.name.toLowerCase().includes('standard') ? (selectedViewItem.standard_allowance ?? 0) : 0
                        );
                        const earnedVal = comp?.earned ?? (
                          c.name.toLowerCase().includes('basic') ? (selectedViewItem.basic_earned ?? selectedViewItem.basic ?? 0) :
                          c.name.toLowerCase().includes('hra') ? (selectedViewItem.hra_earned ?? selectedViewItem.hra ?? 0) :
                          c.name.toLowerCase().includes('special') ? (selectedViewItem.special_allowance_earned ?? selectedViewItem.special_allowance ?? 0) :
                          c.name.toLowerCase().includes('standard') ? (selectedViewItem.standard_allowance_earned ?? selectedViewItem.standard_allowance ?? 0) : 0
                        );
                        const isDerived = String(c.calculation_type || c.calculationType || '').toLowerCase() === 'derived';

                        return (
                          <div key={`m_earn_${c.id}`} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-emerald-100/40 dark:hover:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">{c.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  isDerived ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {isDerived ? 'Derived' : 'Fixed'}
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block">
                                Earned: ₹{fmt(earnedVal)}
                              </span>
                            </div>
                            <input
                              type="number"
                              value={monthlyVal}
                              onChange={e => {
                                const num = Number(e.target.value);
                                const salDays = Number(selectedViewItem.salary_days || 30);
                                const pdDays = Number(selectedViewItem.paid_days ?? salDays);
                                const ratio = salDays > 0 ? pdDays / salDays : 1;
                                const earned = c.based_on_attendance === false ? num : Math.round(num * ratio);

                                const updatedCompVals = {
                                  ...(selectedViewItem.component_values || {}),
                                  [c.id]: {
                                    ...(selectedViewItem.component_values?.[c.id] || {}),
                                    id: c.id,
                                    name: c.name,
                                    category: c.category || 'Allowance',
                                    calculation_type: c.calculation_type || 'value',
                                    monthly: num,
                                    earned: earned,
                                    based_on_attendance: c.based_on_attendance !== false,
                                  }
                                };

                                const overrides: any = { component_values: updatedCompVals };
                                if (c.name.toLowerCase().includes('basic')) overrides.basic = num;
                                else if (c.name.toLowerCase().includes('hra')) overrides.hra = num;
                                else if (c.name.toLowerCase().includes('special')) overrides.special_allowance = num;
                                else if (c.name.toLowerCase().includes('standard')) overrides.standard_allowance = num;

                                const updated = computeRowValues(selectedViewItem, overrides);
                                setSelectedViewItem(updated);
                                handleFieldChange(selectedViewItem, 'component_values', updatedCompVals);
                                if (overrides.basic !== undefined) handleFieldChange(selectedViewItem, 'basic', num);
                                if (overrides.hra !== undefined) handleFieldChange(selectedViewItem, 'hra', num);
                                if (overrides.special_allowance !== undefined) handleFieldChange(selectedViewItem, 'special_allowance', num);
                                if (overrides.standard_allowance !== undefined) handleFieldChange(selectedViewItem, 'standard_allowance', num);
                              }}
                              className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background shrink-0"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Basic Salary</span>
                          <input
                            type="number"
                            value={selectedViewItem.basic}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { basic: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'basic', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">House Rent Allowance (HRA)</span>
                          <input
                            type="number"
                            value={selectedViewItem.hra}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { hra: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'hra', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Special / Standard Allowance</span>
                          <input
                            type="number"
                            value={selectedViewItem.standard_allowance}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { standard_allowance: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'standard_allowance', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Adjustment / Bonus</span>
                        <input
                          type="number"
                          value={selectedViewItem.adjustment}
                          onChange={e => {
                            const updated = computeRowValues(selectedViewItem, { adjustment: Number(e.target.value) });
                            setSelectedViewItem(updated);
                            handleFieldChange(selectedViewItem, 'adjustment', Number(e.target.value));
                          }}
                          className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Overtime Pay (OT)</span>
                        <input
                          type="number"
                          value={selectedViewItem.ot}
                          onChange={e => {
                            const updated = computeRowValues(selectedViewItem, { ot: Number(e.target.value) });
                            setSelectedViewItem(updated);
                            handleFieldChange(selectedViewItem, 'ot', Number(e.target.value));
                          }}
                          className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-emerald-200 dark:border-emerald-800 font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    <span>Total Earned Gross</span>
                    <span>₹{fmt(selectedViewItem.total_gross_earned || selectedViewItem.gross_earned)}</span>
                  </div>
                </div>

                {/* Deductions (Editable) */}
                <div className="border border-rose-200 dark:border-rose-950/60 rounded-xl p-4 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
                  <span className="font-bold text-rose-800 dark:text-rose-400 uppercase text-[11px] block border-b pb-1.5">
                    Statutory & Other Deductions
                  </span>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeDeductions.length > 0 ? (
                      activeDeductions.map((c: any) => {
                        const comp = selectedViewItem.component_values?.[c.id];
                        const val = comp?.earned ?? comp?.monthly ?? (
                          c.name.toLowerCase().includes('pf') ? (selectedViewItem.pf ?? 0) :
                          c.name.toLowerCase().includes('pt') ? (selectedViewItem.pt ?? 0) :
                          c.name.toLowerCase().includes('esic') ? (selectedViewItem.esic ?? 0) :
                          c.name.toLowerCase().includes('tds') ? (selectedViewItem.tds ?? 0) : 0
                        );
                        const isDerived = String(c.calculation_type || c.calculationType || '').toLowerCase() === 'derived';

                        return (
                          <div key={`m_ded_${c.id}`} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-rose-100/40 dark:hover:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">{c.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  isDerived ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {isDerived ? 'Derived' : 'Fixed'}
                                </span>
                              </div>
                            </div>
                            <input
                              type="number"
                              value={val}
                              onChange={e => {
                                const num = Number(e.target.value);
                                const updatedCompVals = {
                                  ...(selectedViewItem.component_values || {}),
                                  [c.id]: {
                                    ...(selectedViewItem.component_values?.[c.id] || {}),
                                    id: c.id,
                                    name: c.name,
                                    category: 'Deduction',
                                    calculation_type: c.calculation_type || 'value',
                                    monthly: num,
                                    earned: num,
                                  }
                                };

                                const overrides: any = { component_values: updatedCompVals };
                                if (c.name.toLowerCase().includes('pf')) overrides.pf = num;
                                else if (c.name.toLowerCase().includes('pt')) overrides.pt = num;
                                else if (c.name.toLowerCase().includes('esic')) overrides.esic = num;
                                else if (c.name.toLowerCase().includes('tds')) overrides.tds = num;

                                const updated = computeRowValues(selectedViewItem, overrides);
                                setSelectedViewItem(updated);
                                handleFieldChange(selectedViewItem, 'component_values', updatedCompVals);
                                if (overrides.pf !== undefined) handleFieldChange(selectedViewItem, 'pf', num);
                                if (overrides.pt !== undefined) handleFieldChange(selectedViewItem, 'pt', num);
                                if (overrides.esic !== undefined) handleFieldChange(selectedViewItem, 'esic', num);
                                if (overrides.tds !== undefined) handleFieldChange(selectedViewItem, 'tds', num);
                              }}
                              className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background shrink-0 text-rose-600"
                            />
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Provident Fund (EPF)</span>
                          <input
                            type="number"
                            value={selectedViewItem.pf}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { pf: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'pf', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Employee ESIC</span>
                          <input
                            type="number"
                            value={selectedViewItem.esic}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { esic: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'esic', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Professional Tax (PT)</span>
                          <input
                            type="number"
                            value={selectedViewItem.pt}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { pt: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'pt', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-muted-foreground">Income Tax (TDS)</span>
                          <input
                            type="number"
                            value={selectedViewItem.tds}
                            onChange={e => {
                              const updated = computeRowValues(selectedViewItem, { tds: Number(e.target.value) });
                              setSelectedViewItem(updated);
                              handleFieldChange(selectedViewItem, 'tds', Number(e.target.value));
                            }}
                            className="w-28 h-7 text-right border border-border rounded px-1.5 text-xs font-bold bg-background"
                          />
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-rose-200 dark:border-rose-900/40">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Loan EMI Deduction</span>
                        <div className="w-28 h-7 text-right flex items-center justify-end px-1.5 text-xs font-bold text-muted-foreground">
                          ₹{fmt(selectedViewItem.loan_deduction || selectedViewItem.loanDeduction || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-rose-200 dark:border-rose-800 font-extrabold text-rose-700 dark:text-rose-300 text-sm">
                    <span>Total Deductions</span>
                    <span>₹{fmt(selectedViewItem.total_deduction)}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Footer Card */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold block">Net Take-Home Pay</span>
                  <div className="text-xl font-black text-primary">₹{fmt(selectedViewItem.net_salary)} / mo</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await handleSaveRow(selectedViewItem);
                      setSelectedViewItem(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Changes & Apply
                  </button>
                  <button
                    onClick={() => setSelectedViewItem(null)}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Attendance Calendar Modal (Date / Shift / Day Status) ────────── */}
        {attendanceCalendarItem && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-bold text-foreground">
                  {attendanceCalendarItem.employeeName} : Date [{attendanceCalendarItem.startDate} to {attendanceCalendarItem.endDate}]
                </h3>
                <button
                  onClick={() => setAttendanceCalendarItem(null)}
                  className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {attendanceCalendarLoading ? (
                  <div className="py-16 text-center text-xs text-muted-foreground">Loading attendance…</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-foreground">Date</th>
                        <th className="px-4 py-2.5 text-left font-bold text-foreground">Shift</th>
                        <th className="px-4 py-2.5 text-left font-bold text-foreground">Day Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(attendanceCalendarItem.days || []).map((d: any, idx: number) => (
                        <tr key={d.date} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                          <td className="px-4 py-2 whitespace-nowrap">{d.date} [<span className="font-bold">{d.dayName}</span>]</td>
                          <td className="px-4 py-2 text-muted-foreground">{d.shift}</td>
                          <td className="px-4 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.dayStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                d.dayStatus === 'Weekend' || d.dayStatus === 'Holiday' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                                  d.dayStatus === 'Paid Leave' || d.dayStatus === 'Sick Leave' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                                    'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}>
                              {d.dayStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Employee Payslip Preview Modal ────────────────────────────── */}
        {previewPayslipRow && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-border/80 pb-3.5 print:hidden">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Employee Payslip Preview</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Period: {payrollMonth} • Run Status: <span className="font-bold text-primary capitalize">{activeRunStatus || 'Draft'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>
                  <button
                    onClick={() => setPreviewPayslipRow(null)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Payslip Card */}
              <div className="border border-border/80 rounded-xl p-5 bg-card space-y-4 shadow-xs print:border-none print:shadow-none">
                {/* Org & Payslip Header */}
                <div className="border-b border-border/70 pb-4 text-center space-y-1">
                  <h2 className="text-base font-extrabold tracking-wide uppercase text-foreground">
                    {uniqueCompanies.find((c: any) => String(c.id) === String(previewPayslipRow.company_id || selectedCompanyId))?.name ||
                      uniqueCompanies[0]?.name ||
                      'Apponext HRMS'}
                  </h2>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Payslip for the month of {new Date(`${payrollMonth}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Slip Reference: PS-{previewPayslipRow.employee_code || previewPayslipRow.id}-{payrollMonth.replace('-', '')}
                  </p>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/60 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Employee Name</span>
                    <span className="font-bold text-foreground">
                      {previewPayslipRow.first_name || previewPayslipRow.firstName || 'Employee'} {previewPayslipRow.last_name || previewPayslipRow.lastName || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Employee Code</span>
                    <span className="font-bold text-foreground font-mono">
                      {previewPayslipRow.employee_code || previewPayslipRow.employeeCode || `EMP-${previewPayslipRow.id}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Designation</span>
                    <span className="font-bold text-foreground">
                      {previewPayslipRow.designation || previewPayslipRow.job_title || 'Staff Member'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Department</span>
                    <span className="font-bold text-foreground">
                      {previewPayslipRow.department_name || previewPayslipRow.department || 'General'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Bank Name</span>
                    <span className="font-bold text-foreground">{previewPayslipRow.bank_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Account Number</span>
                    <span className="font-bold text-foreground font-mono">
                      {previewPayslipRow.account_number || previewPayslipRow.account_no ? `••••${String(previewPayslipRow.account_number || previewPayslipRow.account_no).slice(-4)}` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Days / Paid Days</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {previewPayslipRow.salary_days || 30} Days / {previewPayslipRow.paid_days ?? previewPayslipRow.salary_days ?? 30} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Loss of Pay (LOP)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {previewPayslipRow.unpaid_days ?? 0} Days
                    </span>
                  </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Earnings */}
                  <div className="border border-border/80 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2 border-b border-border/80 flex justify-between items-center">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[11px]">Earnings</span>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px]">Earned (₹)</span>
                    </div>
                    <div className="divide-y divide-border/40 p-2 space-y-1">
                      {activeEarnings.length > 0 ? (
                        activeEarnings.map((c: any) => {
                          const comp = previewPayslipRow.component_values?.[c.id];
                          const earned = comp?.earned ?? (
                            c.name.toLowerCase().includes('basic') ? (previewPayslipRow.basic_earned ?? previewPayslipRow.basic ?? 0) :
                            c.name.toLowerCase().includes('hra') ? (previewPayslipRow.hra_earned ?? previewPayslipRow.hra ?? 0) :
                            c.name.toLowerCase().includes('special') ? (previewPayslipRow.special_allowance_earned ?? previewPayslipRow.special_allowance ?? 0) : 0
                          );
                          if (!earned && !comp) return null;
                          return (
                            <div key={`p_e_${c.id}`} className="flex justify-between items-center py-1 px-1">
                              <span className="text-muted-foreground">{c.name}</span>
                              <span className="font-semibold text-foreground font-mono">₹{fmt(earned)}</span>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">Basic Salary</span>
                            <span className="font-semibold text-foreground font-mono">₹{fmt(previewPayslipRow.basic_earned ?? previewPayslipRow.basic)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">House Rent Allowance</span>
                            <span className="font-semibold text-foreground font-mono">₹{fmt(previewPayslipRow.hra_earned ?? previewPayslipRow.hra)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">Special Allowance</span>
                            <span className="font-semibold text-foreground font-mono">₹{fmt(previewPayslipRow.special_allowance_earned ?? previewPayslipRow.special_allowance)}</span>
                          </div>
                        </>
                      )}

                      {Number(previewPayslipRow.adjustment || 0) !== 0 && (
                        <div className="flex justify-between items-center py-1 px-1">
                          <span className="text-muted-foreground">Adjustment / Bonus</span>
                          <span className="font-semibold text-foreground font-mono">₹{fmt(previewPayslipRow.adjustment)}</span>
                        </div>
                      )}
                      {Number(previewPayslipRow.ot || 0) > 0 && (
                        <div className="flex justify-between items-center py-1 px-1">
                          <span className="text-muted-foreground">Overtime Pay</span>
                          <span className="font-semibold text-foreground font-mono">₹{fmt(previewPayslipRow.ot)}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-2 border-t border-border/80 flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300">
                      <span>Total Gross Earnings</span>
                      <span className="font-mono">₹{fmt(previewPayslipRow.total_gross_earned || previewPayslipRow.gross_earned)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-border/80 rounded-xl overflow-hidden">
                    <div className="bg-rose-50/70 dark:bg-rose-950/40 px-3 py-2 border-b border-border/80 flex justify-between items-center">
                      <span className="font-bold text-rose-800 dark:text-rose-300 uppercase text-[11px]">Deductions</span>
                      <span className="font-bold text-rose-800 dark:text-rose-300 text-[10px]">Amount (₹)</span>
                    </div>
                    <div className="divide-y divide-border/40 p-2 space-y-1">
                      {activeDeductions.length > 0 ? (
                        activeDeductions.map((c: any) => {
                          const comp = previewPayslipRow.component_values?.[c.id];
                          const ded = comp?.earned ?? comp?.monthly ?? (
                            c.name.toLowerCase().includes('pf') ? previewPayslipRow.pf :
                            c.name.toLowerCase().includes('pt') ? previewPayslipRow.pt :
                            c.name.toLowerCase().includes('esic') ? previewPayslipRow.esic :
                            c.name.toLowerCase().includes('tds') ? previewPayslipRow.tds : 0
                          );
                          if (!ded && !comp) return null;
                          return (
                            <div key={`p_d_${c.id}`} className="flex justify-between items-center py-1 px-1">
                              <span className="text-muted-foreground">{c.name}</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">₹{fmt(ded)}</span>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">Provident Fund (EPF)</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">₹{fmt(previewPayslipRow.pf)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">Employee ESIC</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">₹{fmt(previewPayslipRow.esic)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">Professional Tax (PT)</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">₹{fmt(previewPayslipRow.pt)}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-1">
                            <span className="text-muted-foreground">TDS / Income Tax</span>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">₹{fmt(previewPayslipRow.tds)}</span>
                          </div>
                        </>
                      )}

                      {Number(previewPayslipRow.loan_deduction || previewPayslipRow.loanDeduction || 0) > 0 && (
                        <div className="flex justify-between items-center py-1 px-1">
                          <span className="text-muted-foreground">Loan EMI Deduction</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                            ₹{fmt(previewPayslipRow.loan_deduction || previewPayslipRow.loanDeduction)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-rose-50/40 dark:bg-rose-950/20 px-3 py-2 border-t border-border/80 flex justify-between items-center font-bold text-rose-800 dark:text-rose-300">
                      <span>Total Deductions</span>
                      <span className="font-mono">₹{fmt(previewPayslipRow.total_deduction)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Highlight Card */}
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide block">
                      Net Salary Payable (Take-Home)
                    </span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      ₹{fmt(previewPayslipRow.net_salary)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Annual CTC</span>
                    <span className="text-sm font-bold text-foreground font-mono">
                      ₹{fmt(previewPayslipRow.ctc)}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center italic pt-1">
                  This is a confidential system-generated payslip generated by Apponext HRMS.
                </p>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end gap-2 border-t border-border pt-3 print:hidden">
                <button
                  onClick={() => setPreviewPayslipRow(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const PayrollProcessing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as MainTab) || 'process';
  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const { selectedCompanyId } = useCompanyStore();

  // Auto-switch tab if URL param changes (e.g. deep-link from dashboard)
  useEffect(() => {
    const tabParam = searchParams.get('tab') as MainTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch cycles scoped strictly to the active Topbar company
  const { data: cycles = [] } = useQuery<PayrollCycle[]>({
    queryKey: ['payroll-cycles-parent', selectedCompanyId],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (selectedCompanyId) params.companyId = String(selectedCompanyId);
        const res = await apiClient.get('/payroll/cycles', { params });
        const list = res.data?.data || res.data?.cycles || res.data || [];
        if (Array.isArray(list) && list.length > 0) return list;
      } catch { }
      return [];
    },
    staleTime: 0
  });

  // Query runs to get pending approval count for the tab badge
  const { data: allRuns = [] } = useQuery({
    queryKey: ['payroll-pending-badge-count', selectedCompanyId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll');
        const list = res.data?.data || res.data || [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000
  });

  const pendingRequestsCount = allRuns.filter((r: any) => String(r.status || '').toLowerCase() === 'locked').length;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll Processing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Process and manage monthly employee payroll runs, disbursements, and register downloads</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => {
          const isRequests = key === 'payroll_requests';
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key as MainTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {isRequests && pendingRequestsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'process' && <ProcessPayrollTab cycles={cycles} selectedCompanyId={selectedCompanyId ? String(selectedCompanyId) : ''} />}
        {activeTab === 'payroll_requests' && <PayrollRequestsTab cycles={cycles} />}
        {activeTab === 'payroll_download' && <PayrollDownloadTab cycles={cycles} />}
        {activeTab === 'payroll_runs' && <PayrollRunsTab cycles={cycles} />}
      </div>
    </div>
  );
};

export default PayrollProcessing;
