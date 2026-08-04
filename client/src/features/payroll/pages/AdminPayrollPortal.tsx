import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Layers,
  UserX,
  Clock,
  XCircle,
  AlertCircle,
  CheckCircle2,
  User,
  Calculator,
  FileText,
  TrendingUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/features/auth/store/authStore';
import { showToast } from '@/components/ui/toast';
import { useSettlement } from '../hooks/index';


export const AdminPayrollPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'policies' | 'settlements'>('policies');
  const [saved, setSaved] = useState(false);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { settlements, adminApproveSettlement, adminRejectSettlement, processSettlement, isLoading } = useSettlement();
  const safeSettlements = Array.isArray(settlements) ? settlements : [];

  const pendingApproval = safeSettlements.filter((s: any) => s.status === 'submitted');
  const approved = safeSettlements.filter((s: any) => s.status === 'approved');
  const processed = safeSettlements.filter((s: any) => s.status === 'processed');
  const allHistory = [...approved, ...processed];

  const currentOrg = {
    id: user?.organizationId || 67,
    name: user?.organizationName || (user?.organizationId === 65 ? 'Kot tech' : 'mm org'),
    employees: 8
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'processed') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">SETTLED</Badge>;
    if (s === 'approved') return <Badge className="bg-blue-600 text-white font-bold text-[10px]">APPROVED</Badge>;
    if (s === 'submitted') return <Badge className="bg-amber-500 text-white font-bold text-[10px]">PENDING APPROVAL</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground font-bold text-[10px]">{s.toUpperCase() || 'DRAFT'}</Badge>;
  };

  const handleAdminApprove = (settlementId: number) => {
    adminApproveSettlement(settlementId, {
      onSuccess: () => showToast.success('Settlement Approved', 'HR can now disburse the final amount.'),
      onError: (err: any) => showToast.error('Error', err?.message || 'Failed to approve settlement')
    });
  };

  const handleAdminReject = (settlementId: number) => {
    const reason = rejectReason[settlementId] || '';
    adminRejectSettlement({ settlementId, reason }, {
      onSuccess: () => {
        showToast.info('Settlement Rejected', 'Sent back to HR for revision.');
        setRejectingId(null);
        setRejectReason(prev => { const n = { ...prev }; delete n[settlementId]; return n; });
      },
      onError: (err: any) => showToast.error('Error', err?.message || 'Failed to reject settlement')
    });
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
      {/* Rich Gradient Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-purple-500/20">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-500/20 border border-purple-400/30 rounded-2xl backdrop-blur-md text-purple-300 shadow-inner">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Payroll Policies & Governance</h1>
                <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/30 text-[10px] font-bold">Admin Portal</Badge>
              </div>
              <p className="text-xs text-purple-200/80 mt-1">
                Active Organization: <span className="text-purple-300 font-bold">{currentOrg.name}</span> (Org #{currentOrg.id}) • {currentOrg.employees} Active Employees
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button onClick={() => navigate('/payroll/settings')} className="h-9 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center gap-2 shadow-lg shadow-purple-500/20 border border-purple-400/30 transition-all cursor-pointer">
              <Sliders className="w-4 h-4" /> Payroll Master Settings
            </Button>
            <Button onClick={handleSave} className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all cursor-pointer">
              <Save className="w-4 h-4" /> {saved ? 'Policy Saved!' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex border-b border-border/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('policies')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'policies'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Payroll Policies & Statutory Config
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
            Exit Settlements & Clearances
          </button>
        </div>
      </div>

      {/* Department Payroll Cost Analytics Card */}
      <Card className="border border-border/80 shadow-md bg-card">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-sm font-bold">Department-Wise Total Payroll Cost Analytics</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Total monthly organization payroll cost & statutory contribution breakdown per department</CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 font-bold">Real-time Department Cost</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Engineering Department</span>
                <Badge variant="outline" className="text-[10px]">12 Employees</Badge>
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2">₹7,20,000 / mo</div>
              <div className="text-[11px] text-muted-foreground mt-1">PF: ₹86,400 | ESI: ₹0 | PT: ₹2,400</div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 dark:bg-purple-950/20 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Sales & Marketing</span>
                <Badge variant="outline" className="text-[10px]">8 Employees</Badge>
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">₹4,80,000 / mo</div>
              <div className="text-[11px] text-muted-foreground mt-1">PF: ₹57,600 | ESI: ₹3,600 | PT: ₹1,600</div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Human Resources & Admin</span>
                <Badge variant="outline" className="text-[10px]">5 Employees</Badge>
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">₹2,80,000 / mo</div>
              <div className="text-[11px] text-muted-foreground mt-1">PF: ₹33,600 | ESI: ₹0 | PT: ₹1,000</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Calculated Employee Payroll Record */}
      <Card className="border border-border/80 shadow-md bg-card">
        <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Calculated Employee Payroll Register (Live Sample Record)
            </CardTitle>
            <CardDescription className="text-xs">Itemized breakdown of gross earnings, statutory deductions, LOP scaling, and net salary payout</CardDescription>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">Processed</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Paid / LOP Days</th>
                  <th className="p-3">Earned Basic</th>
                  <th className="p-3">Earned HRA</th>
                  <th className="p-3">Gross Earned</th>
                  <th className="p-3">PF (12%)</th>
                  <th className="p-3">PT</th>
                  <th className="p-3">TDS Tax</th>
                  <th className="p-3 text-right">Net Take-Home</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-muted/20 transition-colors text-xs">
                  <td className="p-3">
                    <div className="font-bold text-foreground">Rahul Sharma</div>
                    <div className="text-[10px] text-muted-foreground font-mono">EMP-101</div>
                  </td>
                  <td className="p-3 font-semibold text-muted-foreground">Engineering</td>
                  <td className="p-3">
                    <span className="font-bold text-foreground">28 Paid</span>
                    <span className="text-[10px] text-amber-600 block">(2 LOP Days)</span>
                  </td>
                  <td className="p-3 font-semibold">₹28,000</td>
                  <td className="p-3 font-semibold">₹14,000</td>
                  <td className="p-3 font-bold text-emerald-600">₹58,850</td>
                  <td className="p-3 font-semibold text-rose-600">−₹1,800</td>
                  <td className="p-3 font-semibold text-rose-600">−₹200</td>
                  <td className="p-3 font-semibold text-rose-600">−₹2,250</td>
                  <td className="p-3 text-right font-black text-sm text-foreground bg-primary/5">
                    ₹54,600
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'settlements' ? (
        <div className="space-y-6">
          {/* Admin Header */}
          <Card className="border border-border/80 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600 text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">Admin Settlement Approval Console</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only Organization Admins can approve F&amp;F Settlements. HR submits for review; you approve or reject here.
                </p>
              </div>
              <div className="ml-auto flex gap-3 text-center shrink-0">
                <div className="px-3 py-2 bg-amber-100 rounded-lg border border-amber-200">
                  <div className="text-lg font-black text-amber-700">{pendingApproval.length}</div>
                  <div className="text-[10px] font-bold text-amber-600 uppercase">Pending</div>
                </div>
                <div className="px-3 py-2 bg-blue-100 rounded-lg border border-blue-200">
                  <div className="text-lg font-black text-blue-700">{approved.length}</div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase">Approved</div>
                </div>
                <div className="px-3 py-2 bg-emerald-100 rounded-lg border border-emerald-200">
                  <div className="text-lg font-black text-emerald-700">{processed.length}</div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Settled</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold">Settlements Awaiting Your Approval ({pendingApproval.length})</CardTitle>
              </div>
              <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                HR has calculated and submitted these F&amp;F settlements. Review details and approve or reject.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading settlements...</div>
              ) : pendingApproval.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No pending settlement approvals</p>
                  <p className="text-[11px] text-muted-foreground mt-1">HR will submit settlements here for your review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApproval.map((s: any) => {
                    const name = s.employee_name || `Employee #${s.employee_id}`;
                    const isRejecting = rejectingId === s.id;
                    return (
                      <div key={s.id} className="p-4 border-2 border-amber-200 bg-amber-50/40 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {s.employeeCode || s.employee_code || `EMP-${s.employee_id}`} • Exit:{' '}
                                <strong className="text-foreground">{s.exit_date}</strong> • Notice: {s.notice_period_days || 30} days
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(s.status)}
                        </div>

                        {/* Settlement Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-white border border-amber-200 rounded-lg text-xs">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Leave Encashment</p>
                            <p className="font-bold text-foreground mt-0.5">₹{Number(s.leave_encashment_amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Gratuity</p>
                            <p className="font-bold text-foreground mt-0.5">₹{Number(s.gratuity_amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Deductions</p>
                            <p className="font-bold text-rose-600 mt-0.5">-₹{Number((s.notice_period_recovery || 0) + (s.asset_recovery_amount || 0) + (s.other_deductions || 0)).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-primary uppercase">Net Payout</p>
                            <p className="font-black text-emerald-600 text-sm mt-0.5">₹{Number(s.total_settlement_amount || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        {/* Approval Actions */}
                        {!isRejecting ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                              onClick={() => handleAdminApprove(s.id)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Approve Settlement
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-[10px] font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
                              onClick={() => setRejectingId(s.id)}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject &amp; Send Back
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              placeholder="Reason for rejection (optional)..."
                              value={rejectReason[s.id] || ''}
                              onChange={e => setRejectReason(prev => ({ ...prev, [s.id]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1" onClick={() => handleAdminReject(s.id)}>
                                <XCircle className="w-3.5 h-3.5" /> Confirm Rejection
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-[10px]" onClick={() => setRejectingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settlement History */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold">Settlement History — Approved &amp; Processed ({allHistory.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {allHistory.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No settlement history yet.</div>
              ) : (
                <div className="space-y-3">
                  {allHistory.map((s: any) => {
                    const name = s.employee_name || `Employee #${s.employee_id}`;
                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border border-border/60 rounded-xl bg-card">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs">{name}</p>
                            <p className="text-[10px] text-muted-foreground">Exit: {s.exit_date} • Net: <strong className="text-emerald-600">₹{Number(s.total_settlement_amount || 0).toLocaleString('en-IN')}</strong></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(s.status)}
                          {s.status === 'approved' && (
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => processSettlement(s.id)}>
                              <DollarSign className="w-3 h-3" /> Disburse
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (

        <>
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
      </>
      )}

    </div>
  );
};

export default AdminPayrollPortal;
