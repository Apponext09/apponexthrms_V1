import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePayrollDashboard } from '../hooks/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/config/api';
import {
  Play,
  FileText,
  IndianRupee,
  TrendingUp,
  Users,
  Building2,
  Layers,
  Percent,
  Calendar,
  CheckCircle2,
  UserX,
  ArrowRight,
  ReceiptIndianRupee,
  Compass,
  UploadCloud,
  ShieldCheck,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  CreditCard,
  Check,
  AlertCircle,
  HelpCircle,
  Download,
  Landmark,
  ArrowUpRight,
  Activity,
  Sliders
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs shadow-2xl font-medium z-50">
        {label && <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill || '#3b82f6' }} />
              <span className="text-slate-300 capitalize">{entry.name || entry.dataKey}:</span>
            </div>
            <span className="font-bold text-white">
              {typeof entry.value === 'number' && entry.value > 1000
                ? `₹${entry.value.toLocaleString('en-IN')}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PayrollDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: hookLoading } = usePayrollDashboard();

  const [realEmployees, setRealEmployees] = useState<any[]>([]);
  const [realDepartments, setRealDepartments] = useState<any[]>([]);
  const [realSlabs, setRealSlabs] = useState<any[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<number>(0);
  const [trendViewRange, setTrendViewRange] = useState<'6m' | '12m'>('6m');
  const [loading, setLoading] = useState(true);

  const isHRPath = location.pathname.startsWith('/hr');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/employees', { params: { pageSize: 500 } }).catch(() => ({ data: null })),
      apiClient.get('/settings/departments').catch(() => ({ data: null })),
      apiClient.get('/payroll/slabs').catch(() => ({ data: null })),
      apiClient.get('/payroll/cycles').catch(() => ({ data: null })),
      apiClient.get('/payroll/runs').catch(() => ({ data: null })),
      apiClient.get('/payroll').catch(() => ({ data: null })),
      apiClient.get('/payroll/salary-structure').catch(() => ({ data: null })),
    ]).then(([empRes, deptRes, slabRes, cycleRes, runRes, allRunsRes, structureRes]) => {
      const emps = empRes?.data?.data || empRes?.data?.items || empRes?.data || [];
      const depts = deptRes?.data?.data || deptRes?.data || [];
      const slabs = slabRes?.data?.data || slabRes?.data || [];
      const cycles: any[] = cycleRes?.data?.data || cycleRes?.data || [];
      const runs: any[] = runRes?.data?.data || runRes?.data || [];
      const allRuns: any[] = allRunsRes?.data?.data || allRunsRes?.data || [];
      const structures: any[] = structureRes?.data?.data || structureRes?.data || [];

      if (Array.isArray(emps)) setRealEmployees(emps);
      if (Array.isArray(depts)) setRealDepartments(depts);
      if (Array.isArray(slabs)) setRealSlabs(slabs);
      if (Array.isArray(structures)) setSalaryStructures(structures);
      if (Array.isArray(runs)) setRecentRuns(runs.slice(0, 6));
      if (Array.isArray(allRuns)) {
        setPendingApprovals(allRuns.filter((r: any) => String(r.status || '').toLowerCase() === 'locked').length);
      }

      const open = cycles.find((c: any) => c.isActive === true || c.is_active === true || c.is_active === 1) || cycles[0] || null;
      setActiveCycle(open);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const activeEmployees = realEmployees.filter((employee) =>
    ['active', 'probation', 'confirmed', 'onboarding'].includes(String(employee.status || employee.employee_status || '').toLowerCase())
  );
  const structureByEmployeeId = useMemo(() => {
    const structures = new Map<string, any>();
    salaryStructures.forEach((structure) => {
      const employeeId = structure.employee_id ?? structure.employeeId;
      if (employeeId !== undefined && employeeId !== null && !structures.has(String(employeeId))) structures.set(String(employeeId), structure);
    });
    return structures;
  }, [salaryStructures]);
  const getMonthlyGross = (structure?: any) => {
    const gross = Number(structure?.gross_monthly ?? structure?.grossMonthly ?? structure?.gross ?? 0);
    return gross > 0 ? gross : Math.max(0, Number(structure?.annual_ctc ?? structure?.annualCtc ?? 0) / 12);
  };
  const getTotalDeductions = (structure?: any) => Math.max(0, Number(structure?.total_deductions ?? structure?.totalDeductions ?? 0));

  // Compute Department Outlays from salary structures assigned to active employees.
  const groupedDeptMap: Record<string, { count: number; totalCost: number }> = {};
  activeEmployees.forEach((e) => {
    const deptName =
      e.department_name ||
      e.department?.name ||
      (typeof e.department === 'string' ? e.department : '') ||
      'General Operations';
    const gross = getMonthlyGross(structureByEmployeeId.get(String(e.id)));
    if (!groupedDeptMap[deptName]) groupedDeptMap[deptName] = { count: 0, totalCost: 0 };
    groupedDeptMap[deptName].count += 1;
    groupedDeptMap[deptName].totalCost += gross;
  });

  realDepartments.forEach((d) => {
    const dName = d.name || d.department_name;
    if (dName && !groupedDeptMap[dName]) groupedDeptMap[dName] = { count: 0, totalCost: 0 };
  });

  const totalEmployeesCount = activeEmployees.length;
  const grandTotalGross =
    Object.values(groupedDeptMap).reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalDeductions = activeEmployees.reduce((total, employee) => total + getTotalDeductions(structureByEmployeeId.get(String(employee.id))), 0);
  const estimatedNetPayout = Math.max(0, grandTotalGross - totalDeductions);
  const assignedStructureCount = activeEmployees.filter((employee) => structureByEmployeeId.has(String(employee.id))).length;
  const slabAssignmentPercent = totalEmployeesCount ? Math.round((assignedStructureCount / totalEmployeesCount) * 100) : 0;
  const priorGross = recentRuns.map((run) => Number(run.total_gross ?? run.totalGross ?? 0)).find((gross) => gross > 0);
  const monthOverMonth = priorGross ? ((grandTotalGross - priorGross) / priorGross) * 100 : null;

  // Slabs Distribution Data
  const slabDistributionData = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalCost: number }> = {};
    activeEmployees.forEach(e => {
      const structure = structureByEmployeeId.get(String(e.id));
      const slabName = structure?.slab_name || structure?.slabName || structure?.structure_name || structure?.structureName || 'Unassigned';
      if (!map[slabName]) map[slabName] = { name: slabName, count: 0, totalCost: 0 };
      const gross = getMonthlyGross(structure);
      map[slabName].count += 1;
      map[slabName].totalCost += gross;
    });
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [activeEmployees, structureByEmployeeId]);

  // Department Breakdown for Bar Chart
  const departmentChartData = Object.entries(groupedDeptMap)
    .map(([name, data]) => ({
      name: name.length > 14 ? `${name.substring(0, 12)}...` : name,
      fullName: name,
      cost: data.totalCost,
      headcount: data.count,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Historical trend is sourced from actual payroll runs only.
  const monthlyTrendData = useMemo(() => {
    const limit = trendViewRange === '12m' ? 12 : 6;
    return recentRuns.map((run) => ({
      month: run.payroll_month || run.payrollMonth || run.month || 'Payroll run',
      Gross: Number(run.total_gross ?? run.totalGross ?? 0),
      Net: Number(run.total_net ?? run.totalNet ?? run.net_disbursal ?? run.netDisbursal ?? 0),
      Statutory: Number(run.total_deductions ?? run.totalDeductions ?? 0),
    })).filter((run) => run.Gross > 0 || run.Net > 0).slice(0, limit).reverse();
  }, [recentRuns, trendViewRange]);

  // Salary Pie Breakdown
  const salaryPieData = [
    { name: 'Gross Pay', value: grandTotalGross, color: '#3b82f6' },
    { name: 'Salary Structure Deductions', value: totalDeductions, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  // Quick Action Tiles
  const quickActions = [
    {
      title: 'Payroll Processing',
      desc: 'Run monthly salary batches & generate slips',
      icon: Play,
      color: 'from-blue-600 to-indigo-600 text-white',
      badge: 'Monthly',
      route: isHRPath ? '/hr/payroll-processing' : '/payroll/processing',
    },
    {
      title: 'Payroll Approvals',
      desc: pendingApprovals > 0 ? `${pendingApprovals} run(s) locked & awaiting your approval` : 'Review and approve locked payroll runs',
      icon: ShieldCheck,
      color: pendingApprovals > 0 ? 'from-rose-600 to-pink-600 text-white' : 'from-purple-600 to-violet-600 text-white',
      badge: pendingApprovals > 0 ? `${pendingApprovals} Pending` : 'Approvals',
      route: isHRPath ? '/hr/payroll-processing?tab=payroll_requests' : '/payroll/processing?tab=payroll_requests',
      highlight: pendingApprovals > 0,
    },
    {
      title: 'Mass Salary Upload',
      desc: 'Bulk update slabs & CTC via CSV upload',
      icon: UploadCloud,
      color: 'from-emerald-600 to-teal-600 text-white',
      badge: 'Bulk CSV',
      route: isHRPath ? '/hr/payroll/mass-salary-upload' : '/payroll/mass-salary-upload',
    },
    {
      title: 'Salary Slabs & Formulas',
      desc: 'Configure pay components & calculation rules',
      icon: Layers,
      color: 'from-violet-600 to-purple-600 text-white',
      badge: 'Rules',
      route: isHRPath ? '/hr/settings' : '/payroll/settings',
    },
    {
      title: 'Payslip Portal',
      desc: 'View, search, and download official PDF slips',
      icon: FileText,
      color: 'from-amber-500 to-orange-600 text-white',
      badge: 'PDF Register',
      route: isHRPath ? '/hr/payslips' : '/payroll/payslips',
    },
    {
      title: 'Loans & Advances',
      desc: 'Manage employee loan requests & EMI schedules',
      icon: Landmark,
      color: 'from-cyan-600 to-blue-600 text-white',
      badge: 'Finances',
      route: isHRPath ? '/hr/payroll/loans' : '/payroll/loans',
    },
    {
      title: 'Full & Final Settlements',
      desc: 'Process exit gratuity, encashment & F&F',
      icon: UserX,
      color: 'from-rose-600 to-pink-600 text-white',
      badge: 'Exit Ops',
      route: isHRPath ? '/hr/settlements' : '/payroll/settlements',
    },
  ];

  const now = new Date();
  const disbursementDay = Number(activeCycle?.disbursementDate ?? activeCycle?.disbursement_date ?? activeCycle?.disbursement_date_str);
  const nextDisbursal = Number.isInteger(disbursementDay) && disbursementDay > 0 ? new Date(now.getFullYear(), now.getMonth(), disbursementDay) : null;
  if (nextDisbursal && nextDisbursal < now) nextDisbursal.setMonth(nextDisbursal.getMonth() + 1);
  const daysRemaining = nextDisbursal ? Math.max(0, Math.ceil((nextDisbursal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  if (loading && hookLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading Payroll Engine Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. STANDARD THEMED HERO BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">Payroll Dashboard</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping mr-1.5" />
                Active Cycle: {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time monthly disbursement analytics, automated statutory compliance, and salary execution controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate(isHRPath ? '/hr/payroll/mass-salary-upload' : '/payroll/mass-salary-upload')}
            className="h-9 text-xs font-bold gap-2"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Mass Upload CSV
          </Button>
          {pendingApprovals > 0 && (
            <Button
              onClick={() => navigate(isHRPath ? '/hr/payroll-processing?tab=payroll_requests' : '/payroll/processing?tab=payroll_requests')}
              className="h-9 text-xs font-bold gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-xs animate-pulse"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Approve Payroll ({pendingApprovals})
            </Button>
          )}
          <Button
            onClick={() => navigate(isHRPath ? '/hr/payroll-processing' : '/payroll/processing')}
            className="h-9 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Run Payroll Pipeline
          </Button>
        </div>
      </div>

      {/* ── PENDING APPROVAL ALERT BANNER ── */}
      {pendingApprovals > 0 && (
        <div
          onClick={() => navigate(isHRPath ? '/hr/payroll-processing?tab=payroll_requests' : '/payroll/processing?tab=payroll_requests')}
          className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {pendingApprovals} Payroll Run{pendingApprovals > 1 ? 's' : ''} Awaiting Your Approval
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                HR has locked the payroll — click here to review and approve before publishing payslips.
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        </div>
      )}

      {/* ── 2. EXECUTIVE KPI CARDS (5 METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Monthly Outlay */}
        <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all hover:border-blue-500/40 relative overflow-hidden bg-card group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Outlay (Gross)</p>
              <p className="text-xl font-black text-foreground truncate">₹{grandTotalGross.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {monthOverMonth === null ? 'No prior payroll baseline' : `${monthOverMonth >= 0 ? '+' : ''}${monthOverMonth.toFixed(1)}% MoM`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Net Disbursal */}
        <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all hover:border-emerald-500/40 relative overflow-hidden bg-card group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Est. Net Take-Home</p>
              <p className="text-xl font-black text-emerald-600 truncate">₹{estimatedNetPayout.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-medium text-muted-foreground">From assigned salary structures</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Enrolled Employees */}
        <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all hover:border-violet-500/40 relative overflow-hidden bg-card group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Enrolled Staff</p>
              <p className="text-xl font-black text-foreground truncate">{totalEmployeesCount} Active</p>
              <p className="text-[10px] font-bold text-violet-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> {slabAssignmentPercent}% Slabs Assigned
              </p>
            </div>
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-600 shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Statutory Compliance */}
        <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all hover:border-amber-500/40 relative overflow-hidden bg-card group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">PF & Statutory</p>
              <p className="text-xl font-black text-foreground truncate">₹{totalDeductions.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> From salary-structure deductions
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Next Disbursal */}
        <Card className="border border-border/80 shadow-xs hover:shadow-md transition-all hover:border-cyan-500/40 relative overflow-hidden bg-card group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Next Disbursal</p>
              <p className="text-xl font-black text-foreground truncate">{nextDisbursal ? nextDisbursal.toLocaleString('default', { day: 'numeric', month: 'short' }) : 'Not configured'}</p>
              <p className="text-[10px] font-bold text-cyan-600 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {daysRemaining === null ? 'Set a cycle disbursement date' : `in ${daysRemaining} days`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 shrink-0 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. PAYROLL EXECUTION PIPELINE STEPPER ── */}
      <Card className="border border-border/80 shadow-xs bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-foreground">Active Payroll Processing Lifecycle</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-600">
              {assignedStructureCount} of {totalEmployeesCount} structures ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">1. Attendance Cutoff</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">{activeCycle?.cutoffDay ?? activeCycle?.cutoff_day ? `Configured cutoff: ${activeCycle.cutoffDay ?? activeCycle.cutoff_day}` : 'Cutoff not configured'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">2. LOP & Leave Ingest</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Available after payroll calculation</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 ring-2 ring-blue-500/20">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 animate-pulse">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">3. Live Calculation</p>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">{assignedStructureCount} employees with structures</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="w-7 h-7 rounded-full bg-muted-foreground/30 text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                4
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">4. Lock & Disburse</p>
                <p className="text-[10px] text-muted-foreground">Publish Payslips</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. INTERACTIVE VISUALIZATIONS (TRENDS & MIX) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Outlay Trend (Area Chart - 2 Cols) */}
        <Card className="lg:col-span-2 border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Payroll Outlay & Disbursal Trend
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Monthly Gross expenditure vs Net Employee Take-Home (in INR)
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setTrendViewRange('6m')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    trendViewRange === '6m'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setTrendViewRange('12m')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    trendViewRange === '12m'
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  12 Months
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Area type="monotone" dataKey="Gross" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#grossGradient)" name="Gross Outlay" />
                  <Area type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#netGradient)" name="Net Disbursed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Salary Component Distribution (Donut Chart - 1 Col) */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-violet-600" />
              Salary Structure Mix
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Portfolio split across allowances & taxes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salaryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {salaryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="space-y-2 mt-3 pt-3 border-t border-border/60">
              {salaryPieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-foreground">₹{item.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5. PAY SLABS & DEPARTMENT COST ALLOCATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Bar Chart */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Department Cost Split
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Wage distribution categorized by department
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {departmentChartData.length} Depts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="cost" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Monthly Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pay Slabs Distribution */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-600" />
                  Pay Slabs Distribution
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Enrolled headcount and total cost per slab
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-teal-50 text-teal-700 border-teal-200">
                {slabDistributionData.length} Slabs
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slabDistributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="totalCost" fill="#0d9488" radius={[6, 6, 0, 0]} name="Slab Expenditure" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations Hub (1 Col) */}
        <Card className="border border-border/80 shadow-xs bg-card flex flex-col">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Payroll Operations Hub
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Direct access to salary workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2 flex-1 overflow-y-auto">
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.title}
                  onClick={() => navigate(act.route)}
                  className="w-full p-2.5 rounded-xl border border-border/70 hover:border-primary/50 bg-background hover:bg-muted/50 transition-all flex items-center justify-between text-left group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${act.color} shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate">{act.title}</p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold shrink-0">
                          {act.badge}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{act.desc}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. RECENT PAYROLL RUNS AUDIT REGISTER ── */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ReceiptIndianRupee className="w-4 h-4 text-blue-600" />
                Recent Payroll Runs &amp; Disbursal History
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Past batch settlements, headcount counts, and published payslip registers
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(isHRPath ? '/hr/payroll-processing' : '/payroll/processing')}
              className="text-xs font-bold gap-1 h-8"
            >
              View Full History <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Pay Month / Period</th>
                  <th className="py-3 px-4">Processed Staff</th>
                  <th className="py-3 px-4">Gross Outlay</th>
                  <th className="py-3 px-4">Net Disbursed</th>
                  <th className="py-3 px-4">Batch Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRuns.length > 0 ? (
                  recentRuns.map((run: any) => (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors font-medium">
                      <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {run.payrollMonth || run.payroll_month || 'Current Month'}
                      </td>
                      <td className="py-3 px-4">{run.employeeCount || run.employee_count || totalEmployeesCount} Staff</td>
                      <td className="py-3 px-4 font-bold">₹{Number(run.totalGross || run.total_gross || grandTotalGross).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">₹{Number(run.totalNet || run.total_net || estimatedNetPayout).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                          {run.status ? run.status.toUpperCase() : 'PUBLISHED'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(isHRPath ? '/hr/payslips' : '/payroll/payslips')}
                          className="h-7 text-xs font-bold text-primary hover:bg-primary/10 gap-1"
                        >
                          <FileText className="w-3 h-3" /> View Payslips
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-muted/30 transition-colors font-medium">
                    <td className="py-3 px-4 font-bold text-foreground flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      August 2026 (Active)
                    </td>
                    <td className="py-3 px-4">{totalEmployeesCount} Staff</td>
                    <td className="py-3 px-4 font-bold">₹{grandTotalGross.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">₹{estimatedNetPayout.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                        PUBLISHED
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(isHRPath ? '/hr/payslips' : '/payroll/payslips')}
                        className="h-7 text-xs font-bold text-primary hover:bg-primary/10 gap-1"
                      >
                        <FileText className="w-3 h-3" /> View Payslips
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDashboard;
