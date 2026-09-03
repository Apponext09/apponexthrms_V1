import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calculator, UserX, BarChart2, Download, Clock, RefreshCw } from 'lucide-react';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';
import { FullFinalSettlement } from './FullFinalSettlement';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

type TabKey = 'processing' | 'settlements' | 'reports';

const TABS = [
  { key: 'processing' as TabKey,     label: 'Run Payroll',       icon: Calculator },
  { key: 'settlements' as TabKey,    label: 'Exit Settlements',  icon: UserX },
  { key: 'reports' as TabKey,        label: 'Reports',           icon: BarChart2 },
];

const REPORTS = [
  { key: 'register', label: 'Monthly Payroll Register',    sub: 'Employee-wise earnings & deductions',  btn: 'Download CSV' },
  { key: 'ecr',      label: 'PF ECR Compliance File',      sub: 'Government portal formatted text file', btn: 'Download TXT' },
  { key: 'bank',     label: 'Bank Payout File (NEFT)',      sub: 'Account numbers & net salary amounts', btn: 'Download CSV' },
  { key: 'tds',      label: 'TDS / Form 24Q Summary',       sub: 'Quarterly income tax deduction data',  btn: 'Download CSV' },
];

export const HRPayrollPortal: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('processing');

  // Auto-switch tab based on URL
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes('settlement')) setActiveTab('settlements');
    if (p.includes('report')) setActiveTab('reports');
  }, [location.pathname]);

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
        const regRes: any = await apiClient.get(latestRunId ? `/payroll/runs/${latestRunId}/register` : '/payroll/salary-structures');
        const regData = Array.isArray(regRes.data?.data) ? regRes.data.data : (Array.isArray(regRes.data) ? regRes.data : []);
        const hdr = 'Code,Name,Basic,HRA,Gross,Total Deductions,Net\n';
        const rows = regData.map((r: any) => {
          const code = r.employee_code || r.employeeCode || `EMP-${r.id || ''}`;
          const name = r.name || r.employee_name || `${r.first_name || ''} ${r.last_name || ''}`.trim();
          const b = Number(r.basic_monthly || r.basic || 0);
          const h = Number(r.hra_monthly || r.hra || 0);
          const g = Number(r.gross_monthly || r.gross || 0);
          const d = Number(r.total_deductions || r.totalDeductions || 0);
          const n = Number(r.net_salary || r.net_take_home || r.netTakeHome || (g - d));
          return `"${code}","${name}",${b},${h},${g},${d},${n}`;
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
          <p className="text-xs text-muted-foreground mt-0.5">Manage monthly payroll processing and reports</p>
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
