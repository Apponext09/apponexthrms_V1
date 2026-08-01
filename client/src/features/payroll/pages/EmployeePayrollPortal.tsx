import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  CheckCircle,
  Plus,
  Send,
  Building,
  Receipt,
  UserX
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayslipViewer } from './PayslipViewer';
import { EmployeeLoanRequest } from '../components/EmployeeLoanRequest';
import { MySettlementPage } from './MySettlementPage';

export const EmployeePayrollPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'payslips' | 'loans' | 'reimbursements' | 'settlement'>('payslips');

  useEffect(() => {
    if (urlTab === 'loans' || urlTab === 'reimbursements' || urlTab === 'payslips' || urlTab === 'settlement') {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  const [claims, setClaims] = useState([
    { id: 1, type: 'Travel & Conveyance', date: '2026-07-20', amount: 4500, status: 'pending', desc: 'Client visit travel expenses' },
    { id: 2, type: 'Medical Claim', date: '2026-07-10', amount: 3200, status: 'approved', desc: 'Health checkup consultation' }
  ]);
  const [newClaim, setNewClaim] = useState({ type: 'Travel & Conveyance', amount: '', desc: '' });
  const [submittedMsg, setSubmittedMsg] = useState(false);

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.amount) return;
    setClaims([
      { id: Date.now(), type: newClaim.type, date: new Date().toISOString().slice(0, 10), amount: parseFloat(newClaim.amount), status: 'pending', desc: newClaim.desc },
      ...claims
    ]);
    setNewClaim({ type: 'Travel & Conveyance', amount: '', desc: '' });
    setSubmittedMsg(true);
    setTimeout(() => setSubmittedMsg(false), 4000);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Employee Self-Service Financial Portal</h1>
            <p className="text-xs text-muted-foreground">
              View monthly payslips, request salary advances/loans, and claim expense reimbursements
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Tab Navigation Bar */}
      <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex border-b border-border/60 overflow-x-auto">
          {[
            { key: 'payslips', label: 'My Payslips', icon: FileText },
            { key: 'loans', label: 'Advances & Loans', icon: CreditCard },
            { key: 'reimbursements', label: 'Reimbursements', icon: Receipt },
            { key: 'settlement', label: 'My Exit Settlement', icon: UserX },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${activeTab === key ? 'text-primary' : 'text-muted-foreground'}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-4">
          {activeTab === 'settlement' && (
            <MySettlementPage />
          )}

          {activeTab === 'payslips' && (
            <PayslipViewer />
          )}

          {activeTab === 'loans' && (
            <EmployeeLoanRequest />
          )}

          {activeTab === 'reimbursements' && (
            <div className="space-y-4">
              {submittedMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg flex items-center gap-2 text-xs font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Reimbursement claim submitted successfully!
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Claim Form */}
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="border-b border-border/60 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" /> Submit Reimbursement Claim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleSubmitClaim} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Claim Type</label>
                        <select
                          value={newClaim.type}
                          onChange={(e) => setNewClaim({ ...newClaim, type: e.target.value })}
                          className="w-full px-3 h-8 border border-border rounded-lg text-xs bg-background font-medium text-foreground cursor-pointer"
                        >
                          <option value="Travel & Conveyance">Travel & Conveyance</option>
                          <option value="Medical Claim">Medical Claim</option>
                          <option value="Fuel Expense">Fuel Expense</option>
                          <option value="Telephone & Internet">Telephone & Internet</option>
                          <option value="Office Supplies">Office Supplies</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2500"
                          value={newClaim.amount}
                          onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                          className="w-full px-3 h-8 border border-border rounded-lg text-xs bg-background font-medium text-foreground"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Description / Purpose</label>
                        <textarea
                          placeholder="Reason for expense..."
                          value={newClaim.desc}
                          onChange={(e) => setNewClaim({ ...newClaim, desc: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background font-medium text-foreground h-16 resize-none"
                        />
                      </div>

                      <Button type="submit" className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Submit Claim
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Claim History List */}
                <Card className="lg:col-span-2 border border-border/80 shadow-xs">
                  <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">My Claim History</CardTitle>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                      {claims.length} Claims
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                          <tr>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Amount</th>
                            <th className="px-4 py-2.5">Description</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {claims.map((c) => (
                            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-semibold text-xs text-foreground">{c.type}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{c.date}</td>
                              <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{c.desc}</td>
                              <td className="px-4 py-3">
                                {c.status === 'pending' ? (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Approved</Badge>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePayrollPortal;
