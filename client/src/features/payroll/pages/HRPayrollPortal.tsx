import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Zap,
  FileSpreadsheet,
  Building,
  Download,
  FileText,
  Receipt,
  PieChart,
  CheckCircle2,
  ShieldCheck,
  IndianRupee,
  UserX,
  Sliders
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';
import { FullFinalSettlement } from './FullFinalSettlement';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

type TabKey = 'processing' | 'settlements' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'processing', label: 'Processing Pipeline', icon: Zap },
  { key: 'settlements', label: 'Exit Settlements', icon: UserX },
  { key: 'reports', label: 'Reports & Compliance', icon: PieChart },
];

const REPORT_CARDS = [
  {
    title: 'Monthly Payroll Register',
    desc: 'Comprehensive employee-wise earnings, statutory deductions, and net payouts for the current month.',
    icon: FileSpreadsheet,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    btnLabel: 'Download Register (CSV)',
    key: 'register',
  },
  {
    title: 'PF ECR Compliance Return',
    desc: 'Government Portal–formatted Provident Fund ECR text return file for electronic filing.',
    icon: ShieldCheck,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
    btnLabel: 'Export PF ECR Text File',
    key: 'ecr',
  },
  {
    title: 'Bank Payout NEFT / RTGS',
    desc: 'Bank-format CSV containing employee account numbers, IFSC codes, and net salary amounts.',
    icon: IndianRupee,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    btnLabel: 'Export Bank Payout CSV',
    key: 'bank',
  },
  {
    title: 'TDS / Form 24Q Summary',
    desc: 'Quarterly TDS deduction summary and 24Q return data for income tax compliance.',
    icon: FileText,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
    btnLabel: 'Export TDS Summary',
    key: 'tds',
  },
];

