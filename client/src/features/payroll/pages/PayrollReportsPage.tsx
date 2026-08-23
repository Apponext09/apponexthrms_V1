import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  ShieldCheck,
  CheckCircle2,
  Search,
  RefreshCw,
  Landmark,
  FileText,
  TrendingUp,
  Layers,
  Filter,
  RotateCcw,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

interface ReportRow {
  id: number;
  employee_code?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  designation?: string;
  department_name?: string;
  reporting_manager?: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
  salary_days?: number;
  paid_days?: number;
  unpaid_days?: number;
  basic?: number;
  basic_earned?: number;
  hra?: number;
  hra_earned?: number;
  special_allowance?: number;
  gross?: number;
  gross_earned?: number;
  pf?: number;
  pt?: number;
  tds?: number;
  esic?: number;
  loan_deduction?: number;
  total_deduction?: number;
  net_salary?: number;
  ctc?: number;
  slab_name?: string;
  cycle_id?: number | null;
  cycle_name?: string;
}

// Masking helpers for sensitive bank info
function isBlankOrNA(val?: string | null): boolean {
  if (!val) return true;
  const clean = String(val).trim().toUpperCase();
  return clean === '' || clean === 'N/A' || clean === 'NULL' || clean === 'UNDEFINED';
}

function maskAccount(val?: string | null): string {
  if (isBlankOrNA(val)) return 'N/A';
  const clean = String(val).trim();
  if (clean.length <= 4) return '•'.repeat(clean.length);
  const visible = clean.slice(-4);
  const maskedCount = clean.length - 4;
  return '•'.repeat(maskedCount) + visible;
}

function maskIFSC(val?: string | null): string {
  if (isBlankOrNA(val)) return 'N/A';
  const clean = String(val).trim();
  if (clean.length <= 4) return '•'.repeat(clean.length);
  const visible = clean.slice(-4);
  const maskedCount = clean.length - 4;
  return '•'.repeat(maskedCount) + visible;
}

// Calculate YYYY-MM minus N months
function getRelativeMonth(ym: string, offsetMonths: number): string {
  const [yStr, mStr] = ym.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  const d = new Date(y, m - 1 - offsetMonths, 1);
  const resY = d.getFullYear();
  const resM = String(d.getMonth() + 1).padStart(2, '0');
  return `${resY}-${resM}`;
}

