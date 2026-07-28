import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  CreditCard,
  Download,
  CheckCircle,
  Clock,
  Send,
  HelpCircle,
  Plus,
  DollarSign,
  TrendingUp,
  Percent,
  Building,
  Calendar,
  AlertCircle,
  Receipt
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayslipViewer } from './PayslipViewer';
import { TaxDeclaration } from './TaxDeclaration';
import { EmployeeLoanRequest } from '../components/EmployeeLoanRequest';

export const EmployeePayrollPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'payslips' | 'tax' | 'loans' | 'reimbursements'>('payslips');

  useEffect(() => {
    if (urlTab === 'loans' || urlTab === 'reimbursements' || urlTab === 'payslips' || urlTab === 'tax') {
      setActiveTab(urlTab);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" /> Employee Self-Service Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Payroll & Financial Portal</h1>
          <p className="text-indigo-200 text-sm mt-1">
            View monthly payslips, submit tax declarations, request salary advances/loans, and claim expense reimbursements.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10 self-stretch md:self-auto justify-around flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'payslips'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" /> My Payslips
          </button>



          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'loans'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Advances & Loans
          </button>

          <button
            onClick={() => setActiveTab('reimbursements')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'reimbursements'
                ? 'bg-white text-indigo-900 shadow-md'
                : 'text-indigo-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" /> Reimbursements
          </button>
        </div>
      </div>

      {/* Main Content Areas based on selected tab */}
      {activeTab === 'payslips' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
          <PayslipViewer />
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
          <EmployeeLoanRequest />
        </div>
      )}

      {activeTab === 'reimbursements' && (
        <div className="space-y-6">
          {submittedMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Reimbursement claim submitted successfully!
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Claim Form */}
            <Card className="shadow border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" /> Submit Reimbursement Claim
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <form onSubmit={handleSubmitClaim} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Claim Type</label>
                    <select
                      value={newClaim.type}
                      onChange={(e) => setNewClaim({ ...newClaim, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="Travel & Conveyance">Travel & Conveyance</option>
                      <option value="Medical Claim">Medical Claim</option>
                      <option value="Fuel Expense">Fuel Expense</option>
                      <option value="Telephone & Internet">Telephone & Internet</option>
                      <option value="Office Supplies">Office Supplies</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2500"
                      value={newClaim.amount}
                      onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Description / Purpose</label>
                    <textarea
                      placeholder="Reason for expense..."
                      value={newClaim.desc}
                      onChange={(e) => setNewClaim({ ...newClaim, desc: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm h-20"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Submit Claim
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Claim History List */}
            <Card className="lg:col-span-2 shadow border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>My Claim History</span>
                  <Badge variant="outline">{claims.length} Claims</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {claims.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold">{c.type}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{c.date}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">₹{c.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{c.desc}</td>
                          <td className="px-4 py-3">
                            {c.status === 'pending' ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
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
  );
};

export default EmployeePayrollPortal;
