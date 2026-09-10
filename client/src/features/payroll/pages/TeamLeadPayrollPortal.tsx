import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  IndianRupee,
  Lock,
  UserX,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamSettlementsPage } from './TeamSettlementsPage';

export const TeamLeadPayrollPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'loans' | 'attendance' | 'settlements' | 'payslips'>('loans');
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
      employee_name: 'Mot Sharma',
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

  const pendingLoans = loanRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Glassmorphic Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/90 backdrop-blur-md border border-border/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">Team Payroll & Approvals</h1>
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 text-[10px] font-bold">Team Lead</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and approve loan requests and attendance locks for assigned team members
            </p>
          </div>
        </div>
      </div>

      {/* Modern Pill Tab Navigation Bar */}
      <div className="bg-card/80 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'loans', label: 'Loans', badgeCount: pendingLoans, icon: IndianRupee },
            { key: 'attendance', label: 'Attendance & OT Lock', badgeCount: 0, icon: Lock },
            { key: 'settlements', label: 'Team Exit Clearances', badgeCount: 0, icon: UserX },
            { key: 'payslips', label: 'Team Payslips', badgeCount: 0, icon: FileText },
          ].map(({ key, label, badgeCount, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badgeCount > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {badgeCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-0">
          {activeTab === 'settlements' && (
            <TeamSettlementsPage isTeamLead={true} />
          )}

          {activeTab === 'loans' && (
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">Team Salary Advance & Loan Requests</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  {pendingLoans} Pending
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2.5">Employee</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5">Amount</th>
                        <th className="px-4 py-2.5">Tenure / EMI</th>
                        <th className="px-4 py-2.5">Reason</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {loanRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-xs text-foreground">
                            <div>{req.employee_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{req.employee_code}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            <Badge variant="secondary" className="text-[10px] capitalize">{req.loan_type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-emerald-600">
                            ₹{req.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            <div>{req.tenure_months} Months</div>
                            <div className="text-[10px] text-muted-foreground">₹{req.monthly_emi.toLocaleString('en-IN')}/mo</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{req.reason}</td>
                          <td className="px-4 py-3">
                            {req.status === 'pending' && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                            {req.status === 'approved' && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                <CheckCircle className="w-3 h-3 mr-1" /> Approved
                              </Badge>
                            )}
                            {req.status === 'rejected' && (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                <XCircle className="w-3 h-3 mr-1" /> Rejected
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" onClick={() => handleApprove(req.id)} className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5">
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} className="h-6 text-[10px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 px-2.5">
                                  Reject
                                </Button>
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
          )}

          {activeTab === 'attendance' && (
            <Card className="border border-border/80 shadow-xs p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Team Monthly Attendance & LOP Lock Verification</h3>
                  <p className="text-[10px] text-muted-foreground">Verify team working days, Loss of Pay (LOP) deductions, and overtime hours for current payroll run.</p>
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-foreground">July 2026 Attendance Lock Status</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Verified & Locked by HR</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">All team attendance sessions have been validated. LOP calculations are locked for monthly payroll processing.</p>
              </div>
            </Card>
          )}

          {activeTab === 'payslips' && (
            <Card className="border border-border/80 shadow-xs p-8 text-center">
              <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Team Payslip Release Summary</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                All team monthly payslips for current cycle have been released by HR. Team members can view and download them from their self-service portal.
              </p>
            </Card>
          )}
        </div>
    </div>
  );
};

export default TeamLeadPayrollPortal;
