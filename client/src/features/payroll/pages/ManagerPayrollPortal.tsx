import React, { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  Building,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ManagerPayrollPortal: React.FC = () => {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" /> Manager Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Department Payroll & Budget Analytics</h1>
          <p className="text-purple-200 text-sm mt-1">
            Analyze department compensation expense, cost distribution, and process escalated team approvals.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 text-right">
          <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Monthly Dept Outlay</div>
          <div className="text-xl font-black text-white">₹{departmentStats.monthlyGrossPayroll.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Total Monthly Gross</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{(departmentStats.monthlyGrossPayroll / 100000).toFixed(2)} Lakhs
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Dept Employee Count</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {departmentStats.totalEmployees} Employees
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Average Gross / Head</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                ₹{departmentStats.averageSalary.toLocaleString('en-IN')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase">Pending Escalations</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {departmentStats.pendingLoanApprovals} Requests
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Tier Hierarchy Resolution Rule Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span><strong>Multi-Tier Department Hierarchy Rule Active:</strong> Includes all 1st-tier Team Leads and 2nd-tier Employees reporting under department heads.</span>
        </div>
        <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">Tier-2 Active</Badge>
      </div>

      {/* Cost Center Breakdown Grid */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" /> Sub-Team CTC Distribution & Cost Centers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {departmentStats.topCostCenters.map((cc, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>{cc.name} ({cc.count} Members)</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{cc.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                    style={{ width: `${(cc.amount / departmentStats.monthlyGrossPayroll) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerPayrollPortal;