export const PayrollReportsPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedCycle, setSelectedCycle] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('');
  const [slabFilter, setSlabFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState<'ctc' | 'summary' | 'statutory' | 'bank' | 'variance'>('ctc');
  const [showSensitiveBank, setShowSensitiveBank] = useState(false);

  // 1. Fetch real current month database records from process-register API
  const { data: rows = [], isLoading: isCurrentLoading, refetch } = useQuery({
    queryKey: ['payroll-reports-data', selectedMonth, deptFilter, selectedCycle, slabFilter],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/process-register', {
        params: {
          month: selectedMonth,
          companyId: 'ALL',
          departmentId: deptFilter || undefined,
          cycleId: selectedCycle !== 'ALL' ? selectedCycle : undefined,
          slabId: slabFilter || undefined,
        }
      });
      return (res.data?.data || res.data || []) as ReportRow[];
    }
  });

  // 2. Fetch real previous month database records for MoM (Month-on-Month) Variance comparison
  const prevMonth = getRelativeMonth(selectedMonth, 1);
  const { data: prevRows = [], isLoading: isPrevLoading } = useQuery({
    queryKey: ['payroll-reports-prev-data', prevMonth, deptFilter, selectedCycle, slabFilter],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/process-register', {
        params: {
          month: prevMonth,
          companyId: 'ALL',
          departmentId: deptFilter || undefined,
          cycleId: selectedCycle !== 'ALL' ? selectedCycle : undefined,
          slabId: slabFilter || undefined,
        }
      });
      return (res.data?.data || res.data || []) as ReportRow[];
    },
    enabled: reportType === 'variance'
  });

  // 3. Fetch real payroll cycles list
  const { data: cycles = [] } = useQuery({
    queryKey: ['payroll-master-cycles'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/cycles');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  // 4. Fetch real departments list
  const { data: departments = [] } = useQuery({
    queryKey: ['payroll-master-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/departments').catch(() => apiClient.get('/departments'));
      return (res.data?.data || res.data || []) as any[];
    }
  });

  // 5. Fetch real pay slabs list
  const { data: paySlabs = [] } = useQuery({
    queryKey: ['payroll-master-slabs'],
    queryFn: async () => {
      const res = await apiClient.get('/payroll/slabs');
      return (res.data?.data || res.data || []) as any[];
    }
  });

  // Filter current month rows by search term
  const filteredRows = rows.filter(r => {
    const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
    const code = (r.employee_code || `EMP-${r.id}`).toLowerCase();
    const dept = (r.department_name || '').toLowerCase();
    const desig = (r.designation || '').toLowerCase();
    const term = searchTerm.trim().toLowerCase();

    if (!term) return true;
    return name.includes(term) || code.includes(term) || dept.includes(term) || desig.includes(term);
  });

  // Build Month-on-Month Variance records
  const prevMap = new Map<number, ReportRow>();
  prevRows.forEach(pr => {
    if (pr.id) prevMap.set(pr.id, pr);
  });

  const varianceRows = filteredRows.map(r => {
    const prevR = prevMap.get(r.id);
    const currNet = Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0)));
    const prevNet = prevR ? Number(prevR.net_salary || (Number(prevR.gross_earned || prevR.gross || 0) - Number(prevR.total_deduction || 0))) : 0;
    const diff = currNet - prevNet;
    const percent = prevNet > 0 ? (diff / prevNet) * 100 : (currNet > 0 ? 100 : 0);

    let status: 'new' | 'up' | 'down' | 'same' = 'same';
    if (!prevR || prevNet === 0) {
      status = 'new';
    } else if (diff > 0) {
      status = 'up';
    } else if (diff < 0) {
      status = 'down';
    }

    return {
      ...r,
      currNet,
      prevNet,
      diff,
      percent,
      status
    };
  });

  // Executive Metrics
  const totalEmployees = filteredRows.length;
  const totalGross = filteredRows.reduce((acc, r) => acc + Number(r.gross_earned || r.gross || 0), 0);
  const totalNet = filteredRows.reduce((acc, r) => acc + Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0))), 0);
  const totalPF = filteredRows.reduce((acc, r) => acc + Number(r.pf || 0), 0);
  const totalPT = filteredRows.reduce((acc, r) => acc + Number(r.pt || 0), 0);
  const totalTDS = filteredRows.reduce((acc, r) => acc + Number(r.tds || 0), 0);
  const totalESIC = filteredRows.reduce((acc, r) => acc + Number(r.esic || 0), 0);
  const totalDeductions = filteredRows.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0);
  const totalAnnualCtc = filteredRows.reduce((acc, r) => acc + Number(r.ctc || ((r.gross || 0) * 12)), 0);

  // MoM Metrics
  const totalVarianceDiff = varianceRows.reduce((acc, vr) => acc + vr.diff, 0);
  const increasedCount = varianceRows.filter(vr => vr.status === 'up').length;
  const decreasedCount = varianceRows.filter(vr => vr.status === 'down').length;
  const newCount = varianceRows.filter(vr => vr.status === 'new').length;

  // Per-cycle breakdown (used when multiple cycles exist and 'ALL' is selected)
  const cycleBreakdown = useMemo(() => {
    if (cycles.length <= 1 || selectedCycle !== 'ALL') return [];
    const cycleMap = new Map<string, { id: string; name: string; employees: number; gross: number; net: number; pf: number; pt: number; tds: number; esic: number }>();
    for (const r of filteredRows) {
      const cid = String(r.cycle_id || 'default');
      const cname = r.cycle_name || 'Default Cycle';
      if (!cycleMap.has(cid)) {
        cycleMap.set(cid, { id: cid, name: cname, employees: 0, gross: 0, net: 0, pf: 0, pt: 0, tds: 0, esic: 0 });
      }
      const entry = cycleMap.get(cid)!;
      entry.employees += 1;
      entry.gross += Number(r.gross_earned || r.gross || 0);
      entry.net += Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0)));
      entry.pf += Number(r.pf || 0);
      entry.pt += Number(r.pt || 0);
      entry.tds += Number(r.tds || 0);
      entry.esic += Number(r.esic || 0);
    }
    return Array.from(cycleMap.values());
  }, [cycles, selectedCycle, filteredRows]);

  const handleResetFilters = () => {
    setSelectedCycle('ALL');
    setDeptFilter('');
    setSlabFilter('');
    setSearchTerm('');
    setSelectedMonth('2026-08');
    showToast.info('Filters Reset', 'All report filters restored to defaults.');
  };

  // 1-Click Export CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      showToast.info('Export', 'No payroll records available to export for current selection.');
      return;
    }

    let headers: string[] = [];
    let csvRows: (string | number)[][] = [];

    if (reportType === 'summary') {
      headers = ['Emp Code', 'Employee Name', 'Designation', 'Department', 'Paid Days', 'Gross Earned (₹)', 'PF (₹)', 'PT (₹)', 'TDS (₹)', 'Total Deductions (₹)', 'Net Pay (₹)'];
      csvRows = filteredRows.map(r => [
        r.employee_code || `EMP-${r.id}`,
        `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        r.designation || 'Staff',
        r.department_name || 'General',
        r.paid_days || 30,
        r.gross_earned || r.gross || 0,
        r.pf || 0,
        r.pt || 0,
        r.tds || 0,
        r.total_deduction || 0,
        r.net_salary || 0
      ]);
    } else if (reportType === 'statutory') {
      headers = ['Emp Code', 'Employee Name', 'Gross Pay (₹)', 'EPF Wages (₹)', 'Employee PF 12% (₹)', 'Employer PF 3.67% (₹)', 'EPS 8.33% (₹)', 'PT (₹)', 'TDS (₹)', 'ESIC (₹)'];
      csvRows = filteredRows.map(r => {
        const gross = Number(r.gross_earned || r.gross || 0);
        const epfWages = Math.min(15000, Number(r.basic_earned || r.basic || gross * 0.5));
        const empPf = Number(r.pf || Math.round(epfWages * 0.12));
        const eps = Math.round(epfWages * 0.0833);
        const erPf = empPf - eps;
        return [
          r.employee_code || `EMP-${r.id}`,
          `${r.first_name || ''} ${r.last_name || ''}`.trim(),
          gross,
          epfWages,
          empPf,
          erPf,
          eps,
          r.pt || 0,
          r.tds || 0,
          r.esic || 0
        ];
      });
    } else if (reportType === 'bank') {
      headers = ['Beneficiary Code', 'Beneficiary Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount (₹)', 'Payment Mode', 'Remarks'];
      csvRows = filteredRows.map(r => [
        r.employee_code || `EMP-${r.id}`,
        `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        isBlankOrNA(r.bank_name) ? 'N/A' : r.bank_name!,
        isBlankOrNA(r.account_no) ? 'N/A' : r.account_no!,
        isBlankOrNA(r.ifsc_code) ? 'N/A' : r.ifsc_code!,
        r.net_salary || 0,
        'NEFT',
        `Salary Payout ${selectedMonth}`
      ]);
    } else if (reportType === 'ctc') {
      headers = ['Emp Code', 'Employee Name', 'Department', 'Designation', 'Assigned Slab', 'Annual CTC (₹)', 'Monthly Gross (₹)', 'Est. Net Take-Home (₹)'];
      csvRows = filteredRows.map(r => [
        r.employee_code || `EMP-${r.id}`,
        `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        r.department_name || 'General',
        r.designation || 'Staff',
        r.slab_name || 'Standard Monthly Slab',
        r.ctc || ((r.gross || 0) * 12),
        r.gross || Math.round((r.ctc || 0) / 12),
        r.net_salary || 0
      ]);
    } else {
      headers = ['Emp Code', 'Employee Name', 'Department', `Prev Month (${prevMonth}) Net (₹)`, `Current Month (${selectedMonth}) Net (₹)`, 'Variance (₹)', 'Variance %', 'MoM Status'];
      csvRows = varianceRows.map(vr => [
        vr.employee_code || `EMP-${vr.id}`,
        `${vr.first_name || ''} ${vr.last_name || ''}`.trim(),
        vr.department_name || 'General',
        vr.prevNet,
        vr.currNet,
        vr.diff,
        `${vr.percent >= 0 ? '+' : ''}${vr.percent.toFixed(1)}%`,
        vr.status.toUpperCase()
      ]);
    }

    const csvContent = [headers.join(','), ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payroll_${reportType.toUpperCase()}_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success('Export Complete', `Payroll ${reportType.toUpperCase()} Report downloaded.`);
  };

  const reportTabs = [
    { key: 'ctc', label: 'CTC Master', icon: Layers },
    { key: 'summary', label: 'Summary Register', icon: FileText },
    { key: 'statutory', label: 'Statutory (PF/PT)', icon: ShieldCheck },
    { key: 'bank', label: 'Bank NEFT Payout', icon: Landmark },
    { key: 'variance', label: 'Salary Variance & MoM', icon: TrendingUp },
  ];

  const isLoading = isCurrentLoading || (reportType === 'variance' && isPrevLoading);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ── Modern Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Reports &amp; Compliance Hub</h1>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 mr-1" /> Dynamic Database Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live payroll compliance, statutory PF/PT registers, NEFT bank payout files, and Month-on-Month salary variance analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleExportCSV}
            className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Active Report (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              showToast.success('Refreshed', 'Payroll report data updated from database.');
            }}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ── Top Comprehensive Filter Toolbar (Above Report Section) ── */}
      <Card className="border border-border/80 shadow-xs bg-card p-4 rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            <span>Payroll Report Filters</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Month / Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Payroll Month</label>
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:outline-none w-full cursor-pointer text-foreground"
              />
            </div>
          </div>

          {/* Payroll Cycle Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Payroll Cycle</label>
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9">
              <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={selectedCycle}
                onChange={e => setSelectedCycle(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:outline-none w-full cursor-pointer text-foreground"
              >
                <option value="ALL">All Payroll Cycles</option>
                {cycles.map((c: any) => {
                  const cVal = String(c.id || c.name || '');
                  const cName = c.cycle_name || c.name || `Cycle #${c.id}`;
                  const freq = c.frequency || '';
                  return (
                    <option key={cVal} value={cVal}>
                      {cName} {freq ? `(${freq})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Department</label>
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:outline-none w-full cursor-pointer text-foreground"
              >
                <option value="">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pay Slab Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Assigned Pay Slab</label>
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9">
              <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
              <select
                value={slabFilter}
                onChange={e => setSlabFilter(e.target.value)}
                className="text-xs font-bold bg-transparent border-none focus:outline-none w-full cursor-pointer text-foreground"
              >
                <option value="">All Pay Slabs</option>
                {paySlabs.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.slab_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Search Staff</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Code, Name, Dept..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 text-xs pl-8 bg-background"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Multi-Cycle Process Breakdown (shown when multiple cycles exist) ── */}
      {cycleBreakdown.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {cycleBreakdown.length} Payroll Cycles Active — Click to Filter
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cycleBreakdown.map((cyc, idx) => {
              const palette = [
                { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600' },
                { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600' },
                { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-700 dark:text-violet-300', icon: 'text-violet-600' },
                { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600' },
              ];
              const pal = palette[idx % palette.length];
              return (
                <button
                  key={cyc.id}
                  type="button"
                  onClick={() => setSelectedCycle(cyc.id)}
                  className={`text-left w-full p-4 rounded-xl border ${pal.border} ${pal.bg} hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${pal.text}`}>Payroll Cycle</p>
                      <h4 className="text-sm font-black text-foreground mt-0.5">{cyc.name}</h4>
                    </div>
                    <div className={`p-2 rounded-lg ${pal.bg} border ${pal.border}`}>
                      <Calendar className={`w-4 h-4 ${pal.icon}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Employees</p>
                      <p className="text-base font-black text-foreground">{cyc.employees}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Gross Outlay</p>
                      <p className="text-base font-black text-foreground">₹{cyc.gross.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Net Payout</p>
                      <p className={`text-base font-black ${pal.text}`}>₹{cyc.net.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">PF + PT</p>
                      <p className="text-base font-black text-foreground">₹{(cyc.pf + cyc.pt).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] mt-2.5 font-bold ${pal.text} group-hover:underline`}>Click to view this cycle only →</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4 Executive KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Headcount */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Paid Headcount</p>
              <h3 className="text-2xl font-black text-foreground">{totalEmployees} Staff</h3>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Database Sync
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Gross */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Monthly Gross Outlay</p>
              <h3 className="text-2xl font-black text-foreground">₹{totalGross.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-muted-foreground font-semibold">Total Earned Wages</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Bank Disbursal Net */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Bank Disbursal (Net)</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{totalNet.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-emerald-600 font-bold">Ready for Bank NEFT</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Landmark className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Statutory / MoM Variance Metrics */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            {reportType === 'variance' ? (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">MoM Net Variance ({selectedMonth} vs {prevMonth})</p>
                <h3 className={`text-2xl font-black ${totalVarianceDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totalVarianceDiff >= 0 ? '+' : ''}₹{totalVarianceDiff.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  ↑{increasedCount} Inc | ↓{decreasedCount} Dec | +{newCount} New
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">Statutory Compliance</p>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{totalDeductions.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">PF: ₹{totalPF.toLocaleString('en-IN')} | PT: ₹{totalPT.toLocaleString('en-IN')}</p>
              </div>
            )}
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Report Container with Sub-Tabs Navigation ── */}
      <Card className="border border-border/80 shadow-xs bg-card overflow-hidden">
        {/* Navigation Sub-Tabs Bar */}
        <div className="border-b border-border bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
            {reportTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setReportType(key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  reportType === key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {reportType === 'bank' && (
            <button
              onClick={() => setShowSensitiveBank(prev => !prev)}
              className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={showSensitiveBank ? "Mask sensitive account details" : "Reveal full account details"}
            >
              {showSensitiveBank ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
              {showSensitiveBank ? 'Mask Bank Info' : 'Reveal Bank Info'}
            </button>
          )}
        </div>

        {/* ── Report Content Tables ── */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Employee Name</th>
                  
                  {reportType === 'ctc' && (
                    <>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Assigned Slab</th>
                      <th className="py-3 px-4 text-right">Monthly Gross (₹)</th>
                      <th className="py-3 px-4 text-right font-bold text-emerald-600">Annual CTC (₹)</th>
                    </>
                  )}

                  {reportType === 'summary' && (
                    <>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4 text-center">Paid Days</th>
                      <th className="py-3 px-4 text-right">Gross Pay (₹)</th>
                      <th className="py-3 px-4 text-right">PF (₹)</th>
                      <th className="py-3 px-4 text-right">PT (₹)</th>
                      <th className="py-3 px-4 text-right font-bold text-emerald-600">Net Take-Home (₹)</th>
                    </>
                  )}

                  {reportType === 'statutory' && (
                    <>
                      <th className="py-3 px-4 text-right">Gross Pay</th>
                      <th className="py-3 px-4 text-right">EPF Wages</th>
                      <th className="py-3 px-4 text-right">PF Emp (12%)</th>
                      <th className="py-3 px-4 text-right">EPS (8.33%)</th>
                      <th className="py-3 px-4 text-right">PT Deduction</th>
                      <th className="py-3 px-4 text-right">TDS Withholding</th>
                      <th className="py-3 px-4 text-right">ESIC</th>
                    </>
                  )}

                  {reportType === 'bank' && (
                    <>
                      <th className="py-3 px-4">Bank Name</th>
                      <th className="py-3 px-4 font-mono">Account No</th>
                      <th className="py-3 px-4 font-mono">IFSC Code</th>
                      <th className="py-3 px-4 text-right font-bold text-emerald-600">Payout Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </>
                  )}

                  {reportType === 'variance' && (
                    <>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-right">Prev Month Pay ({prevMonth})</th>
                      <th className="py-3 px-4 text-right">Curr Month Pay ({selectedMonth})</th>
                      <th className="py-3 px-4 text-right">MoM Variance (₹)</th>
                      <th className="py-3 px-4 text-right">MoM Variance %</th>
                      <th className="py-3 px-4 text-center">MoM Status</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading dynamic payroll records from database...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      No payroll records found matching current filter criteria for {selectedMonth}.
                    </td>
                  </tr>
                ) : reportType === 'variance' ? (
                  varianceRows.map((vr, idx) => (
                    <tr key={vr.id || idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {vr.employee_code || `EMP-${vr.id}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {vr.first_name || ''} {vr.last_name || ''}
                      </td>
                      <td className="py-3 px-4 text-foreground font-semibold">{vr.department_name || 'General'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-muted-foreground">
                        ₹{vr.prevNet.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ₹{vr.currNet.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${
                        vr.diff > 0 ? 'text-emerald-600' : vr.diff < 0 ? 'text-rose-600' : 'text-foreground'
                      }`}>
                        {vr.diff > 0 ? `+₹${vr.diff.toLocaleString('en-IN')}` : `₹${vr.diff.toLocaleString('en-IN')}`}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        vr.percent > 0 ? 'text-emerald-600' : vr.percent < 0 ? 'text-rose-600' : 'text-muted-foreground'
                      }`}>
                        {vr.percent > 0 ? `+${vr.percent.toFixed(1)}%` : `${vr.percent.toFixed(1)}%`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {vr.status === 'new' && (
                          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
                            New Payout
                          </Badge>
                        )}
                        {vr.status === 'up' && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5 justify-center">
                            <ArrowUpRight className="w-3 h-3" /> Increased
                          </Badge>
                        )}
                        {vr.status === 'down' && (
                          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold flex items-center gap-0.5 justify-center">
                            <ArrowDownRight className="w-3 h-3" /> Decreased
                          </Badge>
                        )}
                        {vr.status === 'same' && (
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                            Unchanged
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredRows.map((r, idx) => {
                    const gross = Number(r.gross_earned || r.gross || 0);
                    const net = Number(r.net_salary || (gross - Number(r.total_deduction || 0)));
                    const annualCtc = Number(r.ctc || (gross * 12));
                    const epfWages = Math.min(15000, Number(r.basic_earned || r.basic || gross * 0.5));
                    const empPf = Number(r.pf || Math.round(epfWages * 0.12));
                    const eps = Math.round(epfWages * 0.0833);

                    const bankNameVal = r.bank_name || (r as any).bankName || null;
                    const accNoVal = r.account_no || (r as any).accountNo || (r as any).account_number || (r as any).accountNumber || null;
                    const ifscVal = r.ifsc_code || (r as any).ifscCode || (r as any).ifsc || null;

                    return (
                      <tr key={r.id || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {r.employee_code || `EMP-${r.id}`}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {r.first_name || ''} {r.last_name || ''}
                        </td>

                        {reportType === 'ctc' && (
                          <>
                            <td className="py-3 px-4 text-foreground font-semibold">{r.department_name || 'General'}</td>
                            <td className="py-3 px-4 text-muted-foreground">{r.designation || 'Staff'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">
                                {r.slab_name || (r as any).slabName || (r as any).payroll_slab || (r as any).salary_slab_name || 'Standard Pay Slab'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">₹{gross.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                              ₹{annualCtc.toLocaleString('en-IN')}
                            </td>
                          </>
                        )}

                        {reportType === 'summary' && (
                          <>
                            <td className="py-3 px-4 text-muted-foreground">{r.designation || 'Staff'}</td>
                            <td className="py-3 px-4 text-center font-bold text-foreground">{r.paid_days || 30} / 30</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">₹{gross.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{(r.pf || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{(r.pt || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                              ₹{net.toLocaleString('en-IN')}
                            </td>
                          </>
                        )}

                        {reportType === 'statutory' && (
                          <>
                            <td className="py-3 px-4 text-right font-mono font-semibold">₹{gross.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">₹{epfWages.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{empPf.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-blue-600 font-semibold">₹{eps.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{(r.pt || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{(r.tds || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{(r.esic || 0).toLocaleString('en-IN')}</td>
                          </>
                        )}

                        {reportType === 'bank' && (
                          <>
                            <td className="py-3 px-4 font-bold text-foreground">
                              {isBlankOrNA(bankNameVal) ? (
                                <span className="text-muted-foreground font-normal italic">N/A</span>
                              ) : (
                                bankNameVal
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {isBlankOrNA(accNoVal) ? (
                                <span className="text-muted-foreground font-normal italic">N/A</span>
                              ) : showSensitiveBank ? (
                                accNoVal
                              ) : (
                                maskAccount(accNoVal)
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {isBlankOrNA(ifscVal) ? (
                                <span className="text-muted-foreground font-normal italic">N/A</span>
                              ) : showSensitiveBank ? (
                                ifscVal
                              ) : (
                                maskIFSC(ifscVal)
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                              ₹{net.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isBlankOrNA(accNoVal) || isBlankOrNA(ifscVal) ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                                  Pending Bank Info
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                  NEFT Ready
                                </Badge>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollReportsPage;
