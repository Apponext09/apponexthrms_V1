import React, { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  Building,
  Clock,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeamSettlementsPage } from './TeamSettlementsPage';

export const ManagerPayrollPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'settlements'>('analytics');
  const [departmentStats] = useState({
    totalEmployees: 8,
    monthlyGrossPayroll: 536000,
    averageSalary: 67000,
    pendingLoanApprovals: 2,
    topCostCenters: [
      { name: 'Engineering & Development (got, mot, tee)', amount: 212800, count: 3 },
      { name: 'Team Lead & Management (teeam lead, PP Manager)', amount: 145000, count: 2 },
      { name: 'HR & Operations (hrr, NN, Hrrr Employee)', amount: 178200, count: 3 }
    ]
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Department Payroll & Budget Analytics</h1>
            <p className="text-xs text-muted-foreground">
              Analyze department compensation expense, cost distribution, and process team approvals
            </p>
          </div>
        </div>
        <div className="bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 text-right shrink-0">
          <div className="text-[10px] text-primary uppercase tracking-wider font-bold">Monthly Outlay</div>
          <div className="text-sm font-black text-foreground">₹{departmentStats.monthlyGrossPayroll.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex border-b border-border/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Budget & Analytics
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'settlements'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            Team Exit Settlements (Read-Only)
          </button>
        </div>
      </div>

      {activeTab === 'settlements' ? (
        <TeamSettlementsPage />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Total Monthly Gross', val: `₹${(departmentStats.monthlyGrossPayroll / 100000).toFixed(2)} Lakhs`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
          { title: 'Dept Employee Count', val: `${departmentStats.totalEmployees} Employees`, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { title: 'Average Gross / Head', val: `₹${departmentStats.averageSalary.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { title: 'Pending Escalations', val: `${departmentStats.pendingLoanApprovals} Requests`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map(({ title, val, icon: Icon, color, bg }) => (
          <Card key={title} className="border border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">{title}</div>
                <div className="text-base font-black text-foreground mt-0.5">{val}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Multi-Tier Hierarchy Resolution Rule Banner */}
      <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs text-foreground font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span><strong>Multi-Tier Department Hierarchy Rule Active:</strong> Includes all 1st-tier Team Leads and 2nd-tier Employees reporting under department heads.</span>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold shrink-0">Tier-2 Active</Badge>
      </div>

      {/* Cost Center Breakdown Grid */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" /> Sub-Team CTC Distribution & Cost Centers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {departmentStats.topCostCenters.map((cc, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-foreground">{cc.name} ({cc.count} Members)</span>
                <span className="font-bold text-foreground">₹{cc.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(cc.amount / departmentStats.monthlyGrossPayroll) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
};

export default ManagerPayrollPortal;
