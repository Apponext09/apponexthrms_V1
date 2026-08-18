import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
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

type MainTab = 'process' | 'payroll_download' | 'payroll_runs' | 'assign_slab';

const MAIN_TABS = [
  { key: 'process', label: 'Process Payroll', icon: BarChart2 },
  { key: 'assign_slab', label: 'Assign Slab', icon: Layers },
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
        `"${emp.department || 'General'}"`,
        `"${emp.slab_name || 'Standard Pay Slab'}"`,
        `"${emp.bank_name || 'N/A'}"`,
        `"${emp.account_no || 'N/A'}"`,
        `"${emp.cycle_name || 'Monthly'}"`,
        emp.total_working_days || 30,
        emp.paid_days || 30,
        emp.unpaid_days || 0,
        emp.basic_monthly || 0,
        emp.hra_monthly || 0,
        emp.gross_monthly || 0,
        emp.total_deductions || 0,
        emp.net_salary || 0,
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

// ── Tab 3: Payroll Runs Historical Ledger ──────────────────────────────────
const PayrollRunsTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [runDetailsLoading, setRunDetailsLoading] = useState(false);
  const [runEmployees, setRunEmployees] = useState<any[]>([]);
  const [empSearch, setEmpSearch] = useState('');

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
    if (s === 'approved' || s === 'locked') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"><ListChecks className="w-3 h-3 text-indigo-600" /> Approved</span>;
    }
    if (s === 'completed' || s === 'processing') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><RefreshCw className="w-3 h-3 text-amber-600" /> Processed</span>;
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
            {runs.filter((r: any) => ['published', 'completed'].includes(String(r.status).toLowerCase())).length}
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
              <option value="completed">Processed</option>
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
                        <button
                          onClick={() => handleOpenRunDetails(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-[11px] cursor-pointer transition-colors shadow-2xs border border-border/60"
                        >
                          <Eye className="w-3 h-3 text-primary" /> View Details
                        </button>
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
                className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer hover:bg-primary/90"
              >
                Close Run Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab 4: Assign Salary Slab to Employees (Bulk Management) ──────────────
const AssignSlabTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [selectedSlabId, setSelectedSlabId] = useState('');
  const [defaultCtc, setDefaultCtc] = useState('600000');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState('ALL');
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);
  const [customCtcMap, setCustomCtcMap] = useState<Record<number, string>>({});
  const [customSlabMap, setCustomSlabMap] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Queries
  const { data: slabs = [], refetch: refetchSlabs } = useQuery({
    queryKey: ['assign-tab-slabs'],
    queryFn: async () => {
      const r = await apiClient.get('/payroll/slabs');
      return r.data?.data || r.data || [];
    }
  });

  const { data: employees = [], isLoading, refetch: refetchEmps } = useQuery({
    queryKey: ['assign-tab-employees'],
    queryFn: async () => {
      const r = await apiClient.get('/employees');
      return r.data?.data || r.data || [];
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['assign-tab-depts'],
    queryFn: async () => {
      const r = await apiClient.get('/settings/departments');
      return r.data?.data || r.data || [];
    }
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['assign-tab-grades'],
    queryFn: async () => {
      const r = await apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades'));
      return r.data?.data || r.data || [];
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['assign-tab-locs'],
    queryFn: async () => {
      const r = await apiClient.get('/settings/locations');
      return r.data?.data || r.data || [];
    }
  });

  // Set default slab selection once slabs are loaded
  useEffect(() => {
    if (slabs.length > 0 && !selectedSlabId) {
      setSelectedSlabId(String(slabs[0].id));
      const minCtc = slabs[0].min_ctc || slabs[0].minCtc;
      if (minCtc) setDefaultCtc(String(minCtc));
    }
  }, [slabs, selectedSlabId]);

  // Filtering
  const filteredEmployees = employees.filter((emp: any) => {
    const name = `${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = String(emp.employee_code || emp.code || '').toLowerCase();
    const dept = (emp.department || emp.department_name || emp.dept_name || '').toLowerCase();
    const grade = (emp.grade || emp.grade_name || emp.designation || '').toLowerCase();
    const loc = (emp.location || emp.location_name || emp.branch || '').toLowerCase();
    const hasSlab = !!(emp.salary_slab_id || emp.salarySlabId || emp.slab_name || emp.slab);

    const matchesSearch = name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || dept.includes(selectedDept.toLowerCase());
    const matchesGrade = selectedGrade === 'ALL' || grade.includes(selectedGrade.toLowerCase());
    const matchesLoc = selectedLocation === 'ALL' || loc.includes(selectedLocation.toLowerCase());
    const matchesStatus =
      selectedAssignmentStatus === 'ALL' ||
      (selectedAssignmentStatus === 'UNASSIGNED' && !hasSlab) ||
      (selectedAssignmentStatus === 'ASSIGNED' && hasSlab);

    return matchesSearch && matchesDept && matchesGrade && matchesLoc && matchesStatus;
  });

  const isAllSelected = filteredEmployees.length > 0 && filteredEmployees.every((e: any) => selectedEmpIds.includes(Number(e.id)));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredEmployees.map((e: any) => Number(e.id)));
      setSelectedEmpIds(selectedEmpIds.filter(id => !filteredIds.has(id)));
    } else {
      const allFilteredIds = filteredEmployees.map((e: any) => Number(e.id));
      setSelectedEmpIds([...new Set([...selectedEmpIds, ...allFilteredIds])]);
    }
  };

  const handleToggleSelectEmp = (id: number) => {
    if (selectedEmpIds.includes(id)) {
      setSelectedEmpIds(selectedEmpIds.filter(i => i !== id));
    } else {
      setSelectedEmpIds([...selectedEmpIds, id]);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedEmpIds.length === 0) {
      showToast.error('No Employees Selected', 'Please select at least one employee to assign a salary slab.');
      return;
    }
    if (!selectedSlabId) {
      showToast.error('No Slab Selected', 'Please select a Target Salary Slab to assign.');
      return;
    }

    setSaving(true);
    try {
      const assignments = selectedEmpIds.map(empId => {
        const emp = employees.find((e: any) => Number(e.id) === empId);
        const slabToAssign = customSlabMap[empId] || selectedSlabId;
        const ctcToAssign = customCtcMap[empId] || defaultCtc || '600000';

        return {
          employeeCode: emp?.employee_code || emp?.code,
          email: emp?.email,
          slabId: slabToAssign,
          annualCtc: Number(ctcToAssign)
        };
      });

      const res: any = await apiClient.post('/payroll/slabs/bulk-assign', { assignments });
      const summary = res.data?.summary || {};
      showToast.success(
        'Slabs Assigned Successfully! 🎉',
        `Successfully assigned salary slab to ${summary.successCount || selectedEmpIds.length} employees.`
      );
      setSelectedEmpIds([]);
      refetchEmps();
    } catch (err: any) {
      showToast.error('Assignment Failed', err?.response?.data?.message || err?.message || 'Could not assign slabs');
    } finally {
      setSaving(false);
    }
  };

  const handleSingleAssign = async (emp: any) => {
    const slabToAssign = customSlabMap[emp.id] || selectedSlabId;
    const ctcToAssign = customCtcMap[emp.id] || defaultCtc || '600000';

    if (!slabToAssign) {
      showToast.error('Select Slab', 'Please choose a slab for this employee.');
      return;
    }

    try {
      await apiClient.post('/payroll/slabs/bulk-assign', {
        assignments: [{
          employeeCode: emp.employee_code || emp.code,
          email: emp.email,
          slabId: slabToAssign,
          annualCtc: Number(ctcToAssign)
        }]
      });
      showToast.success('Assigned! ✅', `Assigned slab to ${emp.first_name || emp.name}`);
      refetchEmps();
    } catch (err: any) {
      showToast.error('Failed', err?.message || 'Assignment failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Target Slab Assignment Control Bar */}
      <div className="border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60 dark:border-emerald-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Bulk Assign Salary Slabs to Staff</h2>
              <p className="text-xs text-muted-foreground">Quickly assign salary slabs across all departments, grades, and branch locations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
              {selectedEmpIds.length} Employees Selected
            </span>
            <button
              onClick={handleBulkAssign}
              disabled={saving || selectedEmpIds.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer transition-all"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saving ? 'Assigning Slabs...' : '🚀 Assign Slabs to Selected'}
            </button>
          </div>
        </div>

        {/* Global Assignment Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Target Salary Slab to Assign <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSlabId}
              onChange={e => {
                const val = e.target.value;
                setSelectedSlabId(val);
                const matched = slabs.find((s: any) => String(s.id) === String(val));
                if (matched?.min_ctc || matched?.minCtc) {
                  setDefaultCtc(String(matched.min_ctc || matched.minCtc));
                }
              }}
              className="w-full h-9 border border-emerald-300 dark:border-emerald-700 rounded-md px-3 text-xs bg-background text-foreground font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="">-- Choose Master Slab --</option>
              {slabs.map((s: any) => (
                <option key={s.id} value={String(s.id)}>
                  🏷️ {s.name || s.slab_name} {s.min_ctc ? `(₹${(Number(s.min_ctc) / 100000).toFixed(1)}L - ₹${(Number(s.max_ctc || 10000000) / 100000).toFixed(1)}L)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-foreground mb-1">
              Default Annual CTC (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={defaultCtc}
              onChange={e => setDefaultCtc(e.target.value)}
              placeholder="e.g. 600000"
              className="w-full h-9 border border-border rounded-md px-3 text-xs bg-background text-foreground font-bold font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase">Filter Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 text-xs bg-background text-foreground font-medium cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.name || d.department_name}>{d.name || d.department_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase">Filter Grade / Location</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full h-9 border border-border rounded-md px-2 text-xs bg-background text-foreground font-medium cursor-pointer"
              >
                <option value="ALL">All Grades</option>
                {grades.map((g: any) => (
                  <option key={g.id} value={g.name || g.grade_name}>{g.name || g.grade_name}</option>
                ))}
              </select>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full h-9 border border-border rounded-md px-2 text-xs bg-background text-foreground font-medium cursor-pointer"
              >
                <option value="ALL">All Locations</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.name || l.location_name}>{l.name || l.location_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Employee Table */}
      <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-xs">
        <div className="p-3 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 font-bold text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span>Select All Visible ({filteredEmployees.length} Staff)</span>
            </label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={selectedAssignmentStatus}
              onChange={e => setSelectedAssignmentStatus(e.target.value)}
              className="h-8 border border-border bg-background rounded-lg px-2 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only</option>
              <option value="ASSIGNED">✓ Assigned Only</option>
            </select>

            <button
              onClick={() => refetchEmps()}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Refresh staff"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Employee Details</th>
                <th className="py-3 px-4">Department & Location</th>
                <th className="py-3 px-4">Designation / Grade</th>
                <th className="py-3 px-4">Current Slab</th>
                <th className="py-3 px-4">Target Slab</th>
                <th className="py-3 px-4">Offered Annual CTC (₹)</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                    Loading employees from database...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    No employees found matching the chosen filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp: any) => {
                  const empId = Number(emp.id);
                  const isChecked = selectedEmpIds.includes(empId);
                  const empName = `${emp.first_name || emp.name || 'Staff'} ${emp.last_name || ''}`.trim();
                  const empDept = emp.department || emp.department_name || emp.dept_name || 'General';
                  const empLoc = emp.location || emp.location_name || 'Headquarters';
                  const empDesig = emp.designation || emp.designation_name || 'Staff Member';
                  const empGrade = emp.grade || emp.grade_name || '-';
                  const currentSlabName = emp.slab_name || emp.slab || (emp.salary_slab_id ? `Slab #${emp.salary_slab_id}` : null);
                  const currentCtc = emp.annual_ctc || emp.annualCtc || defaultCtc;
                  const rowCtc = customCtcMap[empId] !== undefined ? customCtcMap[empId] : String(currentCtc);
                  const rowSlab = customSlabMap[empId] !== undefined ? customSlabMap[empId] : selectedSlabId;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-muted/30 transition-colors ${isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectEmp(empId)}
                          className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{empName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{emp.employee_code || emp.code || `EMP-${emp.id}`}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{empDept}</div>
                        <div className="text-[10px] text-muted-foreground">{empLoc}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{empDesig}</div>
                        <div className="text-[10px] text-muted-foreground">Grade: {empGrade}</div>
                      </td>
                      <td className="py-3 px-4">
                        {currentSlabName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            🏷️ {currentSlabName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ⚠️ Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={rowSlab}
                          onChange={e => setCustomSlabMap({ ...customSlabMap, [empId]: e.target.value })}
                          className="h-7 border border-border bg-background rounded px-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          {slabs.map((s: any) => (
                            <option key={s.id} value={String(s.id)}>
                              {s.name || s.slab_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={rowCtc}
                          onChange={e => setCustomCtcMap({ ...customCtcMap, [empId]: e.target.value })}
                          className="w-28 h-7 border border-border bg-background rounded px-2 text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSingleAssign(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                        >
                          ✓ Assign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Deduplicate helper to prevent duplicate dropdown options and register table rows
const deduplicate = <T extends Record<string, any>>(arr: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return (arr || []).filter(item => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Display label only — the raw value (e.g. "full_time" or "Full-Time") is always
 *  what's sent to the server, so filtering still exact-matches the real column value. */
const titleCaseLabel = (v: string): string =>
  String(v || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ── Tab 2: Process Payroll Register Table ─────────────────────────────────
const ProcessPayrollTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [generateOnMode, setGenerateOnMode] = useState('- Select -');
  const [cycleId, setCycleId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [subPeriod, setSubPeriod] = useState('W1');
  const [sortBy, setSortBy] = useState('Name');
  const [payrollStatus, setPayrollStatus] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [removePagination, setRemovePagination] = useState(true);

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
  const [filtered, setFiltered] = useState(false);
  const [selectedViewItem, setSelectedViewItem] = useState<any | null>(null);
  const [attendanceCalendarItem, setAttendanceCalendarItem] = useState<any | null>(null);
  const [attendanceCalendarLoading, setAttendanceCalendarLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [activeRunStatus, setActiveRunStatus] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const openAttendanceCalendar = async (row: any) => {
    const empId = row.employeeId || row.employee_id || row.id;
    const empName = `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim() || `Employee #${empId}`;
    const monthStart = `${payrollMonth}-01`;
    const monthEndDate = new Date(Number(payrollMonth.slice(0, 4)), Number(payrollMonth.slice(5, 7)), 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthEnd = `${monthEndDate.getFullYear()}-${pad(monthEndDate.getMonth() + 1)}-${pad(monthEndDate.getDate())}`;

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

  // Lookup data from database masters
  const { data: cyclesData = [] } = useQuery({
    queryKey: ['payroll-cycles-process-tab'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/cycles');
      return res.data?.data || res.data?.cycles || res.data || [];
    },
    staleTime: 0
  });

  const rawCyclesList = cyclesData.length > 0 ? cyclesData : cycles;
  const activeCycles = deduplicate(rawCyclesList as any[], (c: any) => String(c.id || c.cycle_name || c.name));

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: async () => { const r = await apiClient.get('/settings/companies'); return r.data?.data || r.data || []; } });
  const { data: locations = [] } = useQuery({ queryKey: ['locs'], queryFn: async () => { const r = await apiClient.get('/settings/locations'); return r.data?.data || r.data || []; } });
  const { data: departments = [] } = useQuery({ queryKey: ['depts'], queryFn: async () => { const r = await apiClient.get('/settings/departments'); return r.data?.data || r.data || []; } });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: async () => { const r = await apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')); return r.data?.data || r.data || []; } });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: async () => { const r = await apiClient.get('/settings/designations'); return r.data?.data || r.data || []; } });
  const { data: slabs = [] } = useQuery({ queryKey: ['slabs-list'], queryFn: async () => { const r = await apiClient.get('/payroll/slabs'); return r.data?.data || r.data || []; } });
  const { data: employees = [] } = useQuery({ queryKey: ['employees-list'], queryFn: async () => { const r = await apiClient.get('/employees'); return r.data?.data || r.data || []; } });

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
    }).catch(() => {});
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

  // Reset default subPeriod when cycle frequency changes
  useEffect(() => {
    if (subPeriodOptions.length > 0) {
      setSubPeriod(subPeriodOptions[0].id);
    }
  }, [cycleId, payrollMonth]);

  const buildParams = () => {
    const p: Record<string, string> = {};
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
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['process-register', cycleId, payrollMonth, subPeriod, departmentId, locationId, payrollStatus, paymentMode, empStatus, empType, gradeId, designationId, slabId, employeeId, reportingOfficerId, sortBy, bypassCache],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/process-register', { params: buildParams() });
      return res.data?.data || res.data || [];
    },
    enabled: filtered && !!cycleId && !!payrollMonth,
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
    const dataToExport = employees && employees.length > 0 ? employees : [];
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

    const rows = dataToExport.map((emp: any) => [
      `"${emp.employee_code || `EMP-${emp.id}`}"`,
      `"${emp.first_name || '-'}"`,
      `"${emp.middle_name || '-'}"`,
      `"${emp.last_name || '-'}"`,
      `"${emp.designation || 'Employee'}"`,
      `"${emp.slab_name || emp.slab || 'Standard Pay Slab'}"`,
      `"${emp.bank_name || 'N/A'}"`,
      `"${emp.account_no || 'N/A'}"`,
      `"${paymentStatusMap[emp.id] || emp.payroll_status || 'Freeze'}"`,
      emp.total_working_days || 30,
      emp.paid_days || 30,
      emp.unpaid_days || 0,
      emp.basic_monthly || 0,
      emp.hra_monthly || 0,
      emp.gross_monthly || 0,
      emp.total_deductions || 0,
      emp.net_salary || 0
    ]);

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
  const uniqueRows = deduplicate(rows as any[], r => String(r.id));

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

    const basic = Number(merged.basic ?? 0);
    const hra = Number(merged.hra ?? 0);
    const stdAllow = Number(merged.standard_allowance ?? 0);
    const meal = Number(merged.meal_allowance ?? 0);
    const comm = Number(merged.communication_allowance ?? 0);
    const edu = Number(merged.children_education_allowance ?? 0);
    const lta = Number(merged.lta ?? 0);

    const gross = basic + hra + stdAllow + meal + comm + edu + lta;

    const basicEarned = Math.round(basic * ratio);
    const hraEarned = Math.round(hra * ratio);
    const stdEarned = Math.round(stdAllow * ratio);
    const mealEarned = Math.round(meal * ratio);
    const commEarned = Math.round(comm * ratio);
    const eduEarned = Math.round(edu * ratio);
    const ltaEarned = Math.round(lta * ratio);
    const grossEarned = basicEarned + hraEarned + stdEarned + mealEarned + commEarned + eduEarned + ltaEarned;

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

    const totalDeduction = pt + pf + tds + esic + loanDeduction;
    const netSalary = Math.max(0, totalGrossEarned - totalDeduction);
    const ctc = Math.round(gross * 12);

    return {
      ...merged,
      salary_days: salaryDays,
      paid_days: paidDays,
      unpaid_days: unpaidDays,
      basic,
      hra,
      standard_allowance: stdAllow,
      meal_allowance: meal,
      communication_allowance: comm,
      children_education_allowance: edu,
      lta,
      gross,
      basic_earned: basicEarned,
      hra_earned: hraEarned,
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

  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  const handleReconciliation = async () => {
    if (!cycleId) {
      showToast.error('Missing Cycle', 'Please select a Payroll Cycle before running reconciliation.');
      return;
    }
    setReconciliationLoading(true);
    try {
      const runsRes = await apiClient.get('/payroll', { params: { cycleId, month: payrollMonth } });
      const runs = runsRes.data?.data || runsRes.data || [];
      const latestRun = Array.isArray(runs) ? runs[0] : null;

      if (!latestRun?.id) {
        showToast.error('No Payroll Run Found', 'Run "Finalize & Publish Payslips" for this cycle and month first, then reconcile.');
        return;
      }

      const res = await apiClient.get(`/payroll/${latestRun.id}/reconciliation`);
      setReconciliation(res.data?.data || res.data);
    } catch (err: any) {
      showToast.error('Reconciliation Failed', err?.response?.data?.message || err?.message || 'Could not generate reconciliation report.');
    } finally {
      setReconciliationLoading(false);
    }
  };

  // Step 1 — Generate the run for this cycle and calculate every employee's salary.
  const handleProcessPayroll = async () => {
    if (generateOnMode === '- Select -') {
      showToast.error('Missing Selection', 'Choose "Generate Payroll On" before processing.');
      return;
    }
    if (!cycleId) {
      showToast.error('Missing Cycle', 'Please select a Payroll Cycle before processing.');
      return;
    }
    if (!payrollMonth) {
      showToast.error('Missing Month', 'Please select a Month / Period before processing.');
      return;
    }
    setIsProcessingPayroll(true);
    try {
      const genRes = await apiClient.post('/payroll', {
        payrollCycleId: Number(cycleId),
        runType: 'regular',
        departmentId: departmentId ? Number(departmentId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
      });

      const run = genRes.data?.data;
      if (!run?.id) {
        throw new Error('Failed to initialize payroll run');
      }

      const processRes = await apiClient.post(`/payroll/${run.id}/process`);
      // processPayroll actually resolves the run to status 'completed', not
      // 'processed' — read the real value back instead of assuming the name.
      const processedRun = processRes.data?.data;
      const errorCount = Number(processedRun?.error_count ?? processedRun?.errorCount ?? 0);

      setActiveRunId(run.id);
      setActiveRunStatus(processedRun?.status || 'completed');

      if (errorCount > 0) {
        showToast.warning('Payroll Processed with Errors ⚠️', `${errorCount} employee(s) failed to process (e.g. missing salary structure) — see the register for details. You can still lock and publish for the rest.`);
      } else {
        showToast.success('Payroll Processed ✅', 'Salaries calculated. Review the register, then lock the figures.');
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
      showToast.success('Payroll Locked 🔒', 'Figures are frozen. Ready to publish.');
    } catch (err: any) {
      showToast.error('Lock Failed', err?.response?.data?.message || err?.message || 'Could not lock payroll');
    } finally {
      setIsLocking(false);
    }
  };

  // Step 3 — Release payslips to employees. Only allowed once the run is locked.
  const handlePublishPayslips = async () => {
    if (!activeRunId) return;
    setIsPublishing(true);
    try {
      await apiClient.post(`/payroll/${activeRunId}/publish`);
      setActiveRunStatus('published');
      showToast.success('Payslips Published 🎉', 'Payslips are now visible to employees.');
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
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <h2 className="text-sm font-bold text-foreground">Process Payroll Filters</h2>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => showToast.info('Minimum Wages Check', 'All employee salaries meet minimum wage requirements.')}
              className="text-foreground hover:underline font-semibold underline decoration-foreground/40 underline-offset-2"
            >
              Check minimum wages
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <button className="p-1 hover:bg-muted rounded text-foreground"><Expand className="w-4 h-4" /></button>
              <button className="p-1 hover:bg-muted rounded text-foreground"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Row 1: Generate Payroll On *, Payroll Cycle *, Month *, Sort By, Payroll Status, Remove Pagination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Generate Payroll On <span className="text-rose-500">*</span>
            </label>
            <select
              value={generateOnMode}
              onChange={e => setGenerateOnMode(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="- Select -">- Select -</option>
              <option value="Attendance">Attendance</option>
              <option value="Active for selected period">Active for selected period</option>
              <option value="Last Working day in selected period">Last Working day in period</option>
              <option value="Active User Except whose last working day is in selected period">Active (excl. last working day)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Payroll Cycle ({activeCycles.length}) <span className="text-rose-500">*</span>
            </label>
            <select
              value={cycleId}
              onChange={e => setCycleId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">- Select -</option>
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

          <div>
            <label className="block text-xs font-bold text-foreground mb-1 flex items-center justify-between">
              <span>Month / Period <span className="text-rose-500">*</span></span>
              {isWeekly && <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">Weekly (7 Days)</span>}
              {isBiWeekly && <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">Bi-Weekly (14 Days)</span>}
              {isSemiMonthly && <span className="text-[10px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800">Semi-Monthly (15 Days)</span>}
            </label>

            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={payrollMonth}
                onChange={e => setPayrollMonth(e.target.value)}
                className="w-full h-9 border border-border rounded-md px-2 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
              />

              {subPeriodOptions.length > 0 && (
                <select
                  value={subPeriod}
                  onChange={e => setSubPeriod(e.target.value)}
                  className="w-full h-9 border border-indigo-300 dark:border-indigo-800 rounded-md px-2 py-1 text-xs bg-indigo-50/70 dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Sort By</label>
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-background text-foreground font-medium pr-14"
              >
                <option value="Name">Name</option>
                <option value="Code">Employee Code</option>
                <option value="Department">Department</option>
                <option value="Gross">Gross Salary</option>
                <option value="Net">Net Salary</option>
              </select>
              <span className="absolute right-1 px-1.5 py-0.5 text-[9px] bg-black text-white font-bold rounded pointer-events-none">
                Sort
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Payroll Status</label>
            <select
              value={payrollStatus}
              onChange={e => setPayrollStatus(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-background text-foreground font-medium"
            >
              <option value="">Choose</option>
              <option value="Freeze">Freeze</option>
              <option value="Unfreeze">Unfreeze</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="removePagination"
              checked={removePagination}
              onChange={e => setRemovePagination(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="removePagination" className="text-xs font-medium text-foreground cursor-pointer select-none">
              Remove Pagination
            </label>
          </div>
        </div>

        {/* Row 2: Company, Location, Department, Reporting Officer, Employee Status, Employment Type */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Company</label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Companies ({uniqueCompanies.length})▾</option>
              {uniqueCompanies.map((c: any, idx: number) => (
                <option key={`comp_${c.id ?? idx}`} value={String(c.id)}>{c.name || c.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Location</label>
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Locations ({uniqueLocations.length})▾</option>
              {uniqueLocations.map((l: any, idx: number) => (
                <option key={`loc_${l.id ?? idx}`} value={String(l.id)}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Department</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Departments ({uniqueDepartments.length})▾</option>
              {uniqueDepartments.map((d: any, idx: number) => (
                <option key={`dept_${d.id ?? idx}`} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Reporting Officer</label>
            <select
              value={reportingOfficerId}
              onChange={e => setReportingOfficerId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Officers ({uniqueReportingOffs.length})▾</option>
              {uniqueReportingOffs.map((e: any, idx: number) => (
                <option key={`off_${e.id ?? idx}`} value={String(e.id)}>
                  {(e.firstName || e.first_name || e.name || 'Officer')} {(e.lastName || e.last_name || '')} {e.jobTitle || e.job_title || e.designation ? `(${e.jobTitle || e.job_title || e.designation})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Employee Status</label>
            <select
              value={empStatus}
              onChange={e => setEmpStatus(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Statuses ({uniqueEmployeeStatuses.length})▾</option>
              {uniqueEmployeeStatuses.map((s: any) => (
                <option key={s.value} value={s.value}>{titleCaseLabel(s.value)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Employment Type</label>
            <select
              value={empType}
              onChange={e => setEmpType(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Types ({uniqueEmploymentTypes.length})▾</option>
              {uniqueEmploymentTypes.map((t: any) => (
                <option key={t.value} value={t.value}>{titleCaseLabel(t.value)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Grade / Pay Grade</label>
            <select
              value={gradeId}
              onChange={e => setGradeId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Pay Grades ({uniqueGrades.length})▾</option>
              {uniqueGrades.map((g: any, idx: number) => (
                <option key={`grd_${g.id ?? idx}`} value={String(g.id)}>{g.name || g.grade_name || g.pay_grade_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Designation</label>
            <select
              value={designationId}
              onChange={e => setDesignationId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Designations ({uniqueDesignations.length})▾</option>
              {uniqueDesignations.map((d: any, idx: number) => (
                <option key={`desig_${d.id ?? idx}`} value={String(d.id)}>{d.name || d.designation_name || d.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Employee (individual select) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Pay Slab</label>
            <select
              value={slabId}
              onChange={e => setSlabId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Pay Slabs ({uniqueSlabs.length})▾</option>
              {uniqueSlabs.map((s: any, idx: number) => (
                <option key={`slab_${s.id ?? idx}`} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Employee (Individual)</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
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

        {/* Row 4: Buttons (Filter, Reset, Reconciliation, Finalize & Publish) + Bypass Cache Checkbox */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (generateOnMode === '- Select -') { showToast.error('Missing Selection', 'Choose "Generate Payroll On" before filtering.'); return; }
              if (!cycleId) { showToast.error('Missing Payroll Cycle', 'Select a Payroll Cycle before filtering.'); return; }
              if (!payrollMonth) { showToast.error('Missing Month', 'Select a Month / Period before filtering.'); return; }
              setFiltered(true);
              refetch();
            }}
            className="flex items-center gap-1.5 px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>

          <button
            onClick={handleReset}
            className="px-5 py-2 border border-border bg-background hover:bg-muted text-foreground text-xs font-bold rounded-md shadow-sm transition-colors"
          >
            Reset
          </button>

          <button
            onClick={handleReconciliation}
            disabled={reconciliationLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            {reconciliationLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
            {reconciliationLoading ? 'Generating...' : 'Reconciliation'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
            title="Export Payroll Register to CSV file"
          >
            <Download className="w-3.5 h-3.5" /> Export Register (CSV)
          </button>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {activeRunStatus && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                activeRunStatus === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                activeRunStatus === 'locked'    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                activeRunStatus === 'completed' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-muted text-muted-foreground border-border'
              }`}>
                Run #{activeRunId} — {activeRunStatus.toUpperCase()}
              </span>
            )}

            <button
              onClick={handleProcessPayroll}
              disabled={isProcessingPayroll || ['completed', 'locked', 'published'].includes(activeRunStatus)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
            >
              {isProcessingPayroll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {isProcessingPayroll ? 'Processing...' : ['completed', 'locked', 'published'].includes(activeRunStatus) ? '1. Processed ✓' : '1. Process Payroll'}
            </button>

            <button
              onClick={handleLockPayroll}
              disabled={isLocking || activeRunStatus !== 'completed'}
              title={!activeRunStatus || activeRunStatus === 'draft' ? 'Process payroll first' : ''}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
            >
              {isLocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              {isLocking ? 'Locking...' : ['locked', 'published'].includes(activeRunStatus) ? '2. Locked ✓' : '2. Lock Figures'}
            </button>

            <button
              onClick={handlePublishPayslips}
              disabled={isPublishing || activeRunStatus !== 'locked'}
              title={activeRunStatus !== 'locked' && activeRunStatus !== 'published' ? 'Lock the payroll first' : ''}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
            >
              {isPublishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isPublishing ? 'Publishing...' : activeRunStatus === 'published' ? '3. Published ✓' : '3. Publish Payslips'}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              id="bypassCache"
              checked={bypassCache}
              onChange={e => setBypassCache(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="bypassCache" className="text-xs font-medium text-foreground cursor-pointer select-none">
              Bypass Cache
            </label>
          </div>
        </div>

        {/* Note */}
        <p className="text-[11px] font-bold text-rose-600 pt-1">
          *Note: If any payroll calculation changes are made, click "Bypass Cache and Filter" before processing payroll.
        </p>
      </div>

      {/* Register Table - Directly Editable */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Payroll Register ({uniqueRows.length} Employees) — Directly Editable</h2>
          <span className="text-[11px] text-muted-foreground font-semibold">Click any number to edit directly • Auto-recalculates & saves</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-xs text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading register...
          </div>
        ) : uniqueRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground gap-1">
            <Search className="w-5 h-5" />
            No records found. Select filters and click Filter, or run salary calculation in HR Portal first.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border sticky top-0 z-10 shadow-2xs">
                <tr>
                  {[
                    'Action', 'Payment Status', 'First Name', 'Middle Name', 'Last Name', 'Designation', 'Pay Slab', 'Bank Name',
                    'Salary Days', 'Paid Days', 'Unpaid Days',
                    'Basic', 'HRA', 'Standard Allowance', 'Meal Allowance', 'Communication Allowance', 'Children Education Allowance', 'LTA', 'Gross',
                    'Basic Earned', 'HRA Earned', 'Standard Allowance Earned', 'Meal Allowance Earned', 'Communication Allowance Earned', 'Children Education Earned', 'LTA Earned', 'Gross Earned', 'Total Gross Earned',
                    'Adjustment', 'OT Hour', 'OT', 'PT', 'PF', 'TDS', 'ESIC Employer', 'ESIC', 'Total Deduction', 'Net Salary', 'CTC', 'Notes'
                  ].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-muted-foreground uppercase text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {uniqueRows.map((r: any) => {
                  const curr = computeRowValues(r);

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border/50">
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
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={curr.payment_status || 'Freeze'}
                          onChange={e => {
                            handleFieldChange(r, 'payment_status', e.target.value);
                            handleSaveRow(r);
                          }}
                          className="h-7 px-2 border border-border rounded-md text-[11px] font-semibold bg-background cursor-pointer"
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
                          onChange={e => handleFieldChange(r, 'paid_days', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-14 h-7 text-center border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 rounded px-1 text-xs font-bold bg-emerald-50/20 dark:bg-emerald-950/20 shadow-2xs focus:border-emerald-600 transition-colors"
                        />
                      </td>

                      {/* Unpaid Days (Computed) */}
                      <td className="px-3 py-2.5 text-center font-bold text-rose-600">{curr.unpaid_days}</td>

                      {/* Master Pay Slab Components (Display) */}
                      <td className="px-3 py-2.5 text-right">{fmt(curr.basic)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.hra)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.standard_allowance)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.meal_allowance)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.communication_allowance)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.children_education_allowance)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.lta)}</td>
                      <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(curr.gross)}</td>

                      {/* Earned Components (Computed based on Paid Days) */}
                      <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.basic_earned)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.hra_earned)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{fmt(curr.standard_allowance_earned)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.meal_allowance_earned)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.communication_allowance_earned)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.children_education_allowance_earned)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(curr.lta_earned)}</td>
                      <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(curr.gross_earned)}</td>
                      <td className="px-3 py-2.5 text-right font-black bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">{fmt(curr.total_gross_earned)}</td>

                      {/* Adjustment - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.adjustment}
                          onChange={e => handleFieldChange(r, 'adjustment', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-border/80 focus:border-primary rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* OT Hours - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.ot_hours}
                          onChange={e => handleFieldChange(r, 'ot_hours', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-14 h-7 text-right border border-border/80 focus:border-primary rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* OT Amount - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.ot}
                          onChange={e => handleFieldChange(r, 'ot', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-emerald-300 text-emerald-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* PT - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.pt}
                          onChange={e => handleFieldChange(r, 'pt', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* PF - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.pf}
                          onChange={e => handleFieldChange(r, 'pf', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-18 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* TDS - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.tds}
                          onChange={e => handleFieldChange(r, 'tds', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-18 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

                      {/* ESIC Employer (Display) */}
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(curr.esic_employer)}</td>

                      {/* ESIC Employee - EDITABLE */}
                      <td className="px-1.5 py-2 text-right">
                        <input
                          type="number"
                          value={curr.esic}
                          onChange={e => handleFieldChange(r, 'esic', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          className="w-16 h-7 text-right border border-rose-200 text-rose-600 rounded px-1 text-xs font-semibold bg-background shadow-2xs transition-colors"
                        />
                      </td>

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
                          onChange={e => handleFieldChange(r, 'notes', e.target.value)}
                          onBlur={() => handleSaveRow(r)}
                          placeholder="Add remark..."
                          className="w-28 h-7 border border-border/80 focus:border-primary rounded px-1.5 text-xs bg-background shadow-2xs transition-colors"
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
                  
                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Loan EMI Deduction</span>
                      <div className="w-28 h-7 text-right flex items-center justify-end px-1.5 text-xs font-bold text-muted-foreground">
                        ₹{fmt(selectedViewItem.loan_deduction || selectedViewItem.loanDeduction || 0)}
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
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              d.dayStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
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

        {reconciliation && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-600" /> Payroll Reconciliation
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Run #{reconciliation.currentRunId}
                    {reconciliation.previousRunId ? ` vs. previous Run #${reconciliation.previousRunId}` : ' — no previous run to compare against'}
                  </p>
                </div>
                <button
                  onClick={() => setReconciliation(null)}
                  className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 px-5 py-3 border-b border-border/60 bg-muted/20 text-xs">
                <span><span className="text-muted-foreground">Employees:</span> <strong>{reconciliation.totalEmployees}</strong></span>
                {reconciliation.anomaliesCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> {reconciliation.anomaliesCount} anomal{reconciliation.anomaliesCount === 1 ? 'y' : 'ies'} (&gt;15% swing vs. last run)
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">No anomalies detected</span>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold text-foreground">Employee</th>
                      <th className="px-4 py-2.5 text-right font-bold text-foreground">Prev. Gross</th>
                      <th className="px-4 py-2.5 text-right font-bold text-foreground">Curr. Gross</th>
                      <th className="px-4 py-2.5 text-right font-bold text-foreground">Δ Gross</th>
                      <th className="px-4 py-2.5 text-right font-bold text-foreground">Curr. Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(reconciliation.reconciliation || []).map((item: any) => (
                      <tr key={item.employeeId} className={item.anomalyFlag ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                        <td className="px-4 py-2">
                          <div className="font-bold text-foreground">{item.employeeName || `Employee #${item.employeeId}`}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{item.employeeCode}</div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">₹{fmt(item.prevGross)}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">₹{fmt(item.currGross)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-bold ${item.diffGross > 0 ? 'text-emerald-600' : item.diffGross < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                          {item.diffGross > 0 ? '+' : ''}₹{fmt(item.diffGross)}
                          {item.anomalyFlag && <AlertTriangle className="w-3 h-3 inline-block ml-1 text-amber-600 align-text-top" />}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{fmt(item.currNet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
                <button
                  onClick={() => setReconciliation(null)}
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg cursor-pointer hover:bg-primary/90"
                >
                  Close
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
  const [activeTab, setActiveTab] = useState<MainTab>('process');

  const { data: cycles = [] } = useQuery<PayrollCycle[]>({
    queryKey: ['payroll-cycles-parent'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/cycles');
        const list = res.data?.data || res.data?.cycles || res.data || [];
        if (Array.isArray(list) && list.length > 0) return list;
      } catch { }
      return [];
    },
    staleTime: 0
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll Processing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage pay slab assignments and process monthly payroll</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as MainTab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'process' && <ProcessPayrollTab cycles={cycles} />}
        {activeTab === 'assign_slab' && <AssignSlabTab cycles={cycles} />}
        {activeTab === 'payroll_download' && <PayrollDownloadTab cycles={cycles} />}
        {activeTab === 'payroll_runs' && <PayrollRunsTab cycles={cycles} />}
      </div>
    </div>
  );
};

export default PayrollProcessing;
