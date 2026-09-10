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
  IndianRupee,
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
import { apiClient } from '@/config/api';
import { useSettlement } from '../hooks/index';


export const AdminPayrollPortal: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'policies' | 'settlements'>('policies');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { settlements, adminApproveSettlement, adminRejectSettlement, processSettlement, isLoading } = useSettlement();
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const pendingApproval = safeSettlements.filter((s: any) => s.status === 'submitted');
  const approvedList = safeSettlements.filter((s: any) => s.status === 'approved');
  const processedList = safeSettlements.filter((s: any) => s.status === 'processed');
  const allHistory = [...approvedList, ...processedList];

  const currentOrg = {
    id: user?.organizationId || 67,
    name: user?.organizationName || 'My Organization',
    employees: 0
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

  // Load policies from DB on mount
  useEffect(() => {
    apiClient.get('/payroll/policies').then((res: any) => {
      const p = res?.data?.data || res?.data;
      if (p && typeof p === 'object') {
        setPolicy(prev => ({
          ...prev,
          policy_name:              p.policy_name || p.name              || prev.policy_name,
          pay_cycle_type:           p.pay_cycle_type                     || prev.pay_cycle_type,
          pay_calculation_basis:    p.pay_calculation_basis              || prev.pay_calculation_basis,
          fixed_working_days:       p.fixed_working_days != null         ? Number(p.fixed_working_days)         : prev.fixed_working_days,
          cutoff_day:               p.cutoff_day != null                 ? Number(p.cutoff_day)                 : prev.cutoff_day,
          pay_day:                  p.pay_day != null                    ? Number(p.pay_day)                    : prev.pay_day,
          lop_deduction_formula:    p.lop_deduction_formula              || prev.lop_deduction_formula,
          overtime_rate_multiplier: p.overtime_rate_multiplier != null   ? Number(p.overtime_rate_multiplier)   : prev.overtime_rate_multiplier,
          pf_employee_rate:         p.pf_employee_rate != null           ? Number(p.pf_employee_rate)           : prev.pf_employee_rate,
          pf_employer_rate:         p.pf_employer_rate != null           ? Number(p.pf_employer_rate)           : prev.pf_employer_rate,
          pf_wage_ceiling:          p.pf_wage_ceiling != null            ? Number(p.pf_wage_ceiling)            : prev.pf_wage_ceiling,
          esi_employee_rate:        p.esi_employee_rate != null          ? Number(p.esi_employee_rate)          : prev.esi_employee_rate,
          esi_employer_rate:        p.esi_employer_rate != null          ? Number(p.esi_employer_rate)          : prev.esi_employer_rate,
          esi_wage_ceiling:         p.esi_wage_ceiling != null           ? Number(p.esi_wage_ceiling)           : prev.esi_wage_ceiling,
        }));
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/payroll/policies', policy);
      setSaved(true);
      showToast.success('Configuration Saved âœ…', 'Payroll policies saved to database successfully');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      showToast.error('Save Failed', err?.response?.data?.message || err?.message || 'Could not save policies');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure statutory rules and manage exit settlements</p>
        </div>
        {activeTab === 'policies' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved âœ…' : 'Save Settings'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'policies', label: 'Policies & Statutory Rules' },
          { key: 'settlements', label: 'Exit Settlements' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* â”€â”€ Settlements Tab â”€â”€ */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="flex gap-3">
            {[
              { label: 'Pending Approval', val: pendingApproval.length, cls: 'text-amber-700' },
              { label: 'Approved', val: approvedList.length, cls: 'text-blue-700' },
              { label: 'Settled', val: processedList.length, cls: 'text-emerald-700' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="border border-border rounded-lg px-4 py-2.5 text-center">
                <div className={`text-lg font-black ${cls}`}>{val}</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</div>
              </div>
            ))}
          </div>

          {/* Pending */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">Awaiting Approval ({pendingApproval.length})</h2>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Loading...</div>
              ) : pendingApproval.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No pending settlements.</div>
              ) : (
                <div className="space-y-3">
                  {pendingApproval.map((s: any) => {
                    const name = s.employee_name || `Employee #${s.employee_id}`;
                    const isRejecting = rejectingId === s.id;
                    return (
                      <div key={s.id} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-foreground">{name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.employeeCode || `EMP-${s.employee_id}`} â€¢ Exit: {s.exit_date}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">PENDING</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs bg-muted/30 rounded-lg p-3">
                          <div><p className="text-muted-foreground text-[10px]">Leave Encashment</p><p className="font-bold">â‚¹{Number(s.leave_encashment_amount || 0).toLocaleString('en-IN')}</p></div>
                          <div><p className="text-muted-foreground text-[10px]">Gratuity</p><p className="font-bold">â‚¹{Number(s.gratuity_amount || 0).toLocaleString('en-IN')}</p></div>
                          <div><p className="text-muted-foreground text-[10px]">Deductions</p><p className="font-bold text-rose-600">-â‚¹{Number((s.notice_period_recovery || 0) + (s.asset_recovery_amount || 0)).toLocaleString('en-IN')}</p></div>
                          <div><p className="text-muted-foreground text-[10px]">Net Payout</p><p className="font-black text-emerald-600">â‚¹{Number(s.total_settlement_amount || 0).toLocaleString('en-IN')}</p></div>
                        </div>
                        {!isRejecting ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleAdminApprove(s.id)} className="text-xs font-semibold text-emerald-700 hover:underline">âœ“ Approve</button>
                            <button onClick={() => setRejectingId(s.id)} className="text-xs font-semibold text-rose-600 hover:underline">âœ— Reject</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <input
                              placeholder="Reason (optional)"
                              value={rejectReason[s.id] || ''}
                              onChange={e => setRejectReason(prev => ({ ...prev, [s.id]: e.target.value }))}
                              className="flex-1 h-8 px-3 border border-border rounded-lg text-xs bg-background"
                            />
                            <button onClick={() => handleAdminReject(s.id)} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg">Confirm</button>
                            <button onClick={() => setRejectingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          {allHistory.length > 0 && (
            <div className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="text-sm font-bold text-foreground">Settlement History ({allHistory.length})</h2>
              </div>
              <div className="divide-y divide-border/50">
                {allHistory.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{s.employee_name || `Employee #${s.employee_id}`}</p>
                      <p className="text-muted-foreground">Exit: {s.exit_date} â€¢ Net: <strong className="text-emerald-600">â‚¹{Number(s.total_settlement_amount || 0).toLocaleString('en-IN')}</strong></p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(s.status)}
                      {s.status === 'approved' && (
                        <button onClick={() => processSettlement(s.id)} className="text-xs font-semibold text-primary hover:underline">Disburse</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Policies Tab â”€â”€ */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pay Cycle Rules */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">Pay Cycle & Calculation Rules</h2>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Policy Name</label>
                <input type="text" value={policy.policy_name} onChange={(e) => setPolicy({ ...policy, policy_name: e.target.value })}
                  className="w-full px-3 h-9 border border-border rounded-lg bg-background text-sm text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Pay Calculation Basis</label>
                  <select value={policy.pay_calculation_basis} onChange={(e) => setPolicy({ ...policy, pay_calculation_basis: e.target.value })}
                    className="w-full px-3 h-9 border border-border rounded-lg bg-background text-sm text-foreground">
                    <option value="calendar_days">Actual Days (28â€“31)</option>
                    <option value="working_days_26">Fixed 26 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">LOP Formula</label>
                  <select value={policy.lop_deduction_formula} onChange={(e) => setPolicy({ ...policy, lop_deduction_formula: e.target.value })}
                    className="w-full px-3 h-9 border border-border rounded-lg bg-background text-sm text-foreground">
                    <option value="gross_divided_by_days">Gross / Days</option>
                    <option value="basic_divided_by_days">Basic / Days</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Cutoff Day', key: 'cutoff_day', type: 'number' },
                  { label: 'Pay Day', key: 'pay_day', type: 'number' },
                  { label: 'OT Multiplier', key: 'overtime_rate_multiplier', type: 'number', step: '0.1' },
                ].map(({ label, key, type, step }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
                    <input type={type} step={step} value={(policy as any)[key]}
                      onChange={(e) => setPolicy({ ...policy, [key]: parseFloat(e.target.value) })}
                      className="w-full px-3 h-9 border border-border rounded-lg bg-background text-sm text-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PF & ESI */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">PF & ESI Statutory Limits</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Provident Fund (PF)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Employee Rate (%)', key: 'pf_employee_rate' },
                    { label: 'Employer Rate (%)', key: 'pf_employer_rate' },
                    { label: 'Wage Ceiling (â‚¹)', key: 'pf_wage_ceiling' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                      <input type="number" value={(policy as any)[key]}
                        onChange={(e) => setPolicy({ ...policy, [key]: parseFloat(e.target.value) })}
                        className="w-full px-3 h-8 border border-border rounded-lg bg-background text-xs text-foreground" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Employee State Insurance (ESI)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Employee Rate (%)', key: 'esi_employee_rate', step: '0.05' },
                    { label: 'Employer Rate (%)', key: 'esi_employer_rate', step: '0.05' },
                    { label: 'Wage Ceiling (â‚¹)', key: 'esi_wage_ceiling' },
                  ].map(({ label, key, step }) => (
                    <div key={key}>
                      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                      <input type="number" step={step} value={(policy as any)[key]}
                        onChange={(e) => setPolicy({ ...policy, [key]: parseFloat(e.target.value) })}
                        className="w-full px-3 h-8 border border-border rounded-lg bg-background text-xs text-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayrollPortal;
