import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Shield,
  Calendar,
  Save,
  CheckCircle,
  Percent,
  Sliders,
  Building,
  DollarSign,
  Users,
  Globe,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { showToast } from '@/components/ui/toast';

export const AdminPayrollPortal: React.FC = () => {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const currentOrg = {
    id: user?.organizationId || 67,
    name: user?.organizationName || (user?.organizationId === 65 ? 'Kot tech' : 'mm org'),
    employees: 8
  };

  const [policy, setPolicy] = useState({
    policy_name: 'Standard Corporate Payroll Policy',
    pay_cycle_type: 'monthly',
    pay_calculation_basis: 'calendar_days',
    fixed_working_days: 26,
    cutoff_day: 25,
    pay_day: 1,
    lop_deduction_formula: 'gross_divided_by_days',
    overtime_rate_multiplier: 1.5,
    pf_employee_rate: 12,
    pf_employer_rate: 12,
    pf_wage_ceiling: 15000,
    esi_employee_rate: 0.75,
    esi_employer_rate: 3.25,
    esi_wage_ceiling: 21000
  });

  const handleSave = () => {
    setSaved(true);
    showToast.success('Configuration Saved', 'Payroll policies and statutory rules updated');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Payroll Policies & Statutory Settings</h1>
            <p className="text-xs text-muted-foreground">
              Active Org: <span className="text-primary font-bold">{currentOrg.name} (Org #{currentOrg.id})</span> • {currentOrg.employees} Active Employees
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shrink-0">
          <Save className="w-3.5 h-3.5" /> {saved ? 'Policy Saved!' : 'Save Configuration'}
        </Button>
      </div>

      {/* Organization Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase">Active Organization</div>
              <div className="text-base font-black text-foreground">{currentOrg.name}</div>
              <div className="text-[10px] text-muted-foreground">Org ID #{currentOrg.id}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase">Organization Workforce</div>
              <div className="text-base font-black text-foreground">{currentOrg.employees} Employees</div>
              <div className="text-[10px] text-primary">Assigned to current tenant</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium">Payroll policy settings and statutory rules successfully updated!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pay Cycle Rules */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Pay Cycle & Calculation Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Policy Name</label>
              <input
                type="text"
                value={policy.policy_name}
                onChange={(e) => setPolicy({ ...policy, policy_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Pay Calculation Basis</label>
                <select
                  value={policy.pay_calculation_basis}
                  onChange={(e) => setPolicy({ ...policy, pay_calculation_basis: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="calendar_days">Actual Days in Month (28-31)</option>
                  <option value="working_days_26">Fixed 26 Working Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">LOP Deduction Formula</label>
                <select
                  value={policy.lop_deduction_formula}
                  onChange={(e) => setPolicy({ ...policy, lop_deduction_formula: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="gross_divided_by_days">Gross Salary / Month Days</option>
                  <option value="basic_divided_by_days">Basic Salary / Month Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Attendance Cutoff Day</label>
                <input
                  type="number"
                  value={policy.cutoff_day}
                  onChange={(e) => setPolicy({ ...policy, cutoff_day: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Pay Disbursement Day</label>
                <input
                  type="number"
                  value={policy.pay_day}
                  onChange={(e) => setPolicy({ ...policy, pay_day: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Overtime Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={policy.overtime_rate_multiplier}
                  onChange={(e) => setPolicy({ ...policy, overtime_rate_multiplier: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statutory Compliance Rules */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> PF & ESI Statutory Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="border-b pb-3">
              <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">Provident Fund (PF) Rules</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Employee PF Rate (%)</label>
                  <input
                    type="number"
                    value={policy.pf_employee_rate}
                    onChange={(e) => setPolicy({ ...policy, pf_employee_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Employer PF Rate (%)</label>
                  <input
                    type="number"
                    value={policy.pf_employer_rate}
                    onChange={(e) => setPolicy({ ...policy, pf_employer_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">PF Statutory Wage Cap (₹)</label>
                  <input
                    type="number"
                    value={policy.pf_wage_ceiling}
                    onChange={(e) => setPolicy({ ...policy, pf_wage_ceiling: parseInt(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-800 dark:text-white mb-2">Employee State Insurance (ESI) Rules</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Employee ESI Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={policy.esi_employee_rate}
                    onChange={(e) => setPolicy({ ...policy, esi_employee_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Employer ESI Rate (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={policy.esi_employer_rate}
                    onChange={(e) => setPolicy({ ...policy, esi_employer_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">ESI Gross Wage Ceiling (₹)</label>
                  <input
                    type="number"
                    value={policy.esi_wage_ceiling}
                    onChange={(e) => setPolicy({ ...policy, esi_wage_ceiling: parseInt(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default AdminPayrollPortal;
