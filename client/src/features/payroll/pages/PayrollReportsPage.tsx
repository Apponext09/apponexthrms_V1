import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  FileSpreadsheet,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  IndianRupee,
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
  Sparkles,
  Percent,
  Award
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

const PALETTE = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6'];

export const PayrollReportsPage: React.FC = () => {
  // Top-level Mode: 'standard' (Normal Reports) vs 'visualization' (Visual Analytics)
  const [mainMode, setMainMode] = useState<'standard' | 'visualization'>('standard');

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
    enabled: reportType === 'variance' || mainMode === 'visualization'
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
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
      const code = (r.employee_code || `EMP-${r.id}`).toLowerCase();
      const dept = (r.department_name || '').toLowerCase();
      const desig = (r.designation || '').toLowerCase();
      const term = searchTerm.trim().toLowerCase();

      if (!term) return true;
      return name.includes(term) || code.includes(term) || dept.includes(term) || desig.includes(term);
    });
  }, [rows, searchTerm]);

  // Build Month-on-Month Variance records
  const prevMap = useMemo(() => {
    const map = new Map<number, ReportRow>();
    prevRows.forEach(pr => {
      if (pr.id) map.set(pr.id, pr);
    });
    return map;
  }, [prevRows]);

  const varianceRows = useMemo(() => {
    return filteredRows.map(r => {
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
  }, [filteredRows, prevMap]);

  // Executive Metrics
  const totalEmployees = filteredRows.length;
  const totalGross = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.gross_earned || r.gross || 0), 0), [filteredRows]);
  const totalNet = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0))), 0), [filteredRows]);
  const totalPF = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.pf || 0), 0), [filteredRows]);
  const totalPT = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.pt || 0), 0), [filteredRows]);
  const totalTDS = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.tds || 0), 0), [filteredRows]);
  const totalESIC = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.esic || 0), 0), [filteredRows]);
  const totalDeductions = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0), [filteredRows]);
  const totalBasic = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.basic_earned || r.basic || 0), 0), [filteredRows]);
  const totalHRA = useMemo(() => filteredRows.reduce((acc, r) => acc + Number(r.hra_earned || r.hra || 0), 0), [filteredRows]);

  // Previous Month Totals for MoM comparison
  const prevTotalGross = useMemo(() => prevRows.reduce((acc, r) => acc + Number(r.gross_earned || r.gross || 0), 0), [prevRows]);
  const prevTotalNet = useMemo(() => prevRows.reduce((acc, r) => acc + Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0))), 0), [prevRows]);
  const prevTotalDeductions = useMemo(() => prevRows.reduce((acc, r) => acc + Number(r.total_deduction || 0), 0), [prevRows]);

  // Efficiency & Average Metrics
  const avgGross = totalEmployees > 0 ? Math.round(totalGross / totalEmployees) : 0;
  const netToGrossRatio = totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '0.0';

  // MoM Metrics
  const totalVarianceDiff = useMemo(() => varianceRows.reduce((acc, vr) => acc + vr.diff, 0), [varianceRows]);
  const increasedCount = useMemo(() => varianceRows.filter(vr => vr.status === 'up').length, [varianceRows]);
  const decreasedCount = useMemo(() => varianceRows.filter(vr => vr.status === 'down').length, [varianceRows]);
  const newCount = useMemo(() => varianceRows.filter(vr => vr.status === 'new').length, [varianceRows]);

  // Visual Analytics: Department Cost & Headcount Breakdown
  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, { name: string; gross: number; net: number; headcount: number; pf: number; pt: number; tds: number }>();
    filteredRows.forEach(r => {
      const deptName = r.department_name || 'General';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { name: deptName, gross: 0, net: 0, headcount: 0, pf: 0, pt: 0, tds: 0 });
      }
      const entry = deptMap.get(deptName)!;
      entry.headcount += 1;
      entry.gross += Number(r.gross_earned || r.gross || 0);
      entry.net += Number(r.net_salary || (Number(r.gross_earned || r.gross || 0) - Number(r.total_deduction || 0)));
      entry.pf += Number(r.pf || 0);
      entry.pt += Number(r.pt || 0);
      entry.tds += Number(r.tds || 0);
    });

    return Array.from(deptMap.values()).sort((a, b) => b.gross - a.gross);
  }, [filteredRows]);

  // Visual Analytics: Earnings vs Deductions Pie Data
  const earningsVsDeductionsPie = useMemo(() => {
    return [
      { name: 'Basic Pay', value: totalBasic, color: '#4f46e5' },
      { name: 'HRA', value: totalHRA, color: '#06b6d4' },
      { name: 'Special / Other Allowances', value: Math.max(0, totalGross - totalBasic - totalHRA), color: '#10b981' },
      { name: 'PF Employee Share', value: totalPF, color: '#f59e0b' },
      { name: 'TDS Withholding', value: totalTDS, color: '#ec4899' },
      { name: 'PT & Other Deductions', value: Math.max(0, totalDeductions - totalPF - totalTDS), color: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [totalBasic, totalHRA, totalGross, totalPF, totalTDS, totalDeductions]);

  // Visual Analytics: Salary Brackets / Band Distribution
  const salaryBandsData = useMemo(() => {
    const brackets = [
      { label: '< ₹25K', min: 0, max: 25000, count: 0, totalGross: 0 },
      { label: '₹25K - ₹50K', min: 25000, max: 50000, count: 0, totalGross: 0 },
      { label: '₹50K - ₹1L', min: 50000, max: 100000, count: 0, totalGross: 0 },
      { label: '₹1L - ₹2L', min: 100000, max: 200000, count: 0, totalGross: 0 },
      { label: '> ₹2L', min: 200000, max: Infinity, count: 0, totalGross: 0 },
    ];

    filteredRows.forEach(r => {
      const g = Number(r.gross_earned || r.gross || 0);
      const matched = brackets.find(b => g >= b.min && g < b.max);
      if (matched) {
        matched.count += 1;
        matched.totalGross += g;
      }
    });

    return brackets;
  }, [filteredRows]);

  // Visual Analytics: Statutory Liabilities Breakdown
  const statutoryLiabilitiesData = useMemo(() => {
    const epfEmployee = totalPF;
    const epfEmployer = Math.round(totalPF * (3.67 / 12));
    const eps = Math.round(totalPF * (8.33 / 12));
    return [
      { name: 'EPF (Emp 12%)', amount: epfEmployee, color: '#4f46e5' },
      { name: 'EPF (Empr 3.67%)', amount: epfEmployer, color: '#06b6d4' },
      { name: 'EPS (Empr 8.33%)', amount: eps, color: '#10b981' },
      { name: 'Professional Tax (PT)', amount: totalPT, color: '#f59e0b' },
      { name: 'Income Tax (TDS)', amount: totalTDS, color: '#ec4899' },
      { name: 'ESIC Scheme', amount: totalESIC, color: '#8b5cf6' }
    ].filter(i => i.amount > 0);
  }, [totalPF, totalPT, totalTDS, totalESIC]);

  // Visual Analytics: MoM Comparison Chart Data
  const momComparisonData = useMemo(() => {
    return [
      {
        month: prevMonth,
        Gross: prevTotalGross,
        Net: prevTotalNet,
        Deductions: prevTotalDeductions,
        Employees: prevRows.length
      },
      {
        month: selectedMonth,
        Gross: totalGross,
        Net: totalNet,
        Deductions: totalDeductions,
        Employees: totalEmployees
      }
    ];
  }, [prevMonth, prevTotalGross, prevTotalNet, prevTotalDeductions, prevRows.length, selectedMonth, totalGross, totalNet, totalDeductions, totalEmployees]);

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
      headers = [
        'Emp Code',
        'Employee Name',
        'Gross Wages (₹)',
        'EPF Wages (₹)',
        'EE PF 12% (₹)',
        'ER EPF 3.67% (₹)',
        'ER EPS 8.33% (₹)',
        'EE ESIC 0.75% (₹)',
        'ER ESIC 3.25% (₹)',
        'PT (₹)',
        'TDS (₹)',
        'Total Govt Remittance (₹)'
      ];
      csvRows = filteredRows.map(r => {
        const gross = Number(r.gross_earned || r.gross || 0);
        const epfWages = Math.min(15000, Number(r.basic_earned || r.basic || gross * 0.5));
        const empPf = Number(r.pf || Math.round(epfWages * 0.12));
        const eps = Math.round(epfWages * 0.0833);
        const erEpf = Math.max(0, empPf - eps);
        const empEsic = Number(r.esic || (gross <= 21000 ? Math.ceil(gross * 0.0075) : 0));
        const erEsic = gross <= 21000 ? Math.ceil(gross * 0.0325) : 0;
        const pt = Number(r.pt || 0);
        const tds = Number(r.tds || 0);
        const totalRemittance = empPf + erEpf + eps + empEsic + erEsic + pt + tds;

        return [
          r.employee_code || `EMP-${r.id}`,
          `${r.first_name || ''} ${r.last_name || ''}`.trim(),
          gross,
          epfWages,
          empPf,
          erEpf,
          eps,
          empEsic,
          erEsic,
          pt,
          tds,
          totalRemittance
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
      {/* ── Top Header Banner with 2 Primary Mode Switchers ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            {mainMode === 'standard' ? <FileSpreadsheet className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Reports &amp; Analytics Hub</h1>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 mr-1" /> Live Database Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access comprehensive tabular payroll compliance registers or explore dynamic visual analytics and breakdown charts.
            </p>
          </div>
        </div>

        {/* 2 Main Mode Tabs (Normal Reports vs Visualization Reports) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 shadow-2xs">
            <button
              onClick={() => setMainMode('standard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mainMode === 'standard'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Standard Reports
            </button>
            <button
              onClick={() => setMainMode('visualization')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mainMode === 'visualization'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              Visualization Reports
            </button>
          </div>

          {mainMode === 'standard' && (
            <Button
              onClick={handleExportCSV}
              className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}

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

      {/* ── Universal Filter Toolbar ── */}
      <Card className="border border-border/80 shadow-xs bg-card p-4 rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            <span>Payroll Dataset Filters</span>
            {deptFilter && (
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                Dept: {departments.find((d: any) => String(d.id) === String(deptFilter))?.name || deptFilter}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
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

      {/* ── Executive Metric KPI Cards ── */}
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
              <p className="text-[10px] text-muted-foreground font-semibold">Avg: ₹{avgGross.toLocaleString('en-IN')}/staff</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Bank Disbursal Net */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Bank Disbursal (Net)</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{totalNet.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <Percent className="w-3 h-3" /> {netToGrossRatio}% Payout Ratio
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Landmark className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Statutory Deductions */}
        <Card className="border border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Statutory Deductions</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{totalDeductions.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-muted-foreground font-semibold">PF: ₹{totalPF.toLocaleString('en-IN')} | PT: ₹{totalPT.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 1: STANDARD REPORTS (NORMAL TABULAR REGISTERS & EXPORTS)
      ══════════════════════════════════════════════════════════════════════ */}
      {mainMode === 'standard' && (
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

          {/* Report Content Table */}
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
                        <th className="py-3 px-4 text-right">Gross Wages</th>
                        <th className="py-3 px-4 text-right">EPF Wages</th>
                        <th className="py-3 px-4 text-right text-rose-600 font-bold">EE PF (12%)</th>
                        <th className="py-3 px-4 text-right text-cyan-600 font-bold">ER EPF (3.67%)</th>
                        <th className="py-3 px-4 text-right text-blue-600 font-bold">ER EPS (8.33%)</th>
                        <th className="py-3 px-4 text-right text-purple-600 font-bold">ER ESIC (3.25%)</th>
                        <th className="py-3 px-4 text-right text-amber-600 font-bold">PT</th>
                        <th className="py-3 px-4 text-right text-rose-600 font-bold">TDS</th>
                        <th className="py-3 px-4 text-right font-black text-emerald-600">Total Govt Remit</th>
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

                      const erEpf = Math.max(0, empPf - eps);
                      const empEsic = Number(r.esic || (gross <= 21000 ? Math.ceil(gross * 0.0075) : 0));
                      const erEsic = gross <= 21000 ? Math.ceil(gross * 0.0325) : 0;
                      const pt = Number(r.pt || 0);
                      const tds = Number(r.tds || 0);
                      const totalRemit = empPf + erEpf + eps + empEsic + erEsic + pt + tds;

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
                              <td className="py-3 px-4 text-right font-mono text-cyan-600 font-semibold">₹{erEpf.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono text-blue-600 font-semibold">₹{eps.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono text-purple-600 font-semibold">₹{erEsic.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">₹{pt.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">₹{tds.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                ₹{totalRemit.toLocaleString('en-IN')}
                              </td>
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 2: VISUALIZATION REPORTS (DYNAMIC VISUAL ANALYTICS & CHARTS)
      ══════════════════════════════════════════════════════════════════════ */}
      {mainMode === 'visualization' && (
        <div className="space-y-6">
          {/* Row 1: Department Payroll Outlay Bar Chart + Earnings Composition Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Department Outlay Bar Chart */}
            <Card className="lg:col-span-7 border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Department Payroll Expenditure</CardTitle>
                      <CardDescription className="text-xs">Gross payroll outlay and employee headcount across active departments</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                    {departmentChartData.length} Departments
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {departmentChartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No department payroll data available for {selectedMonth}.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }}
                          tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.75rem', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any, name: string) => [
                            name === 'gross' ? `₹${Number(value).toLocaleString('en-IN')}` : `₹${Number(value).toLocaleString('en-IN')}`,
                            name === 'gross' ? 'Gross Outlay' : 'Net Payout'
                          ]}
                          labelFormatter={label => `Department: ${label}`}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                          formatter={value => (value === 'gross' ? 'Gross Outlay (₹)' : 'Net Payout (₹)')}
                        />
                        <Bar dataKey="gross" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="net" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Earnings & Deductions Distribution Donut Chart */}
            <Card className="lg:col-span-5 border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Compensation Breakdown</CardTitle>
                    <CardDescription className="text-xs">Earnings vs Statutory deductions distribution</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {earningsVsDeductionsPie.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                    No breakdown data available.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={earningsVsDeductionsPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {earningsVsDeductionsPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || PALETTE[index % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.75rem', fontSize: '11px' }}
                          formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Salary Bands Distribution + Month-over-Month Variance Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 3: Headcount by CTC / Salary Bracket */}
            <Card className="lg:col-span-6 border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Salary Band & CTC Distribution</CardTitle>
                      <CardDescription className="text-xs">Headcount distribution across monthly compensation brackets</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-3">
                  {salaryBandsData.map((bracket, idx) => {
                    const pct = totalEmployees > 0 ? (bracket.count / totalEmployees) * 100 : 0;
                    return (
                      <div key={bracket.label} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                            {bracket.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted-foreground font-semibold">
                              ₹{bracket.totalGross.toLocaleString('en-IN')} total
                            </span>
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {bracket.count} staff ({pct.toFixed(0)}%)
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PALETTE[idx % PALETTE.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Chart 4: Month-over-Month (MoM) Trend Comparison */}
            <Card className="lg:col-span-6 border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Month-on-Month (MoM) Variance Trend</CardTitle>
                      <CardDescription className="text-xs">Comparison between Previous Month ({prevMonth}) and Current Month ({selectedMonth})</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${totalVarianceDiff >= 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'} text-[10px] font-bold`}>
                    {totalVarianceDiff >= 0 ? '+' : ''}₹{totalVarianceDiff.toLocaleString('en-IN')} ({selectedMonth})
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={momComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }}
                        tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.75rem', fontSize: '11px' }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="Gross" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGross)" />
                      <Area type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Statutory Liabilities Breakdown Cards */}
          <Card className="border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Statutory &amp; Tax Compliance Breakdown</CardTitle>
                  <CardDescription className="text-xs">Detailed statutory withholding liabilities for {selectedMonth}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statutoryLiabilitiesData.map(item => {
                  const sharePct = totalDeductions > 0 ? (item.amount / totalDeductions) * 100 : 0;
                  return (
                    <div key={item.name} className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                        {item.name}
                      </span>
                      <h4 className="text-base font-black text-foreground font-mono">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                        <span>Share</span>
                        <span className="font-bold text-foreground">{sharePct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PayrollReportsPage;
