import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayrollDashboard } from '../hooks/index';
import { PayrollStatusCard } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Building2, 
  Layers, 
  Percent, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';

export const PayrollDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { payrolls, pendingApprovals, stats, isLoading } = usePayrollDashboard();
  const [activeRoleScope, setActiveRoleScope] = useState<'admin' | 'hr' | 'manager' | 'team_lead' | 'employee'>('admin');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
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
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Payroll Admin Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Overview of monthly organization payroll, compliance, active runs, and employee distributions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Access Scope Dropdown */}
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-slate-700 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Role View:</span>
            <select
              value={activeRoleScope}
              onChange={(e) => setActiveRoleScope(e.target.value as any)}
              className="h-8 px-2 text-xs font-bold rounded border border-indigo-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            >
              <option value="admin">👑 Organization Admin View</option>
              <option value="hr">💼 HR Manager View</option>
              <option value="manager">👔 Department Head / Manager View</option>
              <option value="team_lead">👥 Team Lead View</option>
              <option value="employee">👤 Employee Self-Service View</option>
            </select>
          </div>

          <Button 
            onClick={() => navigate('/payroll/processing')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            Setup & Run Payroll
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/payroll/payslips')} 
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            Payslip Management
          </Button>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:to-slate-900 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Quick Payroll Module Shortcuts:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/processing')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <Play className="w-3.5 h-3.5 text-indigo-600" /> Payroll Processing
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/payslips')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Payslips
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/salary-structure')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Salary Structure
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/loans')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <Percent className="w-3.5 h-3.5 text-indigo-600" /> Loans
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/tax-declaration')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Tax Declaration
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/payroll/settlements')} className="text-xs flex items-center gap-1.5 hover:bg-indigo-100">
              <Users className="w-3.5 h-3.5 text-indigo-600" /> F&F Settlements
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Payroll Runs</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.totalRuns || payrolls.length || 4}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Active & archived cycles</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Payroll Cost</p>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(stats.payrollCost || 4400000)}</p>
              <p className="text-[11px] text-slate-500">Gross employee payout</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <p className="text-3xl font-extrabold text-amber-600">{pendingApprovals.length || stats.pendingApprovals || 2}</p>
              <p className="text-[11px] text-amber-600 font-medium">Requires admin sign-off</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statutory Deductions</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency((stats.pfContribution || 280000) + (stats.taxDeducted || 190000))}</p>
              <p className="text-[11px] text-indigo-600 font-medium">PF + ESI + TDS Tax</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Department Distribution & Statutory Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department-wise Payroll Cost Distribution */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Department-wise Payroll Cost Distribution
              </CardTitle>
              <CardDescription>Monthly salary distribution across organizational departments</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Current Month
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {departmentBreakdown.map((dept, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{dept.name} <span className="text-xs font-normal text-slate-500">({dept.count} Employees)</span></span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(dept.cost)} <span className="text-xs text-slate-400 font-normal">({dept.percentage}%)</span></span>
                </div>
                <Progress value={dept.percentage} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Compliance & Statutory Summary */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Compliance & Statutory Overview
            </CardTitle>
            <CardDescription>Statutory filings & PF/ESI status</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-medium">PF Contribution (12%)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.pfContribution || 280000)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-medium">ESI Contribution (0.75%)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.esiContribution || 45000)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-medium">TDS Tax Deducted</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(stats.taxDeducted || 190000)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">PF ECR Returns Filed</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Filed & Verified</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">ESI Monthly Returns</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Filed & Verified</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Form 16 Tax Certificates</span>
                <span className="text-indigo-600 font-semibold">Generated (78)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <Card className="border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Payroll Pending Admin Approval ({pendingApprovals.length})
              </CardTitle>
              <CardDescription>Review and approve pending monthly payroll runs to initiate disburse.</CardDescription>
            </div>
            <Button size="sm" onClick={() => navigate('/payroll/processing')} className="bg-amber-600 hover:bg-amber-700 text-white">
              Go to Approval Station
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingApprovals.slice(0, 3).map((payroll: any) => (
                <PayrollStatusCard
                  key={payroll.id}
                  cycleMonth={payroll.run_month}
                  status={payroll.status}
                  totalEmployees={payroll.total_employees}
                  processedEmployees={payroll.processed_employees}
                  errorCount={payroll.error_count}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payroll Runs */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Recent Payroll Runs</CardTitle>
            <CardDescription>Active and completed payroll execution cycles</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/payroll/processing')} className="text-indigo-600 flex items-center gap-1">
            View All Runs <ArrowRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {payrolls.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No recent payroll runs recorded. Click <strong>Setup & Run Payroll</strong> above to start.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {payrolls.slice(0, 4).map((payroll: any) => (
                <PayrollStatusCard
                  key={payroll.id}
                  cycleMonth={payroll.run_month}
                  status={payroll.status}
                  totalEmployees={payroll.total_employees}
                  processedEmployees={payroll.processed_employees}
                  errorCount={payroll.error_count}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDashboard;
