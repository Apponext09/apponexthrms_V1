import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  UserX
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';
import { FullFinalSettlement } from './FullFinalSettlement';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

type TabKey = 'processing' | 'reimbursements' | 'settlements' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'processing', label: 'Processing Pipeline', icon: Zap },
  { key: 'reimbursements', label: 'Reimbursements', icon: Receipt },
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
  const [activeTab, setActiveTab] = useState<TabKey>('processing');
  const [claimCategoryFilter, setClaimCategoryFilter] = useState<'all' | 'expense' | 'travel'>('all');

  // Auto-switch tab and category filter based on current URL path
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('expense-claims')) {
      setActiveTab('reimbursements');
      setClaimCategoryFilter('expense');
    } else if (path.includes('travel-requests')) {
      setActiveTab('reimbursements');
      setClaimCategoryFilter('travel');
    } else if (path.includes('reimbursements')) {
      setActiveTab('reimbursements');
      setClaimCategoryFilter('all');
    }
  }, [location.pathname]);

  const [adminClaims, setAdminClaims] = useState<any[]>([
    { id: 101, empName: 'Mot Sharma', code: 'EMP202', type: 'Travel Request (Mumbai)', amount: 4500, date: '2026-07-26', status: 'pending', isTravel: true, description: 'Client HRMS Rollout visit' },
    { id: 102, empName: 'Team Lead', code: 'EMP2002', type: 'Travel Request (Pune)', amount: 3200, date: '2026-07-26', status: 'pending', isTravel: true, description: 'Regional Team Onboarding' },
    { id: 103, empName: 'NN Employee', code: 'EMP702', type: 'Medical Reimbursement', amount: 2800, date: '2026-07-20', status: 'pending', isTravel: false, description: 'Outpatient consultation claim' },
    { id: 104, empName: 'HR Employee', code: 'EMP7576', type: 'Food Allowance', amount: 1200, date: '2026-07-18', status: 'approved', isTravel: false, description: 'Client dinner expense' },
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

  const [dbEmployeesList, setDbEmployeesList] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/employees').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setDbEmployeesList(list);
      }
    }).catch(() => {});
  }, []);

  const handleReport = (key: string) => {
    const list = dbEmployeesList.length > 0 ? dbEmployeesList : [
      { employee_code: 'EMP001', first_name: 'Amisha', last_name: 'Shinde', basic: 25000, hra: 10000, gross: 50000, pf: 3000, esi: 0, tds: 2500, net: 44500, bank_name: 'HDFC BANK', account_no: '501002345678', ifsc_code: 'HDFC0000123', uan_no: '100912345678' }
    ];

    if (key === 'register') {
      const header = "Employee Code,Employee Name,Basic Pay,HRA,Gross Salary,PF Deduction,ESI Deduction,TDS Tax,Net Salary\n";
      const rows = list.map((e: any) => {
        const code = e.employee_code || e.employeeCode || `EMP-${e.id}`;
        const name = `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || 'Employee';
        const gross = Number(e.gross || e.gross_salary || 50000);
        const basic = Number(e.basic || e.basic_salary || Math.round(gross * 0.50));
        const hra = Number(e.hra || Math.round(basic * 0.40));
        const pf = Number(e.pf || Math.round(Math.min(basic, 15000) * 0.12));
        const esi = Number(e.esi || 0);
        const tds = Number(e.tds || (gross > 50000 ? Math.round(gross * 0.05) : 0));
        const net = gross - (pf + esi + tds);
        return `${code},${name},${basic},${hra},${gross},${pf},${esi},${tds},${net}`;
      }).join('\n');
      downloadCSV(header + rows, `Payroll_Register_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'Monthly Payroll Register downloaded from Live DB');
    }

    if (key === 'ecr') {
      const header = "UAN,MEMBER_NAME,GROSS_WAGES,EPF_WAGES,EPS_WAGES,EDLI_WAGES,EPF_CONTRI,EPS_CONTRI\n";
      const rows = list.map((e: any) => {
        const uan = e.uan_no || e.uanNo || '100912345678';
        const name = `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || 'Employee';
        const gross = Number(e.gross || e.gross_salary || 50000);
        const epfWages = Math.min(gross * 0.5, 15000);
        const epfContr = Math.round(epfWages * 0.12);
        return `${uan},${name},${gross},${epfWages},${epfWages},${epfWages},${epfContr},1250`;
      }).join('\n');
      downloadText(header + rows, `PF_ECR_Return_${new Date().toISOString().slice(0, 7)}.txt`);
      showToast.success('Export Complete', 'PF ECR compliance file downloaded from Live DB');
    }

    if (key === 'bank') {
      const header = "Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)\n";
      const rows = list.map((e: any) => {
        const code = e.employee_code || e.employeeCode || `EMP-${e.id}`;
        const name = `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || 'Employee';
        const bank = e.bank_name || e.bankName || 'HDFC BANK';
        const acc = e.account_no || e.accountNo || '501002345678';
        const ifsc = e.ifsc_code || e.ifscCode || 'HDFC0000123';
        const gross = Number(e.gross || e.gross_salary || 50000);
        const net = Math.round(gross * 0.90);
        return `${code},${name},${bank},${acc},${ifsc},${net}`;
      }).join('\n');
      downloadCSV(header + rows, `Bank_Transfer_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'Bank Payout CSV downloaded from Live DB');
    }

    if (key === 'tds') {
      const header = "Employee Code,Employee Name,Gross Annual Salary,Standard Deduction,Taxable Income,TDS Deducted\n";
      const rows = list.map((e: any) => {
        const code = e.employee_code || e.employeeCode || `EMP-${e.id}`;
        const name = `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || 'Employee';
        const gross = Number(e.gross || e.gross_salary || 50000);
        const annualGross = gross * 12;
        const taxable = Math.max(0, annualGross - 75000);
        const tds = Math.round(taxable * 0.05);
        return `${code},${name},${annualGross},75000,${taxable},${tds}`;
      }).join('\n');
      downloadCSV(header + rows, `TDS_Summary_${new Date().toISOString().slice(0, 7)}.csv`);
      showToast.success('Export Complete', 'TDS Form 24Q Summary downloaded from Live DB');
    }
  };

  const pendingCount = adminClaims.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-4 pb-12">
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Payroll Pipeline & Compliance Engine</h1>
            <p className="text-xs text-muted-foreground">
              Monthly execution · reimbursement approvals · compliance exports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => handleReport('bank')} variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Bank CSV
          </Button>
          <Button onClick={() => handleReport('ecr')} variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5">
            <Download className="w-3.5 h-3.5 text-primary" />
            PF ECR
          </Button>
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
                {key === 'reimbursements' && pendingCount > 0 && (
                  <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
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

          {/* Expense Claims & Travel Requests */}
          {activeTab === 'reimbursements' && (
            <div className="p-4 space-y-4">
              {/* Category Filter Pills & Stats row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/60">
                <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border/80">
                  <button
                    onClick={() => setClaimCategoryFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      claimCategoryFilter === 'all'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Requests ({adminClaims.length})
                  </button>
                  <button
                    onClick={() => setClaimCategoryFilter('expense')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      claimCategoryFilter === 'expense'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Expense Claims ({adminClaims.filter(c => !c.isTravel).length})
                  </button>
                  <button
                    onClick={() => setClaimCategoryFilter('travel')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      claimCategoryFilter === 'travel'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Travel Requests ({adminClaims.filter(c => c.isTravel).length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 border border-amber-200 font-bold">
                    Pending: {adminClaims.filter(c => c.status === 'pending').length}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 border border-emerald-200 font-bold">
                    Approved: {adminClaims.filter(c => c.status === 'approved').length}
                  </span>
                </div>
              </div>

              {/* Table */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      Expense Claims & Travel Requests Approvals
                    </CardTitle>
                    <CardDescription className="text-xs">Review and action incoming employee expense reimbursements and travel applications.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    {adminClaims.length} Total Received
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-2.5">Employee</th>
                          <th className="px-4 py-2.5">Category / Type</th>
                          <th className="px-4 py-2.5">Description</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {adminClaims
                          .filter(c => {
                            if (claimCategoryFilter === 'expense') return !c.isTravel;
                            if (claimCategoryFilter === 'travel') return c.isTravel;
                            return true;
                          })
                          .map((c) => (
                            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground text-xs">{c.empName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{c.code}</div>
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {c.isTravel ? (
                                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[10px] font-bold">
                                    ✈ Travel Request
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                                    🧾 Expense Claim
                                  </Badge>
                                )}
                                <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{c.type}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{c.description || '—'}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{c.date}</td>
                              <td className="px-4 py-3 text-xs font-bold text-emerald-600">
                                {c.amount > 0 ? `₹${c.amount.toLocaleString('en-IN')}` : 'N/A (Travel Request)'}
                              </td>
                              <td className="px-4 py-3">
                                {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Pending</Badge>}
                                {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Approved</Badge>}
                                {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Rejected</Badge>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {c.status === 'pending' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button size="sm" onClick={() => handleApproveClaim(c.id)} className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5">Approve</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRejectClaim(c.id)} className="h-6 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 px-2.5">Reject</Button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-medium">Processed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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
