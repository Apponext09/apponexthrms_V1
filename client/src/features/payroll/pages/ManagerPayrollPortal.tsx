import React, { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  Users,
  Building,
  Clock,
  ShieldCheck,
  UserX,
  RefreshCw,
  ChevronRight,
  User,
  Briefcase,
  IndianRupee
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamSettlementsPage } from './TeamSettlementsPage';
import { apiClient } from '@/config/api';

const fmt = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

export const ManagerPayrollPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'team' | 'settlements'>('analytics');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    monthlyGrossPayroll: 0,
    averageSalary: 0,
    annualPayroll: 0,
    employees: [] as any[],
  });

  useEffect(() => {
    setLoading(true);
    apiClient.get('/payroll/manager-stats')
      .then((res: any) => {
        const d = res?.data?.data || res?.data || {};
        setStats({
          totalEmployees: Number(d.totalEmployees || 0),
          monthlyGrossPayroll: Number(d.monthlyGrossPayroll || 0),
          averageSalary: Number(d.averageSalary || 0),
          annualPayroll: Number(d.annualPayroll || 0),
          employees: Array.isArray(d.employees) ? d.employees : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topCostGroups = (() => {
    if (!stats.employees.length) return [];
    const map: Record<string, { amount: number; count: number }> = {};
    for (const e of stats.employees) {
      const key = e.designation || e.job_title || 'General';
      if (!map[key]) map[key] = { amount: 0, count: 0 };
      map[key].amount += Number(e.grossMonthly || 0);
      map[key].count += 1;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  })();

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/90 backdrop-blur-md border border-border/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">Department Payroll & Budget Analytics</h1>
              <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 text-[10px] font-bold">Dept Manager</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time department compensation, cost distribution and team payroll data
            </p>
          </div>
        </div>
        <div className="bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-200 text-right shrink-0">
          <div className="text-[10px] text-sky-700 dark:text-sky-300 uppercase tracking-wider font-extrabold">Monthly Outlay</div>
          {loading
            ? <div className="text-base font-black text-muted-foreground animate-pulse">Loading...</div>
            : <div className="text-base font-black text-foreground">{fmt(stats.monthlyGrossPayroll)}</div>
          }
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-card/80 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'analytics', label: 'Budget & Analytics', icon: PieChart },
            { key: 'team', label: 'Team Salary Overview', icon: Users },
            { key: 'settlements', label: 'Team Exit Settlements', icon: UserX },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Settlements Tab ─── */}
      {activeTab === 'settlements' && <TeamSettlementsPage />}

      {/* ─── Analytics Tab ─── */}
      {activeTab === 'analytics' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'Total Monthly Gross', val: loading ? '—' : fmt(stats.monthlyGrossPayroll), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
              { title: 'Dept Employee Count', val: loading ? '—' : `${stats.totalEmployees} Employees`, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
              { title: 'Average Gross / Head', val: loading ? '—' : fmt(stats.averageSalary), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
              { title: 'Annual Payroll Outlay', val: loading ? '—' : fmt(stats.annualPayroll), icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            ].map(({ title, val, icon: Icon, color, bg }) => (
              <Card key={title} className="border border-border/80 shadow-xs">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">{title}</div>
                    <div className={`text-base font-black mt-0.5 ${loading ? 'text-muted-foreground' : 'text-foreground'}`}>{val}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Multi-Tier Banner */}
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs text-foreground font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span><strong>Multi-Tier Department Hierarchy Rule Active:</strong> Includes all Team Leads and Employees reporting under this manager.</span>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold shrink-0">Live DB</Badge>
          </div>

          {/* Cost Center Breakdown */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" />
                Designation-wise CTC Distribution
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {topCostGroups.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-4">No salary data available for your department yet.</p>
              )}
              {topCostGroups.map((cc, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-foreground">{cc.name} ({cc.count} Members)</span>
                    <span className="font-bold text-foreground">{fmt(cc.amount)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: stats.monthlyGrossPayroll > 0 ? `${(cc.amount / stats.monthlyGrossPayroll) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Team Salary Overview Tab ─── */}
      {activeTab === 'team' && (
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Team Salary Overview — All {stats.totalEmployees} Employees
            </CardTitle>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Loading team salary data from database...
              </div>
            ) : stats.employees.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No employees found in your department. Assign employees to this department first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      {['Employee', 'Code', 'Designation', 'Monthly Gross', 'Basic', 'PF Deduction', 'Annual CTC', 'Pay Slab'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stats.employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="font-bold text-foreground">{emp.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{emp.employeeCode || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-foreground">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            {emp.designation || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-black text-foreground">{emp.grossMonthly > 0 ? fmt(emp.grossMonthly) : <span className="text-amber-500 font-bold">Not Set</span>}</td>
                        <td className="px-4 py-3 text-foreground">{emp.basicMonthly > 0 ? fmt(emp.basicMonthly) : '—'}</td>
                        <td className="px-4 py-3 text-rose-600 font-bold">{emp.pfDeduction > 0 ? `−${fmt(emp.pfDeduction)}` : '—'}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold">{emp.annualCtc > 0 ? fmt(emp.annualCtc) : '—'}</td>
                        <td className="px-4 py-3">
                          {emp.slabName
                            ? <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">{emp.slabName}</Badge>
                            : <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">Not Assigned</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 border-t-2 border-border/60">
                      <td colSpan={3} className="px-4 py-3 text-xs font-black text-foreground">Department Total</td>
                      <td className="px-4 py-3 font-black text-primary">{fmt(stats.monthlyGrossPayroll)}/mo</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagerPayrollPortal;
