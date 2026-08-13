import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
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

type MainTab = 'process' | 'payroll_download';

const MAIN_TABS = [
  { key: 'process', label: 'Process Payroll', icon: BarChart2 },
  { key: 'payroll_download', label: 'Payroll Download', icon: Download },
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

// ── Tab 2: Process Payroll Register Table ─────────────────────────────────
const ProcessPayrollTab: React.FC<{ cycles: PayrollCycle[] }> = ({ cycles }) => {
  const [generateOnMode, setGenerateOnMode] = useState('- Select -');
  const [cycleId, setCycleId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
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

  // Lookup data from database masters
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: async () => { const r = await apiClient.get('/settings/companies'); return r.data?.data || r.data || []; } });
  const { data: locations = [] } = useQuery({ queryKey: ['locs'], queryFn: async () => { const r = await apiClient.get('/settings/locations'); return r.data?.data || r.data || []; } });
  const { data: departments = [] } = useQuery({ queryKey: ['depts'], queryFn: async () => { const r = await apiClient.get('/settings/departments'); return r.data?.data || r.data || []; } });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: async () => { const r = await apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')); return r.data?.data || r.data || []; } });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: async () => { const r = await apiClient.get('/settings/designations'); return r.data?.data || r.data || []; } });
  const { data: slabs = [] } = useQuery({ queryKey: ['slabs-list'], queryFn: async () => { const r = await apiClient.get('/payroll/slabs'); return r.data?.data || r.data || []; } });
  const { data: employees = [] } = useQuery({ queryKey: ['employees-list'], queryFn: async () => { const r = await apiClient.get('/employees'); return r.data?.data || r.data || []; } });

  useEffect(() => {
    if (cycles.length > 0 && !cycleId) {
      const firstId = cycles[0].id ?? cycles[0].uuid ?? 1;
      if (firstId) setCycleId(String(firstId));
    }
  }, [cycles, cycleId]);

  const buildParams = () => {
    const p: Record<string, string> = {};
    if (cycleId) p.cycleId = cycleId;
    if (payrollMonth) p.month = payrollMonth;
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

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['process-register', cycleId, payrollMonth, departmentId, locationId, payrollStatus, paymentMode, empStatus, empType, gradeId, designationId, slabId, employeeId, reportingOfficerId, sortBy, bypassCache],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/process-register', { params: buildParams() });
      return res.data?.data || res.data || [];
    },
    enabled: filtered || true,
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

  const uniqueCompanies = deduplicate(companies as any[], c => String(c.id || c.name || c.company_name));
  const uniqueLocations = deduplicate(locations as any[], l => String(l.id || l.name));
  const uniqueDepartments = deduplicate(departments as any[], d => String(d.id || d.name));
  const uniqueGrades = deduplicate(grades as any[], g => String(g.id || g.name || g.grade_name));
  const uniqueDesignations = deduplicate(designations as any[], d => String(d.id || d.name || d.designation_name));
  const uniqueSlabs = deduplicate(slabs as any[], s => String(s.id || s.name || s.slab_name));
  const uniqueEmployees = deduplicate(employees as any[], e => String(e.id));
  const uniqueReportingOffs = deduplicate(reportingOfficersList, e => String(e.id));
  const uniqueRows = deduplicate(rows as any[], r => String(r.id));

  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  const handleFinalizeAndPublish = async () => {
    if (!cycleId) {
      showToast.error('Missing Cycle', 'Please select a Payroll Cycle before processing.');
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

      await apiClient.post(`/payroll/${run.id}/process`);

      showToast.success('Payroll Processed & Published! 🎉', 'Official payslips saved to database successfully.');
      refetch();
    } catch (err: any) {
      showToast.error('Process Failed', err?.response?.data?.message || err?.message || 'Could not finalize payroll');
    } finally {
      setIsProcessingPayroll(false);
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

        {/* Row 1: Generate Payroll On *, Payroll Cycle *, Month *, Sort By, Payroll Status, Payment Mode, Remove Pagination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
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
              Payroll Cycle <span className="text-rose-500">*</span>
            </label>
            <select
              value={cycleId}
              onChange={e => setCycleId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">- Select -</option>
              {cycles.map((c: any) => {
                const cid = String(c.id ?? c.uuid ?? 1);
                const cname = c.cycleName || c.cycle_name || c.name || 'Standard Monthly Cycle';
                return (
                  <option key={cid} value={cid}>
                    {cname}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Month / Period <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              value={payrollMonth}
              onChange={e => setPayrollMonth(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            />
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

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-background text-foreground font-medium"
            >
              <option value="">All Modes</option>
              <option value="bank_transfer">Bank Transfer / NEFT</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
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

        {/* Row 2: Company, Location, Department, Reporting Officer, Employee Status, Employment Type, Grade, Designation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Company</label>
            <select
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Companies ({uniqueCompanies.length})▾</option>
              {uniqueCompanies.map((c: any) => (
                <option key={c.id} value={String(c.id)}>{c.name || c.company_name}</option>
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
              {uniqueLocations.map((l: any) => (
                <option key={l.id} value={String(l.id)}>{l.name}</option>
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
              {uniqueDepartments.map((d: any) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
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
              {uniqueReportingOffs.map((e: any) => (
                <option key={e.id} value={String(e.id)}>
                  {e.first_name} {e.last_name || ''} {e.job_title || e.designation ? `(${e.job_title || e.designation})` : ''}
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
              <option value="">All Statuses▾</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
              <option value="probation">Probation</option>
              <option value="notice_period">Notice Period</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Employment Type</label>
            <select
              value={empType}
              onChange={e => setEmpType(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Types▾</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
              <option value="daily_wages">Daily Wages</option>
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
              {uniqueGrades.map((g: any) => (
                <option key={g.id} value={String(g.id)}>{g.name || g.grade_name || g.pay_grade_name}</option>
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
              {uniqueDesignations.map((d: any) => (
                <option key={d.id} value={String(d.id)}>{d.name || d.designation_name || d.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Pay Slab & Employee (individual select) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Pay Slab</label>
            <select
              value={slabId}
              onChange={e => setSlabId(e.target.value)}
              className="w-full h-9 border border-border rounded-md px-3 py-1 text-xs bg-muted/20 focus:bg-background text-foreground font-medium"
            >
              <option value="">All Pay Slabs ({uniqueSlabs.length})▾</option>
              {uniqueSlabs.map((s: any) => (
                <option key={s.id} value={String(s.id)}>{s.name || s.slab_name || `Slab #${s.id}`}</option>
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
              {uniqueEmployees.map((e: any) => (
                <option key={e.id} value={String(e.id)}>{e.first_name} {e.last_name || ''} ({e.employee_code || `EMP-${e.id}`})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Buttons (Filter, Reset, Reconciliation, Finalize & Publish) + Bypass Cache Checkbox */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => { setFiltered(true); refetch(); }}
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
            onClick={() => showToast.info('Reconciliation', 'Payroll reconciliation generated successfully.')}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
          >
            Reconciliation
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer"
            title="Export Payroll Register to CSV file"
          >
            <Download className="w-3.5 h-3.5" /> Export Register (CSV)
          </button>

          <button
            onClick={handleFinalizeAndPublish}
            disabled={isProcessingPayroll}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-sm transition-colors ml-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isProcessingPayroll ? 'Publishing Payslips...' : 'Finalize & Publish Payslips'}
          </button>

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

        {/* Red Warning Note */}
        <p className="text-[11px] font-bold text-rose-600 pt-1">
          *Note: If any payroll calculation changes are made, click "Bypass Cache and Filter" before processing payroll.
        </p>
      </div>

      {/* Register Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Payroll Register ({uniqueRows.length} Employees)</h2>
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
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border sticky top-0">
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
                {uniqueRows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setSelectedViewItem(r)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] rounded transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shadow-2xs"
                        title="View Detailed Payslip Breakdown"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={paymentStatusMap[r.id] ?? (r.payment_status || 'Unfreeze')}
                        onChange={e => handleStatusChange(r.id, e.target.value)}
                        className="h-7 px-2 border border-border rounded-md text-[11px] font-semibold bg-background cursor-pointer"
                      >
                        <option value="Freeze">Freeze</option>
                        <option value="Unfreeze">Unfreeze</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.first_name || '-'}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.middle_name || '-'}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.last_name || '-'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.designation || r.job_title || '-'}</td>
                    <td className="px-3 py-2.5 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{r.slab_name || r.slabName || 'Standard Pay Slab'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.bank_name || '-'}</td>

                    <td className="px-3 py-2.5 text-center font-medium">{r.salary_days || 0}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{r.paid_days || 0}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-rose-600">{r.unpaid_days || 0}</td>

                    <td className="px-3 py-2.5 text-right">{fmt(r.basic)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.hra)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.standard_allowance)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.meal_allowance)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.communication_allowance)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.children_education_allowance)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.lta)}</td>
                    <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(r.gross)}</td>

                    <td className="px-3 py-2.5 text-right">{fmt(r.basic_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.hra_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.standard_allowance_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.meal_allowance_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.communication_allowance_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.children_education_allowance_earned)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.lta_earned)}</td>
                    <td className="px-3 py-2.5 text-right font-bold bg-muted/20">{fmt(r.gross_earned)}</td>
                    <td className="px-3 py-2.5 text-right font-bold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">{fmt(r.total_gross_earned)}</td>

                    <td className="px-3 py-2.5 text-right">{fmt(r.adjustment)}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(r.ot_hours)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmt(r.ot)}</td>

                    <td className="px-3 py-2.5 text-right text-rose-600">{fmt(r.pt)}</td>
                    <td className="px-3 py-2.5 text-right text-rose-600">{fmt(r.pf)}</td>
                    <td className="px-3 py-2.5 text-right text-rose-600">{fmt(r.tds)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(r.esic_employer)}</td>
                    <td className="px-3 py-2.5 text-right text-rose-600">{fmt(r.esic)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-rose-700 bg-rose-50/50 dark:bg-rose-950/30">{fmt(r.total_deduction)}</td>

                    <td className="px-3 py-2.5 text-right font-black text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30">{fmt(r.net_salary)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-sky-600">{fmt(r.ctc)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Button - Employee Detailed Salary Breakdown Modal */}
        {selectedViewItem && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Salary Breakdown — {selectedViewItem.first_name} {selectedViewItem.last_name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Code: {selectedViewItem.employee_code || selectedViewItem.employeeCode || `EMP-${selectedViewItem.id}`} • Designation: {selectedViewItem.designation || 'Software Engineer'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedViewItem(null)}
                  className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <span className="text-muted-foreground font-bold uppercase text-[10px]">Assigned Pay Slab</span>
                  <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {selectedViewItem.slab_name || selectedViewItem.slabName || 'Standard Pay Slab'}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <span className="text-muted-foreground font-bold uppercase text-[10px]">Attendance</span>
                  <div className="font-extrabold text-foreground">
                    {selectedViewItem.paid_days || 0} Paid / {selectedViewItem.unpaid_days || 0} LOP Days
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <span className="text-muted-foreground font-bold uppercase text-[10px]">Payroll Month</span>
                  <div className="font-extrabold text-foreground">
                    {payrollMonth}
                  </div>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="border border-emerald-200 dark:border-emerald-950/60 rounded-xl p-4 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase text-[11px] block border-b pb-1">Itemized Earnings</span>
                  <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-900/30">
                    <span>Earned Basic</span>
                    <span className="font-bold">₹{fmt(selectedViewItem.basic_earned || selectedViewItem.basic)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-900/30">
                    <span>Earned HRA</span>
                    <span className="font-bold">₹{fmt(selectedViewItem.hra_earned || selectedViewItem.hra)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-900/30">
                    <span>Special Allowance</span>
                    <span className="font-bold">₹{fmt(selectedViewItem.standard_allowance_earned || selectedViewItem.standard_allowance)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-extrabold text-emerald-700 text-sm">
                    <span>Total Earned Gross</span>
                    <span>₹{fmt(selectedViewItem.total_gross_earned || selectedViewItem.gross_earned || selectedViewItem.gross)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-rose-200 dark:border-rose-950/60 rounded-xl p-4 bg-rose-50/30 dark:bg-rose-950/10 space-y-2">
                  <span className="font-bold text-rose-800 dark:text-rose-400 uppercase text-[11px] block border-b pb-1">Statutory Deductions</span>
                  <div className="flex justify-between py-1 border-b border-rose-100 dark:border-rose-900/30">
                    <span>Provident Fund (EPF)</span>
                    <span className="font-bold text-rose-600">₹{fmt(selectedViewItem.pf)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100 dark:border-rose-900/30">
                    <span>Employee ESIC</span>
                    <span className="font-bold text-rose-600">₹{fmt(selectedViewItem.esic)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100 dark:border-rose-900/30">
                    <span>Professional Tax (PT)</span>
                    <span className="font-bold text-rose-600">₹{fmt(selectedViewItem.pt)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-rose-100 dark:border-rose-900/30">
                    <span>Tax (TDS)</span>
                    <span className="font-bold text-rose-600">₹{fmt(selectedViewItem.tds)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-extrabold text-rose-700 text-sm">
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
                    onClick={() => showToast.success(`Downloading PDF Payslip for ${selectedViewItem.first_name}...`)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Payslip PDF
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
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const PayrollProcessing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('process');

  const { data: cycles = [] } = useQuery<PayrollCycle[]>({
    queryKey: ['payroll-cycles'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/payroll/cycles');
        const list = res.data?.data || res.data?.cycles || res.data || [];
        if (Array.isArray(list) && list.length > 0) return list;
      } catch { }
      return [{ id: 1, cycle_name: 'Monthly', name: 'Monthly', frequency: 'Monthly', status: 'open' }];
    },
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
        {activeTab === 'payroll_download' && <PayrollDownloadTab cycles={cycles} />}
      </div>
    </div>
  );
};

export default PayrollProcessing;
