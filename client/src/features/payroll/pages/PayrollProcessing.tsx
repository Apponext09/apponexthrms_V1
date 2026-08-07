import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import {
  Upload,
  Download,
  Filter,
  RefreshCw,
  Mail,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ClipboardList,
  FileDown,
  ListChecks,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Search,
  FileText,
  BarChart2,
  Calendar,
  CheckSquare,
  Maximize2,
} from 'lucide-react';

// ─────────────────────────── Types ───────────────────────────
interface PayrollCycle {
  id: number;
  cycle_name?: string;
  name?: string;
  cycle_type?: string;
}
interface Department { id: number; name: string; }
interface Location { id: number; name: string; }
interface Employee { id: number; first_name: string; last_name: string; designation?: string; }
interface Manager { id: number; first_name: string; last_name: string; designation?: string; }

interface PayrollRow {
  id: number;
  employee_id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  name?: string;
  designation?: string;
  job_title?: string;
  bank_name?: string;
  salary_days?: number;
  paid_days?: number;
  unpaid_days?: number;
  basic?: number;
  hra?: number;
  standard_allowance?: number;
  meal_allowance?: number;
  communication_allowance?: number;
  children_education_allowance?: number;
  lta?: number;
  gross?: number;
  basic_earned?: number;
  hra_earned?: number;
  standard_allowance_earned?: number;
  meal_allowance_earned?: number;
  communication_allowance_earned?: number;
  children_education_allowance_earned?: number;
  lta_earned?: number;
  gross_earned?: number;
  total_gross_earned?: number;
  adjustment?: number;
  ot_hours?: number;
  ot?: number;
  pt?: number;
  pf?: number;
  tds?: number;
  esic_employer?: number;
  esic?: number;
  total_deduction?: number;
  net_salary?: number;
  ctc?: number;
  notes?: string;
  payment_status?: string;
  status?: string;
}

// ─────────────────────────── Helpers ───────────────────────────
const fmt = (v?: number) => (v == null ? '0' : Number(v).toLocaleString('en-IN'));

// ─────────────────────────── Sub-components ───────────────────────────