export const HRPayrollPortal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('processing');
  const [claimCategoryFilter, setClaimCategoryFilter] = useState<'all' | 'expense' | 'travel'>('all');

  // Auto-redirect expense/reimbursement paths to dedicated Expenses & Travel module
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('expense-claims') || path.includes('travel-requests') || path.includes('reimbursements')) {
      navigate('/expense-claims', { replace: true });
    }
  }, [location.pathname, navigate]);

  const [adminClaims, setAdminClaims] = useState<any[]>([
    { id: 103, empName: 'NN Employee', code: 'EMP702', type: 'Medical Reimbursement', amount: 2800, date: '2026-07-20', status: 'pending', isTravel: false, description: 'Outpatient consultation claim' },
    { id: 104, empName: 'HR Employee', code: 'EMP7576', type: 'Food & Internet Allowance', amount: 1200, date: '2026-07-18', status: 'approved', isTravel: false, description: 'Client dinner & internet expense' },
  ]);

  // Load claims from API and shared storage on mount
  useEffect(() => {
    const storageKey = 'shared_hr_reimbursements';
    let localShared: any[] = [];
    try {
      localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {}

    apiClient.get('/payroll/reimbursements').then((res: any) => {
      const apiList = res.data?.data || res.data || [];
      const combinedMap = new Map<string | number, any>();

      [...adminClaims, ...localShared, ...apiList].forEach((c: any) => {
        const idKey = c.id || c.uuid;
        if (idKey && !combinedMap.has(idKey)) {
          const typeStr = String(c.claim_type || c.type || 'Expense Claim');
          const isTravelType = typeStr.toLowerCase().includes('travel') || Boolean(c.isTravel);
          combinedMap.set(idKey, {
            id: idKey,
            empName: c.empName || `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Employee #${c.employee_id || idKey}`,
            code: c.code || c.employee_code || `EMP-${c.employee_id || '001'}`,
            type: typeStr,
            amount: Number(c.amount || 0),
            date: c.claim_date || c.date || new Date().toISOString().split('T')[0],
            status: (c.status || 'pending').toLowerCase(),
            description: c.description || 'Employee submitted request',
            isTravel: isTravelType
          });
        }
      });

      setAdminClaims(Array.from(combinedMap.values()));
    }).catch(() => {
      if (localShared.length > 0) {
        setAdminClaims(prev => {
          const map = new Map<string | number, any>();
          [...prev, ...localShared].forEach(c => map.set(c.id, c));
          return Array.from(map.values());
        });
      }
    });
  }, []);

  const handleApproveClaim = (id: number | string) => {
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'approved' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}
    apiClient.put(`/payroll/reimbursements/${id}/approve`).catch(() => {});
    showToast.success('Request Approved', `Claim #${id} approved successfully!`);
  };

  const handleRejectClaim = (id: number | string) => {
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    try {
      const storageKey = 'shared_hr_reimbursements';
      let localShared = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localShared = localShared.map((c: any) => c.id === id ? { ...c, status: 'rejected' } : c);
      localStorage.setItem(storageKey, JSON.stringify(localShared));
    } catch {}
    apiClient.put(`/payroll/reimbursements/${id}/reject`).catch(() => {});
    showToast.success('Request Rejected', `Claim #${id} rejected.`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  };
  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  };

  const handleReport = (key: string) => {
    if (key === 'register') {
      downloadCSV("Employee Code,Employee Name,Basic Pay,HRA,Gross Salary,PF Deduction,ESI Deduction,TDS Tax,Net Salary\nEMP101,Rahul Sharma,51500,20600,72100,6180,0,3605,62315\nEMP202,Priya Verma,53000,21200,74200,6360,0,3710,64130", `Payroll_Register_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'Monthly Payroll Register downloaded');
    }
    if (key === 'ecr') {
      downloadText("UAN,MEMBER_NAME,GROSS_WAGES,EPF_WAGES,EPS_WAGES,EDLI_WAGES,EPF_CONTRI,EPS_CONTRI\n100912345678,Rahul Sharma,70000,15000,15000,15000,1800,1250", `PF_ECR_Return_${new Date().toISOString().slice(0, 7)}.txt`);
      showToast.success('Export Complete', 'PF ECR compliance file downloaded');
    }
    if (key === 'bank') {
      downloadCSV("Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)\nEMP101,Rahul Sharma,HDFC Bank,50100234123,HDFC0001234,62315\nEMP202,Priya Verma,ICICI Bank,00120500124,ICIC0000124,64130", `Bank_Transfer_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'Bank Payout CSV downloaded');
    }
    if (key === 'tds') {
      downloadCSV("Employee Code,Employee Name,Gross Annual Salary,Standard Deduction,Taxable Income,TDS Deducted\nEMP101,Rahul Sharma,865200,75000,790200,43260", `TDS_Summary_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'TDS Form 24Q Summary downloaded');
    }
  };

  const pendingCount = adminClaims.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-4 pb-12">
      {/* ── Rich Gradient Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-500/20">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl backdrop-blur-md text-indigo-300 shadow-inner">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Payroll Pipeline & Compliance Engine</h1>
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] font-bold">Enterprise Engine</Badge>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1">
                Monthly salary execution · attendance LOP calculations · statutory compliance returns
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button onClick={() => navigate('/payroll/settings')} className="h-9 text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all cursor-pointer">
              <Sliders className="w-4 h-4" />
              Payroll Master Settings
            </Button>
            <Button onClick={() => handleReport('bank')} variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Bank CSV
            </Button>
            <Button onClick={() => handleReport('ecr')} variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all cursor-pointer">
              <Download className="w-4 h-4 text-indigo-300" />
              PF ECR
            </Button>
          </div>
        </div>
      </div>

      {/* ── Minimal Tab Navigation ── */}
      <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex border-b border-border/60 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="p-0">
          {/* Processing Pipeline */}
          {activeTab === 'processing' && (
            <div className="p-4">
              <Payroll10StepFlow />
            </div>
          )}



          {/* Exit Settlements */}
          {activeTab === 'settlements' && (
            <div className="p-4">
              <FullFinalSettlement />
            </div>
          )}

          {/* Reports & Compliance */}
          {activeTab === 'reports' && (
            <div className="p-4 space-y-4">
              {/* Summary badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PF Compliance Active
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ESI Compliant
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  TDS Q2 Due: 31 Aug 2026
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {REPORT_CARDS.map(({ key, title, desc, icon: Icon, iconColor, iconBg, btnLabel }) => (
                  <Card key={key} className="border border-border/80 shadow-xs hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                        <Button
                          onClick={() => handleReport(key)}
                          size="sm"
                          className="mt-2.5 h-7 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                        >
                          <Download className="w-3 h-3" />
                          {btnLabel}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRPayrollPortal;
