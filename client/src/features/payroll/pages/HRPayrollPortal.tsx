import React, { useState } from 'react';
import {
  Zap,
  DollarSign,
  FileSpreadsheet,
  FileCheck,
  Building,
  CheckCircle,
  Clock,
  Send,
  Lock,
  Download,
  FileText,
  UserCheck,
  ShieldCheck,
  UserX,
  Plus,
  Sliders,
  Receipt,
  Layers,
  Printer,
  PieChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayrollProcessing } from './PayrollProcessing';
import { SalaryStructureManagement } from './SalaryStructureManagement';
import { FullFinalSettlement } from './FullFinalSettlement';
import { LoanManagement } from './LoanManagement';
import { Payroll10StepFlow } from '../components/Payroll10StepFlow';

export const HRPayrollPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'structures' | 'processing' | 'reimbursements' | 'loans' | 'settlements' | 'reports'>('structures');

  // 6-Phase Pipeline State
  const [pipelinePhase, setPipelinePhase] = useState<number>(1);
  const [attendanceLocked, setAttendanceLocked] = useState<boolean>(true);
  const [payrollCalculated, setPayrollCalculated] = useState<boolean>(true);
  const [payrollApproved, setPayrollApproved] = useState<boolean>(true);

  // Reimbursements Admin State
  const [adminClaims, setAdminClaims] = useState([
    { id: 101, empName: 'mot sharma', code: 'EMP202', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' },
    { id: 102, empName: 'teeam lead', code: 'EMP2002', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' },
    { id: 103, empName: 'NN Employee', code: 'EMP702', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' },
    { id: 104, empName: 'Hrrr Employee', code: 'EMP7576', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', status: 'pending' }
  ]);

  const handleApproveClaim = (id: number) => {
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
  };

  const handleRejectClaim = (id: number) => {
    setAdminClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
  };

  const handleExportBankCSV = () => {
    const csvContent = "Employee Code,Employee Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)\nEMP101,got sharma,HDFC Bank,50100234123,HDFC0001234,63500\nEMP202,mot sharma,ICICI Bank,00120500124,ICIC0000124,65000\nEMP206,tee gfdsa,Axis Bank,91201002312,UTIB0000123,66500\nEMP2002,teeam lead,State Bank,30219401923,SBIN0000456,68000";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank_transfer_payout_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
  };

  const handleExportStatutoryECR = () => {
    const txtContent = "UAN,MEMBER_NAME,GROSS_WAGES,EPF_WAGES,EPS_WAGES,EDLI_WAGES,EPF_CONTRI,EPS_CONTRI\n100912345678,got sharma,70000,15000,15000,15000,1800,1250\n100912345679,mot sharma,72000,15000,15000,15000,1800,1250";
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PF_ECR_Return_${new Date().toISOString().slice(0, 7)}.txt`;
    a.click();
  };

  const handleExportPayrollRegister = () => {
    const csvContent = "Employee Code,Employee Name,Basic Pay,HRA,Gross Salary,PF Deduction,ESI Deduction,TDS Tax,Net Salary\nEMP101,got sharma,51500,20600,72100,6180,0,3605,62315\nEMP202,mot sharma,53000,21200,74200,6360,0,3710,64130";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Register_July_2026.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" /> Enterprise HR Payroll Suite
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Payroll Pipeline & Compliance Engine</h1>
          <p className="text-slate-300 text-sm mt-1">
            6-phase monthly execution wizard, formula component builder, reimbursement claim approvals, and compliance exports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExportBankCSV} variant="secondary" size="sm" className="flex items-center gap-1.5 shadow-md">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Bank CSV
          </Button>
          <Button onClick={handleExportStatutoryECR} variant="secondary" size="sm" className="flex items-center gap-1.5 shadow-md">
            <Download className="w-4 h-4 text-indigo-600" /> Export PF ECR
          </Button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('structures')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'structures'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Salary Structure Configurator
        </button>
        <button
          onClick={() => setActiveTab('processing')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'processing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Payroll Processing Pipeline
        </button>
        <button
          onClick={() => setActiveTab('reimbursements')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'reimbursements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reimbursements Admin ({adminClaims.filter(c => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'loans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Loans &amp; Advances Approvals
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settlements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Full &amp; Final Settlements
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reports &amp; Compliance Hub
        </button>
      </div>

      {/* Tab 1: Salary Structure Feature */}
      {activeTab === 'structures' && (
        <div>
          <SalaryStructureManagement />
        </div>
      )}

      {/* Tab 2: Payroll Processing Pipeline */}
      {activeTab === 'processing' && (
        <div>
          <Payroll10StepFlow />
        </div>
      )}

      {/* Tab 3: Reimbursements Admin */}
      {activeTab === 'reimbursements' && (
        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" /> Employee Reimbursement Claim Approvals
            </CardTitle>
            <Badge variant="outline">{adminClaims.length} Claims Total</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold">
                        <div>{c.empName}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.code}</div>
                      </td>
                      <td className="px-6 py-3">{c.type}</td>
                      <td className="px-6 py-3 text-xs text-slate-500">{c.date}</td>
                      <td className="px-6 py-3 font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3">
                        {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                        {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>}
                        {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>}
                      </td>
                      <td className="px-6 py-3 text-right space-x-2">
                        {c.status === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => handleApproveClaim(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectClaim(c.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50">Reject</Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: F&F Settlements */}
      {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
          <FullFinalSettlement />
        </div>
      )}

      {/* Tab 5: Reports & Compliance Hub */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Monthly Payroll Register
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">Comprehensive employee-wise earnings, statutory deductions, and net payouts for current month.</p>
              <Button onClick={handleExportPayrollRegister} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download Register (CSV)
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" /> PF ECR Compliance Return
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">Government Portal formatted Provident Fund ECR text return file for electronic filing.</p>
              <Button onClick={handleExportStatutoryECR} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Export PF ECR Text File
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Bank Payout NEFT / RTGS File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">Bank format CSV file containing employee bank account numbers, IFSC, and net salary amounts.</p>
              <Button onClick={handleExportBankCSV} className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Export Bank Payout CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Loans & Advances Approvals */}
      {activeTab === 'loans' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
          <LoanManagement />
        </div>
      )}
    </div>
  );
};

export default HRPayrollPortal;
