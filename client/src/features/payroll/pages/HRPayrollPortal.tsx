import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calculator, Receipt, UserX, BarChart2, Download, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';
import { FullFinalSettlement } from './FullFinalSettlement';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

type TabKey = 'processing' | 'reimbursements' | 'settlements' | 'reports';

const TABS = [
  { key: 'processing' as TabKey,     label: 'Run Payroll',       icon: Calculator },
  { key: 'reimbursements' as TabKey, label: 'Reimbursements',    icon: Receipt },
  { key: 'settlements' as TabKey,    label: 'Exit Settlements',  icon: UserX },
  { key: 'reports' as TabKey,        label: 'Reports',           icon: BarChart2 },
];

const REPORTS = [
  { key: 'register', label: 'Monthly Payroll Register',    sub: 'Employee-wise earnings & deductions',  btn: 'Download CSV' },
  { key: 'ecr',      label: 'PF ECR Compliance File',      sub: 'Government portal formatted text file', btn: 'Download TXT' },
  { key: 'bank',     label: 'Bank Payout File (NEFT)',      sub: 'Account numbers & net salary amounts', btn: 'Download CSV' },
  { key: 'tds',      label: 'TDS / Form 24Q Summary',       sub: 'Quarterly income tax deduction data',  btn: 'Download CSV' },
];

const statusBadge = (s: string) => {
  const st = s?.toLowerCase();
  if (st === 'approved') return { label: 'Approved', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (st === 'rejected') return { label: 'Rejected', cls: 'text-rose-700 bg-rose-50 border-rose-200' };
  return { label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
};

export const HRPayrollPortal: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('processing');

  // Auto-switch tab based on URL
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('reimbursements') || p.includes('expense') || p.includes('travel')) setActiveTab('reimbursements');
  }, [location.pathname]);

  // ── Reimbursements ────────────────────────────────────────────────────────────
  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  useEffect(() => {
    setClaimsLoading(true);
    apiClient.get('/payroll/reimbursements').then((res: any) => {
      const list = res?.data?.data || res?.data || [];
      setClaims(Array.isArray(list) ? list : []);
    }).catch(() => setClaims([])).finally(() => setClaimsLoading(false));
  }, []);

  const handleAction = (id: number | string, action: 'approve' | 'reject') => {
    const method = action === 'approve' ? 'put' : 'put';
    const endpoint = action === 'approve'
      ? `/payroll/reimbursements/${id}/approve`
      : `/payroll/reimbursements/${id}/reject`;
    apiClient[method](endpoint).catch(() => {});
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'approved' : 'rejected' } : c));
    showToast.success(action === 'approve' ? 'Approved ✅' : 'Rejected', `Claim #${id} updated.`);
  };

  // ── Reports ───────────────────────────────────────────────────────────────────
  const [latestRunId, setLatestRunId] = useState<number | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/payroll', { params: { limit: 5 } }).then((res: any) => {
      const runs: any[] = res?.data?.data || res?.data || [];
      const pub = runs.find((r: any) => r.status === 'published') || runs[0];
      if (pub?.id) setLatestRunId(Number(pub.id));
    }).catch(() => {});
    apiClient.get('/employees').then((res: any) => {
      setEmployees(res?.data?.data || res?.data || []);
    }).catch(() => {});
  }, []);

  const download = (content: string, name: string, type = 'text/csv') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
  };

  const handleReport = async (key: string) => {
    if ((key === 'bank' || key === 'ecr') && !latestRunId) {
      showToast.error('No Run', 'Publish a payroll run first.');
      return;
    }
    setReportLoading(key);
    try {
      if (key === 'register') {
        const hdr = 'Code,Name,Basic,HRA,Gross,PF,ESI,TDS,Net\n';
        const rows = employees.map((e: any) => {
          const g = Number(e.gross_salary || 0);
          const b = Math.round(g * 0.5);
          const h = Math.round(b * 0.4);
          const pf = Math.min(1800, Math.round(b * 0.12));
          return `${e.employee_code || 'EMP-' + e.id},"${e.first_name} ${e.last_name}",${b},${h},${g},${pf},0,0,${g - pf}`;
        }).join('\n');
        download(hdr + rows, `Payroll_Register_${new Date().toISOString().slice(0, 7)}.csv`);
      } else if (key === 'tds') {
        const hdr = 'Code,Name,Annual Gross,Taxable,TDS\n';
        const rows = employees.map((e: any) => {
          const g = Number(e.gross_salary || 0) * 12;
          const t = Math.max(0, g - 75000);
          return `${e.employee_code || 'EMP-' + e.id},"${e.first_name} ${e.last_name}",${g},${t},${Math.round(t * 0.05)}`;
        }).join('\n');
        download(hdr + rows, `TDS_${new Date().toISOString().slice(0, 7)}.csv`);
      } else if (key === 'bank') {
        const res: any = await apiClient.get(`/payroll/${latestRunId}/bank-transfer`, { responseType: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
        a.download = `Bank_Run${latestRunId}.csv`; a.click();
      } else if (key === 'ecr') {
        const res: any = await apiClient.get(`/payroll/${latestRunId}/compliance`, { responseType: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([res.data], { type: 'text/plain' }));
        a.download = `PF_ECR_Run${latestRunId}.txt`; a.click();
      }
      showToast.success('Downloaded ✅', 'Report exported successfully.');
    } catch {
      showToast.error('Failed', 'Could not generate report.');
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Payroll</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage monthly payroll processing, reimbursements and reports</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Run Payroll ── */}
      {activeTab === 'processing' && <Payroll10StepFlow />}

      {/* ── Reimbursements ── */}
      {activeTab === 'reimbursements' && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-bold text-foreground">Employee Reimbursement Claims</h2>
            <p className="text-xs text-muted-foreground">Approve or reject employee expense and travel claims</p>
          </div>
          {claimsLoading ? (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading claims...
            </div>
          ) : claims.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
              No reimbursement claims found.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['Employee', 'Type', 'Amount', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase text-[10px] tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {claims.map((c: any) => {
                  const sb = statusBadge(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {c.empName || `${c.first_name || ''} ${c.last_name || ''}`.trim() || `EMP-${c.employee_id}`}
                      </td>
                      <td className="px-4 py-3 text-foreground">{c.claim_type || c.type || '—'}</td>
                      <td className="px-4 py-3 font-bold text-foreground">₹{Number(c.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.claim_date || c.date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sb.cls}`}>{sb.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(c.status === 'pending' || !c.status) && (
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(c.id, 'approve')} className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => handleAction(c.id, 'reject')} className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                        {c.status === 'approved' && <span className="text-emerald-600 text-[11px] font-semibold">Approved</span>}
                        {c.status === 'rejected' && <span className="text-rose-600 text-[11px] font-semibold">Rejected</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Exit Settlements ── */}
      {activeTab === 'settlements' && <FullFinalSettlement />}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Bank & ECR reports require a published payroll run. {latestRunId ? `Using Run #${latestRunId}.` : 'No published run found — publish payroll first.'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORTS.map(r => (
              <div key={r.key} className="border border-border rounded-xl p-4 bg-card flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.sub}</div>
                </div>
                <button
                  onClick={() => handleReport(r.key)}
                  disabled={reportLoading === r.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors shrink-0 disabled:opacity-50"
                >
                  {reportLoading === r.key
                    ? <><RefreshCw className="w-3 h-3 animate-spin" /> Downloading...</>
                    : <><Download className="w-3 h-3" /> {r.btn}</>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
