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

import { apiClient } from '@/config/api';
import { showToast } from '@/components/ui/toast';

export const EmployeePayrollPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'payslips' | 'loans' | 'reimbursements' | 'settlement'>('payslips');

  useEffect(() => {
    if (urlTab === 'loans' || urlTab === 'reimbursements' || urlTab === 'payslips' || urlTab === 'settlement') {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  const [claims, setClaims] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [newClaim, setNewClaim] = useState({ type: 'Travel & Conveyance', amount: '', desc: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState(false);

  // Load claims from DB on mount
  const fetchClaims = () => {
    setClaimsLoading(true);
    apiClient.get('/payroll/reimbursements').then((res: any) => {
      const list = res?.data?.data || res?.data || [];
      setClaims(Array.isArray(list) ? list.map((c: any) => ({
        id: c.id || c.uuid,
        type: c.claim_type || c.type || 'Expense Claim',
        date: c.claim_date || c.date || c.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        amount: Number(c.amount || 0),
        status: (c.status || 'pending').toLowerCase(),
        desc: c.description || c.desc || '',
      })) : []);
    }).catch(() => setClaims([])).finally(() => setClaimsLoading(false));
  };

  useEffect(() => { fetchClaims(); }, []);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.amount) return;
    setSubmitting(true);
    try {
      await apiClient.post('/payroll/reimbursements', {
        claim_type: newClaim.type,
        amount: parseFloat(newClaim.amount),
        description: newClaim.desc,
        claim_date: new Date().toISOString().slice(0, 10),
      });
      setNewClaim({ type: 'Travel & Conveyance', amount: '', desc: '' });
      setSubmittedMsg(true);
      setTimeout(() => setSubmittedMsg(false), 4000);
      showToast.success('Claim Submitted ✅', 'Your reimbursement claim has been saved.');
      fetchClaims(); // Refresh from DB
    } catch (err: any) {
      showToast.error('Submit Failed', err?.response?.data?.message || err?.message || 'Could not submit claim');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 pb-12">
      {/* Top Glassmorphic Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/90 backdrop-blur-md border border-border/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">Employee Self-Service Financial Portal</h1>
              <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold">My Financials</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              View monthly payslips, request salary advances/loans, and claim expense reimbursements
            </p>
          </div>
        </div>
      </div>

      {/* Modern Pill Tab Navigation Bar */}
      <div className="bg-card/80 backdrop-blur-md border border-border/70 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { key: 'payslips', label: 'My Payslips', icon: FileText },
            { key: 'loans', label: 'Advances & Loans', icon: CreditCard },
            { key: 'reimbursements', label: 'Reimbursements', icon: Receipt },
            { key: 'settlement', label: 'My Exit Settlement', icon: UserX },
          ].map(({ key, label, icon: Icon }) => (
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
            </button>
          ))}
        </div>
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

                      <Button type="submit" disabled={submitting} className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5">
                        <Send className="w-3.5 h-3.5" /> {submitting ? 'Submitting...' : 'Submit Claim'}
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
                          {claimsLoading ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading your claims from database...</td></tr>
                          ) : claims.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">No claims submitted yet. Submit your first claim using the form.</td></tr>
                          ) : (
                          claims.map((c) => (
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
                          ))
                          )}
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
  );
};

export default EmployeePayrollPortal;
