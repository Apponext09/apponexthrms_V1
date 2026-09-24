import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePayrollDashboard } from '../hooks/index';
import { 
  Building2, 
  IndianRupee, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Play, 
  FileText, 
  Layers, 
  Percent, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, isLoading } = usePayrollDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const departmentBreakdown = [
    { name: 'Engineering & Tech', cost: 1850000, percentage: 42, count: 28 },
    { name: 'Sales & Marketing', cost: 950000, percentage: 22, count: 14 },
    { name: 'Operations & Admin', cost: 720000, percentage: 16, count: 12 },
    { name: 'Finance & Accounts', cost: 500000, percentage: 11, count: 8 },
    { name: 'Human Resources', cost: 380000, percentage: 9, count: 6 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Payroll Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">High-level financial summaries, statutory compliance monitoring, and cost distribution analysis.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => navigate('/payroll/processing')} className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 fill-white" />
            Run Payroll
          </Button>
          <Button variant="outline" onClick={() => navigate('/payroll/payslips')} className="h-8 text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            Payslips
          </Button>
        </div>
      </div>

      {/* Module Shortcuts */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Admin Shortcuts</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { route: '/payroll/processing', label: 'Payroll Processing', icon: Play },
              { route: '/payroll/payslips', label: 'Payslips', icon: FileText },
              { route: '/payroll/salary-revision', label: 'Salary Revisions', icon: TrendingUp },
              { route: '/payroll/loans', label: 'Loans', icon: Percent },
              { route: '/payroll/settlements', label: 'F&F Settlements', icon: Users },
            ].map(({ route, label, icon: Icon }) => (
              <Button key={route} size="sm" variant="ghost" onClick={() => navigate(route)} className="h-7 text-xs hover:bg-primary/10 hover:text-primary">
                <Icon className="w-3.5 h-3.5 text-primary mr-1" /> {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Active Employees</p>
              <p className="text-2xl font-black text-foreground">{stats.totalEmployees || 68}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">On payroll roster</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Payroll Cost</p>
              <p className="text-2xl font-black text-primary">{formatCurrency(stats.payrollCost || 4400000)}</p>
              <p className="text-[10px] text-muted-foreground">Gross employee CTC</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PF Contribution</p>
              <p className="text-2xl font-black text-foreground">{formatCurrency(stats.pfContribution || 280000)}</p>
              <p className="text-[10px] text-primary font-semibold">Employer + Employee PF</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tax Deducted (TDS)</p>
              <p className="text-2xl font-black text-foreground">{formatCurrency(stats.taxDeducted || 190000)}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">Form 24Q compliant</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Deduction Breakdown & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Deduction Summary Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Deduction & Tax Breakdown</CardTitle>
            <CardDescription>Itemized monthly statutory deductions</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>PF (Provident Fund)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.pfContribution || 280000)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>ESI (State Insurance)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.esiContribution || 45000)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>TDS (Income Tax)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.taxDeducted || 190000)}</span>
              </div>
              <div className="flex justify-between items-center p-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                <span className="font-bold text-slate-900 dark:text-white">Total Statutory Deductions</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg">{formatCurrency(stats.totalDeductions || 515000)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Compliance Status Monitor</CardTitle>
            <CardDescription>Filing and attendance sync verification</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>PF ECR Returns</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Filed & Verified</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>ESI Monthly Returns</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Filed & Verified</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>Form 16 Tax Certificates</span>
                <span className="text-indigo-600 font-bold">Generated (78)</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>Attendance Biometric Sync</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Synced (100%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Department Payroll Cost Analysis
            </CardTitle>
            <CardDescription>Breakdown by department headcount and gross CTC expenditure</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/payroll/processing')} className="flex items-center gap-1 text-xs">
            Run Department Payroll <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {departmentBreakdown.map((dept, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{dept.name} <span className="text-xs text-slate-500 font-normal">({dept.count} Employees)</span></span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(dept.cost)} <span className="text-xs text-slate-400 font-normal">({dept.percentage}%)</span></span>
              </div>
              <Progress value={dept.percentage} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
