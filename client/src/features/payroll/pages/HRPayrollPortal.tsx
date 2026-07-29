import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';
import { showToast } from '@/components/ui/toast';

type TabKey = 'processing' | 'reimbursements' | 'reports';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'processing', label: 'Processing Pipeline', icon: Zap },
  { key: 'reimbursements', label: 'Reimbursements', icon: Receipt },
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
  const [activeTab, setActiveTab] = useState<TabKey>('processing');

  const [adminClaims, setAdminClaims] = useState([
    { id: 101, empName: 'Mot Sharma', code: 'EMP202', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' },
    { id: 102, empName: 'Team Lead', code: 'EMP2002', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' },
    { id: 103, empName: 'NN Employee', code: 'EMP702', type: 'Medical Reimbursement', amount: 2800, date: '2026-07-20', status: 'pending' },
    { id: 104, empName: 'HR Employee', code: 'EMP7576', type: 'Food Allowance', amount: 1200, date: '2026-07-18', status: 'approved' },
  ]);

  const handleApproveClaim = (id: number) =>
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
  const handleRejectClaim = (id: number) =>
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));

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
      downloadCSV("Employee Code,Employee Name,Basic Pay,HRA,Gross Salary,PF Deduction,ESI Deduction,TDS Tax,Net Salary\nEMP101,Rahul Sharma,51500,20600,72100,6180,0,3605,62315\nEMP202,Priya Verma,53000,21200,74200,6360,0,3710,64130", `Payroll_Register_${new Date().toISOString().slice(0,7)}.csv`);
      showToast.success('Export Complete', 'Monthly Payroll Register downloaded');
    }
    if (key === 'ecr') {
      downloadText("UAN,MEMBER_NAME,GROSS_WAGES,EPF_WAGES,EPS_WAGES,EDLI_WAGES,EPF_CONTRI,EPS_CONTRI\n100912345678,Rahul Sharma,70000,15000,15000,15000,1800,1250", `PF_ECR_Return_${new Date().toISOString().slice(0,7)}.txt`);
      showToast.success('Export Complete', 'PF ECR compliance file downloaded');
    }
    if (key === 'bank') {
      downloadCSV("Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)\nEMP101,Rahul Sharma,HDFC Bank,50100234123,HDFC0001234,62315\nEMP202,Priya Verma,ICICI Bank,00120500124,ICIC0000124,64130", `Bank_Transfer_${new Date().toISOString().slice(0,7)}.csv`);
      showToast.success('Export Complete', 'Bank Payout CSV downloaded');
    }
    if (key === 'tds') {
      downloadCSV("Employee Code,Employee Name,Gross Annual Salary,Standard Deduction,Taxable Income,TDS Deducted\nEMP101,Rahul Sharma,865200,75000,790200,43260", `TDS_Summary_${new Date().toISOString().slice(0,7)}.csv`);
      showToast.success('Export Complete', 'TDS Form 24Q Summary downloaded');
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
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
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

          {/* Reimbursements */}
          {activeTab === 'reimbursements' && (
            <div className="p-4 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Claims', val: adminClaims.length, color: 'text-foreground', bg: 'bg-muted/30' },
                  { label: 'Pending', val: adminClaims.filter(c => c.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                  { label: 'Approved', val: adminClaims.filter(c => c.status === 'approved').length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                ].map(({ label, val, color, bg }) => (
                  <div key={label} className={`${bg} rounded-lg p-3 border border-border/60`}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-black ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    Reimbursement Claim Approvals
                  </CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                    {adminClaims.length} Claims
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                        <tr>
                          <th className="px-4 py-2.5">Employee</th>
                          <th className="px-4 py-2.5">Claim Type</th>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {adminClaims.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground text-xs">{c.empName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{c.code}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground">{c.type}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.date}</td>
                            <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3">
                              {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>}
                              {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Approved</Badge>}
                              {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Rejected</Badge>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button size="sm" onClick={() => handleApproveClaim(c.id)} className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5">Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleRejectClaim(c.id)} className="h-6 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 px-2.5">Reject</Button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Processed</span>
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