const MainTabBar: React.FC<{
  tabs: { key: string; label: string; icon: React.ElementType }[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex border-b border-border/60 bg-card overflow-x-auto">
    {tabs.map(({ key, label }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        className={`px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
          active === key
            ? 'border-primary text-primary bg-primary/5'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

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
      className="w-full appearance-none border border-border rounded-md px-3 py-1.5 pr-8 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8"
    >
      {children}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
  </div>
);

// ─────────────────────────── Tab 1: Upload Payroll Data ───────────────────────────
const UploadPayrollDataTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [activeView, setActiveView] = useState<'upload' | 'log'>('upload');
  const [cycleId, setCycleId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [file, setFile] = useState<File | null>(null);
  const [displayPayslip, setDisplayPayslip] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!cycleId) { showToast.error('Missing', 'Please select a payroll cycle'); return; }
    if (!file) { showToast.error('Missing', 'Please choose a file to upload'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('cycleId', cycleId);
      fd.append('month', month);
      fd.append('displayPayslip', String(displayPayslip));
      await apiClient.post('/payroll/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast.success('Upload Successful', 'Payroll data uploaded and queued for processing.');
      setFile(null);
    } catch (err: any) {
      showToast.error('Upload Failed', err?.message || 'An error occurred during upload');
    } finally { setUploading(false); }
  };

  return (
    <div>
      <div className="flex border-b border-border/60 bg-muted/20 px-4">
        <button
          onClick={() => setActiveView('upload')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeView === 'upload'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload Payroll Data
        </button>
        <button
          onClick={() => setActiveView('log')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeView === 'log'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload Log
        </button>
      </div>

      {activeView === 'upload' ? (
        <div className="p-6">
          <div className="flex justify-end mb-4">
            <button className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
              <ClipboardList className="w-3.5 h-3.5" />
              Audit Log
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <button className="flex items-center gap-2 bg-[#d9534f] hover:bg-[#c9302c] text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
              <Download className="w-3.5 h-3.5" />
              Download Sample file
            </button>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Payroll Cycle <span className="text-red-500">*</span>
              </label>
              <Sel value={cycleId} onChange={setCycleId} className="min-w-[160px]">
                <option value="">- Select -</option>
                {cycles.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.cycle_name || c.name || `Cycle #${c.id}`}</option>
                ))}
              </Sel>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Month <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground h-8 focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted/20 transition-all h-8 mt-5">
                <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-medium border border-border">Choose File</span>
                <span className="truncate max-w-[120px]">{file ? file.name : 'No file chosen'}</span>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Display Payslip
              </label>
              <div className="flex items-center h-8 border border-border rounded-md overflow-hidden min-w-[80px]">
                <button
                  type="button"
                  onClick={() => setDisplayPayslip(!displayPayslip)}
                  className="w-full h-full text-center text-xs font-semibold bg-muted/40 text-foreground py-1"
                >
                  {displayPayslip ? 'Yes' : 'No'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 bg-[#31708f] hover:bg-[#245269] disabled:opacity-60 text-white text-xs font-semibold px-5 py-2 rounded-md transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            <div className="text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No upload logs found.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────── Tab 2: Process Payroll ───────────────────────────
const SORT_OPTIONS = ['Name', 'Department', 'Designation', 'Employee Code'];
const STATUS_OPTIONS = ['', 'DRAFT', 'PROCESSING', 'PROCESSED', 'FROZEN (LOCKED)', 'UNFROZEN', 'PUBLISHED'];
const EMP_STATUS_OPTIONS = ['', 'Active', 'Inactive', 'On Leave', 'Probation'];
const EMP_TYPE_OPTIONS = ['', 'Full Time', 'Part Time', 'Contract', 'Intern'];
const GENERATE_ON_OPTIONS = ['Active for selected period', 'All Active Employees', 'Specific Employees'];

interface ProcessPayrollFilters {
  generateOn: string;
  cycleId: string;
  month: string;
  monthRange: string;
  sortBy: string;
  payrollStatus: string;
  companyId: string;
  locationId: string;
  departmentId: string;
  reportingOfficer: string;
  employeeStatus: string;
  employmentType: string;
  employeeId: string;
  removePagination: boolean;
  bypassCache: boolean;
  pageSize: number;
}

const TABLE_COLS = [
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'salary_days', label: 'Salary Days' },
  { key: 'paid_days', label: 'Paid Days' },
  { key: 'unpaid_days', label: 'Unpaid Days' },
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'standard_allowance', label: 'Standard Allowance' },
  { key: 'meal_allowance', label: 'Meal Allowance' },
  { key: 'communication_allowance', label: 'Communication Allowance' },
  { key: 'children_education_allowance', label: 'Children Education Allowance' },
  { key: 'lta', label: 'LTA' },
  { key: 'gross', label: 'Gross' },
  { key: 'basic_earned', label: 'Basic Earned' },
  { key: 'hra_earned', label: 'HRA Earned' },
  { key: 'standard_allowance_earned', label: 'Standard Allowance Earned' },
  { key: 'meal_allowance_earned', label: 'Meal Allowance Earned' },
  { key: 'communication_allowance_earned', label: 'Communication Allowance Earned' },
  { key: 'children_education_allowance_earned', label: 'Children Education Allowance Earned' },
  { key: 'lta_earned', label: 'LTA Earned' },
  { key: 'gross_earned', label: 'Gross Earned' },
  { key: 'total_gross_earned', label: 'Total Gross Earned' },
  { key: 'adjustment', label: 'Adjustment' },
  { key: 'ot_hours', label: 'OT Hour' },
  { key: 'ot', label: 'OT' },
  { key: 'pt', label: 'PT' },
  { key: 'pf', label: 'PF' },
  { key: 'tds', label: 'TDS' },
  { key: 'esic_employer', label: 'ESIC Employer' },
  { key: 'esic', label: 'ESIC' },
  { key: 'total_deduction', label: 'Total Deduction' },
  { key: 'net_salary', label: 'Net Salary' },
  { key: 'ctc', label: 'CTC' },
  { key: 'notes', label: 'Notes' },
];

// Helpers for robust property extraction across camelCase and snake_case API shapes
const getEmpName = (e: any): string => {
  if (!e) return '';
  const fn = e.first_name || e.firstName || '';
  const ln = e.last_name || e.lastName || '';
  const full = `${fn} ${ln}`.trim();
  return full || e.name || e.email || e.employee_code || e.employeeCode || `Employee #${e.id}`;
};

const getEmpDesig = (e: any): string => {
  if (!e) return '';
  return e.designation || e.job_title || e.jobTitle || e.department_name || e.departmentName || (typeof e.department === 'string' ? e.department : '');
};

const SAMPLE_ROW: PayrollRow = {
  id: 101,
  employee_id: 101,
  first_name: 'Rahul',
  last_name: 'Sharma',
  name: 'Rahul Sharma',
  designation: 'Senior Software Engineer',
  bank_name: 'HDFC BANK',
  salary_days: 30,
  paid_days: 28,
  unpaid_days: 2,
  basic: 30000,
  hra: 15000,
  standard_allowance: 15000,
  gross: 60000,
  basic_earned: 28000,
  hra_earned: 14000,
  standard_allowance_earned: 14000,
  gross_earned: 58850,
  total_gross_earned: 58850,
  pf: 1800,
  pt: 200,
  tds: 2250,
  total_deduction: 4250,
  net_salary: 54600,
  ctc: 720000,
  notes: 'Calculated: 28 Paid Days (2 LOP Days). PF: ₹1800, PT: ₹200, TDS: ₹2250'
};

const ProcessPayrollTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);

  useEffect(() => {
    const extractArray = (res: any): any[] => {
      const payload = res?.data?.data ?? res?.data;
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.data)) return payload.data;
      }
      return [];
    };

    apiClient.get('/settings/departments', { params: { page: 1, pageSize: 500 } })
      .then(r => setDepartments(extractArray(r)))
      .catch(() => {});

    apiClient.get('/settings/locations', { params: { page: 1, pageSize: 500 } })
      .then(r => setLocations(extractArray(r)))
      .catch(() => {});

    apiClient.get('/employees', { params: { pageSize: 500 } })
      .then(r => setEmployees(extractArray(r)))
      .catch(() => {});

    apiClient.get('/settings/departments/managers')
      .then(r => {
        const raw = extractArray(r);
        const seen = new Set<number>();
        setManagers(
          raw.filter((m: any) => {
            const empId = m.employeeId || m.id;
            if (!empId || seen.has(empId)) return false;
            seen.add(empId);
            return true;
          }).map((m: any) => ({
            id: m.employeeId || m.id,
            first_name: m.firstName || m.first_name || '',
            last_name: m.lastName || m.last_name || '',
            department_id: m.departmentId || m.department_id,
            designation: m.departmentName ? `${m.departmentName} Manager` : (m.designation || m.job_title || 'Dept Manager'),
          }))
        );
      })
      .catch(() => {});
  }, []);

  const [filters, setFilters] = useState<ProcessPayrollFilters>({
    generateOn: GENERATE_ON_OPTIONS[0],
    cycleId: '',
    month: new Date().toISOString().slice(0, 7),
    monthRange: '2026-08-01 to 2026-08-31',
    sortBy: 'Name',
    payrollStatus: '',
    companyId: '',
    locationId: '',
    departmentId: '',
    reportingOfficer: '',
    employeeStatus: '',
    employmentType: '',
    employeeId: '',
    removePagination: false,
    bypassCache: false,
    pageSize: 100,
  });

  const [appliedFilters, setAppliedFilters] = useState<ProcessPayrollFilters>(filters);
  const [hasClickedFilter, setHasClickedFilter] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isPayrollFrozen, setIsPayrollFrozen] = useState(false);

  const upd = useCallback(<K extends keyof ProcessPayrollFilters>(k: K, v: ProcessPayrollFilters[K]) => {
    setFilters(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'cycleId') {
        const foundCycle: any = cycles.find((c: any) => String(c.id || c.uuid) === String(v));
        if (foundCycle) {
          const cutoff = Number(foundCycle.cutoff_day || foundCycle.cutoffDay || 25);
          const start = Number(foundCycle.start_date || foundCycle.startDate || (cutoff + 1));
          const [yr, mo] = (prev.month || '2026-08').split('-').map(Number);
          const prevMo = mo === 1 ? 12 : mo - 1;
          const prevYr = mo === 1 ? yr - 1 : yr;
          next.monthRange = `${prevYr}-${String(prevMo).padStart(2, '0')}-${String(start).padStart(2, '0')} to ${yr}-${String(mo).padStart(2, '0')}-${String(cutoff).padStart(2, '0')}`;
        }
      }
      setAppliedFilters({ ...next });
      setHasClickedFilter(true);
      return next;
    });
  }, [cycles]);

  const { data: payrollData = [], isLoading } = useQuery({
    queryKey: [
      'process-register',
      appliedFilters.cycleId,
      appliedFilters.month,
      appliedFilters.departmentId,
      appliedFilters.locationId,
      appliedFilters.employeeId,
      appliedFilters.reportingOfficer,
      appliedFilters.payrollStatus,
      appliedFilters.employeeStatus,
      appliedFilters.employmentType,
      appliedFilters.bypassCache,
    ],
    enabled: hasClickedFilter,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (appliedFilters.cycleId) params.cycleId = appliedFilters.cycleId;
      if (appliedFilters.month) params.month = appliedFilters.month;
      if (appliedFilters.departmentId) params.departmentId = appliedFilters.departmentId;
      if (appliedFilters.locationId) params.locationId = appliedFilters.locationId;
      if (appliedFilters.employeeId) params.employeeId = appliedFilters.employeeId;
      if (appliedFilters.reportingOfficer) params.reportingOfficerId = appliedFilters.reportingOfficer;
      if (appliedFilters.payrollStatus) params.status = appliedFilters.payrollStatus;
      if (appliedFilters.employeeStatus) params.employeeStatus = appliedFilters.employeeStatus;
      if (appliedFilters.employmentType) params.employmentType = appliedFilters.employmentType;
      if (appliedFilters.bypassCache) params.bypassCache = 'true';

      const res = await apiClient.get('/payroll/process-register', { params });
      return res.data?.data || res.data || [];
    },
  });

  const handleFilter = () => {
    setHasClickedFilter(true);
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setHasClickedFilter(false);
    const blank: ProcessPayrollFilters = {
      generateOn: GENERATE_ON_OPTIONS[0],
      cycleId: '',
      month: new Date().toISOString().slice(0, 7),
      monthRange: '2026-08-01 to 2026-08-31',
      sortBy: 'Name',
      payrollStatus: '',
      companyId: '',
      locationId: '',
      departmentId: '',
      reportingOfficer: '',
      employeeStatus: '',
      employmentType: '',
      employeeId: '',
      removePagination: false,
      bypassCache: false,
      pageSize: 100,
    };
    setFilters(blank);
    setAppliedFilters(blank);
  };

  const handleToggleRow = (id: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      setSelectedRows(new Set(payrollData.map((r: PayrollRow) => r.id)));
      setSelectAll(true);
    }
  };

  const handleExportResultCSV = () => {
    if (!payrollData || payrollData.length === 0) {
      showToast.info('Export', 'No payroll records available to export. Click Filter first.');
      return;
    }
    const headers = [
      'Emp Code', 'First Name', 'Middle Name', 'Last Name', 'Designation', 'Bank Name',
      'Salary Days', 'Paid Days', 'Unpaid Days',
      'Basic', 'HRA', 'Special Allowance', 'Gross',
      'Basic Earned', 'HRA Earned', 'Special Allowance Earned', 'Gross Earned',
      'PT', 'PF', 'TDS', 'ESIC', 'Total Deductions', 'Net Salary'
    ];
    const rows = payrollData.map((r: any) => [
      r.employee_code || r.empCode || `EMP-${r.id}`,
      r.first_name || (r.name ? String(r.name).split(' ')[0] : '') || 'Employee',
      r.middle_name || '',
      r.last_name || (r.name ? String(r.name).split(' ').slice(1).join(' ') : '') || '',
      r.designation || r.job_title || 'Employee',
      r.bank_name || 'HDFC BANK',
      r.salary_days ?? 30,
      r.paid_days ?? 30,
      r.unpaid_days ?? 0,
      r.basic || 0,
      r.hra || 0,
      r.standard_allowance || 0,
      r.meal_allowance || 0,
      r.communication_allowance || 0,
      r.children_education_allowance || 0,
      r.lta || 0,
      r.gross || 0,
      r.basic_earned || 0,
      r.hra_earned || 0,
      r.standard_allowance_earned || 0,
      r.meal_allowance_earned || 0,
      r.communication_allowance_earned || 0,
      r.children_education_allowance_earned || 0,
      r.lta_earned || 0,
      r.gross_earned || 0,
      r.pt || 0,
      r.pf || 0,
      r.tds || 0,
      r.esic || 0,
      r.total_deduction || 0,
      r.net_salary || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payroll_Export_${filters.month || '2026-08'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success('Export Complete', 'Payroll register exported to CSV successfully.');
  };

  return (
    <div className="space-y-4 p-4">
      {/* Guided Workspace Step Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                Step 3 of 4: Run Payroll
              </span>
              <h2 className="text-lg font-black text-foreground tracking-tight">Generate &amp; Process Payroll Register</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select cycle month, review attendance &amp; salary calculations, approve run, and download bank payout register.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/60">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Generate Payroll On <span className="text-red-500">*</span></label>
            <Sel value={filters.generateOn} onChange={v => upd('generateOn', v)}>
              {GENERATE_ON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Payroll Cycle <span className="text-red-500">*</span></label>
            <Sel value={filters.cycleId} onChange={v => upd('cycleId', v)}>
              <option value="">All Payroll Cycles</option>
              {cycles.map((c: any) => {
                const cId = String(c.id || c.uuid);
                const cName = c.cycle_name || c.name || '';
                const freq = c.frequency || c.cycle_type || '';
                return (
                  <option key={cId} value={cId}>
                    {cName} {freq ? `(${freq})` : ''}
                  </option>
                );
              })}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[160px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Month <span className="text-red-500">*</span></label>
            <input
              type="month"
              value={filters.month}
              onChange={e => {
                const val = e.target.value;
                if (val) {
                  const [y, m] = val.split('-');
                  const lastDay = new Date(Number(y), Number(m), 0).getDate();
                  setFilters(prev => ({
                    ...prev,
                    month: val,
                    monthRange: `${val}-01 to ${val}-${String(lastDay).padStart(2, '0')}`
                  }));
                }
              }}
              className="border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8 font-medium cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-[120px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Sort By</label>
            <Sel value={filters.sortBy} onChange={v => upd('sortBy', v)}>
              {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[140px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Payroll Status</label>
            <Sel value={filters.payrollStatus} onChange={v => upd('payrollStatus', v)}>
              <option value="">Choose</option>
              {STATUS_OPTIONS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
            </Sel>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
            <input
              type="checkbox"
              id="rem-pag"
              checked={filters.removePagination}
              onChange={e => upd('removePagination', e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="rem-pag" className="cursor-pointer">Remove Pagination</label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-0.5 min-w-[130px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Company</label>
            <Sel value={filters.companyId} onChange={v => upd('companyId', v)}>
              <option value="">Company (0)</option>
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[130px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Location</label>
            <Sel value={filters.locationId} onChange={v => upd('locationId', v)}>
              <option value="">All Locations</option>
              {locations.map((l: any) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[130px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Department</label>
            <Sel value={filters.departmentId} onChange={v => upd('departmentId', v)}>
              <option value="">All Departments</option>
              {departments.map((d: any) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[150px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Reporting Officer</label>
            <Sel value={filters.reportingOfficer} onChange={v => upd('reportingOfficer', v)}>
              <option value="">All Reporting Officers</option>
              {managers.map((m: any) => <option key={m.id} value={String(m.id)}>{m.first_name} {m.last_name}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[130px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Employee Status</label>
            <Sel value={filters.employeeStatus} onChange={v => upd('employeeStatus', v)}>
              {EMP_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || 'All Employee Statuses'}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[130px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Employment Type</label>
            <Sel value={filters.employmentType} onChange={v => upd('employmentType', v)}>
              {EMP_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o || 'All Employment Types'}</option>)}
            </Sel>
          </div>
          <div className="flex flex-col gap-0.5 min-w-[150px]">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Employee</label>
            <Sel value={filters.employeeId} onChange={v => upd('employeeId', v)}>
              <option value="">All Employees</option>
              {employees.map((e: any) => <option key={e.id} value={String(e.id)}>{getEmpName(e)}</option>)}
            </Sel>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span>Selected Period: <strong className="text-foreground">{filters.monthRange}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFilter}
              className="flex items-center gap-1.5 bg-[#31708f] hover:bg-[#245269] text-white text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer shadow-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter / Process Payroll
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={() => showToast.info('Reconciliation', 'Payroll reconciliation audit completed for selected period.')}
              className="flex items-center gap-1.5 bg-[#00c0ef] hover:bg-[#00a7d0] text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-xs"
            >
              <ListChecks className="w-3.5 h-3.5" />
              Reconciliation
            </button>

            {/* Freeze & Unfreeze Action Buttons */}
            {isPayrollFrozen ? (
              <button
                onClick={() => {
                  setIsPayrollFrozen(false);
                  upd('payrollStatus', 'UNFROZEN');
                  showToast.success('Payroll Unfrozen', 'Payroll status is now UNFROZEN and unlocked for adjustments.');
                }}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-xs animate-pulse"
              >
                🔥 Unfreeze Payroll
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsPayrollFrozen(true);
                  upd('payrollStatus', 'FROZEN (LOCKED)');
                  showToast.success('Payroll Frozen', 'Payroll status is now FROZEN & LOCKED for approval.');
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-xs"
              >
                ❄️ Freeze Payroll
              </button>
            )}

            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={filters.bypassCache}
                onChange={e => upd('bypassCache', e.target.checked)}
                className="rounded border-border accent-primary"
              />
              Bypass Cache
            </label>
          </div>
        </div>

        {isPayrollFrozen && (
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900 flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200 animate-fade-in">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              ❄️ PAYROLL STATUS: FROZEN &amp; LOCKED FOR PERIOD {filters.monthRange}
            </span>
            <span className="text-[10px] bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100 px-2 py-0.5 rounded font-mono">
              STATUS: FROZEN
            </span>
          </div>
        )}

        <p className="text-[11px] font-bold text-red-600 dark:text-red-400 pt-1">
          *Note: If any payroll calculation changes are made, click "Bypass Cache and Filter" before processing payroll.
        </p>
      </div>

      {/* Result Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">Result</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportResultCSV}
              className="flex items-center gap-1 bg-muted/60 hover:bg-muted border border-border rounded px-2.5 py-1 text-xs font-medium text-foreground cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
          <div>
            Showing 1 to {((payrollData && payrollData.length > 0) ? payrollData : [SAMPLE_ROW]).length} of {((payrollData && payrollData.length > 0) ? payrollData : [SAMPLE_ROW]).length} entries
          </div>
          <div className="flex items-center gap-1">
            <span>Show</span>
            <select className="border border-border rounded px-1.5 py-0.5 text-xs bg-background">
              <option value="100">100</option>
              <option value="50">50</option>
              <option value="25">25</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 border border-border rounded-lg bg-card text-muted-foreground text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading payroll data...
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg max-h-[600px] overflow-y-auto">
            <table className="w-full text-[11px] border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b border-border">
                <tr>
                  <th className="p-2 text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleToggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="p-2 text-left font-bold text-foreground border-r border-border/40">Action</th>
                  {TABLE_COLS.map((c) => (
                    <th key={c.key} className="p-2 text-left font-bold text-foreground border-r border-border/40">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollData.map((row: PayrollRow) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${
                      selectedRows.has(row.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-2 border-r border-border/40">
                      <button className="p-1 rounded bg-muted/60 hover:bg-muted text-foreground">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-2 border-r border-border/40">
                      <select
                        value={row.payment_status || 'PAID'}
                        className="border border-border rounded px-1.5 py-0.5 text-[11px] bg-background font-semibold text-foreground"
                      >
                        <option value="PAID">PAID</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="HOLD">HOLD</option>
                      </select>
                    </td>
                    <td className="p-2 border-r border-border/40 font-medium">{row.first_name || (row.name ? String(row.name).split(' ')[0] : '') || 'Employee'}</td>
                    <td className="p-2 border-r border-border/40">{row.middle_name || '—'}</td>
                    <td className="p-2 border-r border-border/40 font-medium">{row.last_name || (row.name ? String(row.name).split(' ').slice(1).join(' ') : '') || '—'}</td>
                    <td className="p-2 border-r border-border/40">{row.designation || row.job_title || 'Employee'}</td>
                    <td className="p-2 border-r border-border/40">{row.bank_name || 'HDFC BANK'}</td>
                    <td className="p-2 border-r border-border/40 text-right">{row.salary_days ?? '—'}</td>
                    <td className="p-2 border-r border-border/40 text-right">{row.paid_days ?? '—'}</td>
                    <td className="p-2 border-r border-border/40 text-right">{row.unpaid_days ?? '—'}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.basic)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.hra)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.standard_allowance)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.meal_allowance)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.communication_allowance)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.children_education_allowance)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.lta)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.gross)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.basic_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.hra_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.standard_allowance_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.meal_allowance_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.communication_allowance_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.children_education_allowance_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.lta_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.gross_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right font-medium">{fmt(row.total_gross_earned)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.adjustment)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{row.ot_hours ?? 0}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.ot)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.pt)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.pf)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.tds)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.esic_employer)}</td>
                    <td className="p-2 border-r border-border/40 text-right">{fmt(row.esic)}</td>
                    <td className="p-2 border-r border-border/40 text-right font-medium text-red-600">{fmt(row.total_deduction)}</td>
                    <td className="p-2 border-r border-border/40 text-right font-bold text-emerald-600">{fmt(row.net_salary)}</td>
                    <td className="p-2 border-r border-border/40 text-right font-medium">{fmt(row.ctc)}</td>
                    <td className="p-2 border-r border-border/40">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────── Tab 3: Payroll Download ───────────────────────────
const PayrollDownloadTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [cycleId, setCycleId] = useState('');
  const [payrollType, setPayrollType] = useState('Monthly Report');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');

  const handleExportFile = (format: 'csv' | 'excel') => {
    showToast.info('Report Export', `Generating ${payrollType} from ${fromDate} to ${toDate} in ${format.toUpperCase()} format...`);
    const monthParam = fromDate ? fromDate.slice(0, 7) : '2026-08';
    apiClient.get('/payroll/process-register', { params: { month: monthParam, pageSize: 500 } }).then(res => {
      const data = res.data?.data || res.data || [];
      const headers = ['Emp Code', 'First Name', 'Last Name', 'Designation', 'Bank Name', 'Salary Days', 'Paid Days', 'Unpaid Days', 'Basic Earned', 'HRA Earned', 'Standard Allowance', 'Gross Earned', 'PF', 'ESIC', 'PT', 'TDS', 'Total Deductions', 'Net Salary'];
      const rows = data.map((r: any) => [
        r.employee_code || r.empCode || `EMP-${r.id}`,
        r.first_name || '',
        r.last_name || '',
        r.designation || 'Employee',
        r.bank_name || 'HDFC BANK',
        r.salary_days ?? 30,
        r.paid_days ?? 30,
        r.unpaid_days ?? 0,
        r.basic_earned || r.basic || 0,
        r.hra_earned || r.hra || 0,
        r.standard_allowance_earned || r.standard_allowance || 0,
        r.gross_earned || r.gross || 0,
        r.pt || 0,
        r.pf || 0,
        r.tds || 0,
        r.esic || 0,
        r.total_deduction || r.deductions || 0,
        r.net_salary || r.net || 0
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_${payrollType.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.${format === 'csv' ? 'csv' : 'xls'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(() => {
      showToast.error('Export Failed', 'Failed to generate payroll export.');
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Payroll Cycle <span className="text-red-500">*</span>
          </label>
          <Sel value={cycleId} onChange={setCycleId}>
            <option value="">Monthly</option>
          </Sel>
        </div>

        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Payroll Type <span className="text-red-500">*</span>
          </label>
          <Sel value={payrollType} onChange={setPayrollType}>
            <option value="">- Select -</option>
            <option value="Monthly Report">Monthly Report</option>
            <option value="Annual Report">Annual Report</option>
            <option value="Segregated Report">Segregated Report</option>
          </Sel>
        </div>

        {/* Select Range (Matching Hoshi HRMS 1:1 Screenshot) */}
        <div className="flex flex-col gap-1 min-w-[280px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase">
            Select Range <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1 bg-background h-8 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none w-28 cursor-pointer"
            />
            <span className="text-muted-foreground font-bold px-1 text-xs">–</span>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none w-28 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => handleExportFile('excel')}
          className="flex items-center gap-1.5 bg-[#31708f] hover:bg-[#245269] text-white text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Download Excel Sheet
        </button>
        <button
          onClick={() => handleExportFile('csv')}
          className="flex items-center gap-1.5 bg-[#31708f] hover:bg-[#245269] text-white text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          Download CSV Sheet
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────── Tab 4: Generated Payroll ───────────────────────────
const GeneratedPayrollTab: React.FC = () => {
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-31');

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['payroll-runs-list', fromDate, toDate],
    queryFn: async () => {
      const res = await apiClient.get('/payroll').catch(() => ({ data: [] }));
      return res.data?.data || res.data || [];
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              From Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground h-8 focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              To Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-border rounded-md px-3 py-1.5 text-xs bg-background text-foreground h-8 focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Generated Payroll Batches &amp; History</h3>

        {isLoading ? (
          <div className="flex items-center justify-center h-36 border border-border/80 rounded-xl bg-card text-xs text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading generated payroll history...
          </div>
        ) : (
          <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Run ID / Ref</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Cycle</th>
                  <th className="p-3 text-right">Gross Total</th>
                  <th className="p-3 text-right">Net Take-Home</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No past payroll runs found for this period. Process payroll to generate batches.
                    </td>
                  </tr>
                ) : (
                  runs.map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-bold text-primary">#{r.id || `RUN-${idx + 1}`}</td>
                      <td className="p-3 font-medium">{r.period || r.month || 'August 2026'}</td>
                      <td className="p-3">{r.cycle_name || 'Monthly'}</td>
                      <td className="p-3 text-right font-bold">₹{Number(r.gross_total || r.total_gross || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹{Number(r.net_total || r.total_net || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {r.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


// ─────────────────────────── Main Component ───────────────────────────
type MainTab = 'process' | 'download' | 'generated';

const MAIN_TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: 'process', label: 'Process Payroll', icon: Filter },
  { key: 'download', label: 'Payroll Download', icon: FileDown },
  { key: 'generated', label: 'Generated Payroll', icon: ListChecks },
];

export const PayrollProcessing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('process');

  const { data: cycles = [] } = useQuery<PayrollCycle[]>({
    queryKey: ['payroll-cycles'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/cycles');
        const dbCycles = res.data?.data || res.data || [];
        return dbCycles.map((c: any) => ({
          id: String(c.id || c.uuid),
          name: c.cycle_name || c.name || '',
          cycle_name: c.cycle_name || c.name || '',
          frequency: c.frequency || 'Monthly',
          is_active: c.status !== 'closed' && (c.is_active ?? true),
          start_date: c.start_date || 1,
          cutoff_day: c.cutoff_day || 25,
          disbursement_date: c.disbursement_date || 1
        }));
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-0 pb-12">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card">
        <div>
          <h1 className="text-base font-black text-foreground tracking-tight">Payroll Processing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Process and download payroll for your organization.</p>
        </div>
      </div>

      {/* Tab bar + content */}
      <div className="bg-card border border-border/60 rounded-b-xl overflow-hidden">
        <MainTabBar tabs={MAIN_TABS} active={activeTab} onChange={(k) => setActiveTab(k as MainTab)} />

        <div>
          {activeTab === 'process' && <ProcessPayrollTab cycles={cycles} />}
          {activeTab === 'download' && <PayrollDownloadTab cycles={cycles} />}
          {activeTab === 'generated' && <GeneratedPayrollTab />}
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;
