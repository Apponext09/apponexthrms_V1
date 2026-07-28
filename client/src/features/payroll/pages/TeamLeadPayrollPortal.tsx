import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  Search,
  Filter,
  ShieldCheck,
  Receipt,
  Lock,
  Calendar
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const TeamLeadPayrollPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'loans' | 'reimbursements' | 'attendance' | 'payslips'>('loans');
  const [loanRequests, setLoanRequests] = useState([
    {
      id: 101,
      employee_name: 'PP Manager',
      employee_code: '432',
      loan_type: 'Vehicle Loan',
      amount: 100000,
      tenure_months: 5,
      monthly_emi: 20427,
      reason: 'Vehicle procurement and transport loan',
      created_at: '2026-07-25',
      status: 'pending'
    },
    {
      id: 102,
      employee_name: 'mot sharma',
      employee_code: 'EMP202',
      loan_type: 'Salary Advance',
      amount: 30000,
      tenure_months: 3,
      monthly_emi: 10000,
      reason: 'Personal expense advance',
      created_at: '2026-07-20',
      status: 'approved'
    }
  ]);

  const [teamClaims, setTeamClaims] = useState([
    { id: 1, name: 'mot sharma', code: 'EMP202', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', desc: 'Client visit travel & conveyance reimbursement', status: 'pending' },
    { id: 2, name: 'teeam lead', code: 'EMP2002', type: 'Travel & Conveyance', amount: 4500, date: '2026-07-26', desc: 'Client visit travel & conveyance reimbursement', status: 'pending' },
    { id: 3, name: 'NN Employee', code: 'EMP702', type: 'Medical Claim', amount: 3200, date: '2026-07-18', desc: 'Health checkup & consultations', status: 'approved' }
  ]);

  const handleApprove = (id: number) => {
    setLoanRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
  };

  const handleReject = (id: number) => {
    setLoanRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );
  };

  const handleApproveClaim = (id: number) => {
    setTeamClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
  };

  const handleRejectClaim = (id: number) => {
    setTeamClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Team Lead Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Team Payroll & Approvals</h1>
          <p className="text-blue-200 text-sm mt-1">
            Review and approve loan requests, expense reimbursements, and attendance & OT locks for assigned team members.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'loans'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Loans ({loanRequests.filter(r => r.status === 'pending').length})
          </button>

          <button
            onClick={() => setActiveTab('reimbursements')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'reimbursements'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" /> Reimbursements ({teamClaims.filter(c => c.status === 'pending').length})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'attendance'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4" /> Attendance & OT Lock
          </button>

          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'payslips'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" /> Team Payslips
          </button>
        </div>
      </div>


      {activeTab === 'loans' && (
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Team Salary Advance & Loan Requests</span>
              <Badge variant="outline">{loanRequests.filter(r => r.status === 'pending').length} Pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Tenure / EMI</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loanRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        <div>{req.employee_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{req.employee_code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="capitalize">{req.loan_type}</Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-600">
                        ₹{req.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div>{req.tenure_months} Months</div>
                        <div className="text-xs text-slate-400">₹{req.monthly_emi.toLocaleString('en-IN')}/mo</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-500">{req.reason}</td>
                      <td className="px-6 py-4">
                        {req.status === 'pending' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3 mr-1" /> Pending Approval
                          </Badge>
                        )}
                        {req.status === 'approved' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Approved
                          </Badge>
                        )}
                        {req.status === 'rejected' && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                            <XCircle className="w-3 h-3 mr-1" /> Rejected
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {req.status === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => handleApprove(req.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                              Reject
                            </Button>
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

      {activeTab === 'reimbursements' && (
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Team Reimbursement Claim Approvals</span>
              <Badge variant="outline">{teamClaims.filter(c => c.status === 'pending').length} Pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-6 py-3">Team Member</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teamClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-semibold">
                        <div>{c.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.code}</div>
                      </td>
                      <td className="px-6 py-4">{c.type}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{c.desc}</td>
                      <td className="px-6 py-4">
                        {c.status === 'pending' && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                        {c.status === 'approved' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>}
                        {c.status === 'rejected' && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
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

      {activeTab === 'attendance' && (
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Monthly Attendance & LOP Lock Verification</h3>
              <p className="text-xs text-slate-500">Verify team working days, Loss of Pay (LOP) deductions, and overtime hours for current payroll run.</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>July 2026 Attendance Lock Status</span>
              <Badge className="bg-emerald-600 text-white">Verified & Locked by HR</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">All team attendance sessions have been validated. LOP calculations are locked for monthly payroll processing.</p>
          </div>
        </Card>
      )}

      {activeTab === 'payslips' && (
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Team Payslip Release Summary</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            All team monthly payslips for current cycle have been released by HR. Team members can view and download them from their self-service portal.
          </p>
        </Card>
      )}
    </div>
  );
};

export default TeamLeadPayrollPortal;
