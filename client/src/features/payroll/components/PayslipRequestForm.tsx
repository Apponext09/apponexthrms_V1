import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { addPayslipRequest, getPayslipRequests, PayslipRequest } from '../utils/payslipRequestQueue';

interface PayslipRequestFormProps {
  employeeName: string;
  employeeId: number;
  role: 'Employee' | 'Manager' | 'Team Lead' | 'HR';
}

const MONTHS = [
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
];

export const PayslipRequestForm: React.FC<PayslipRequestFormProps> = ({
  employeeName,
  employeeId,
  role,
}) => {
  const [month, setMonth] = useState('2026-07');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [myRequests, setMyRequests] = useState<PayslipRequest[]>(() =>
    getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPayslipRequest({
      requestedBy: employeeName,
      requestedById: employeeId,
      role,
      month,
      reason: reason || `Payslip required for ${MONTHS.find(m => m.value === month)?.label}`,
    }, employeeId);
    setSubmitted(true);
    setReason('');
    // refresh my requests list
    setMyRequests(getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId));
    setTimeout(() => setSubmitted(false), 4000);
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">✅ Approved by Admin</Badge>;
    if (status === 'rejected') return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">❌ Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">⏳ Pending Admin Approval</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" /> Request Payslip from Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Payslip request sent to Admin successfully! You will be notified once approved.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requesting As</label>
                <div className="h-10 px-3 flex items-center border rounded-lg bg-slate-50 text-sm font-bold text-indigo-700">
                  {role} — {employeeName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Month *</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="h-10 w-full px-3 border rounded-lg text-sm bg-white font-bold"
                  required
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Needed for bank loan application, visa application, etc."
                className="h-10 w-full px-3 border rounded-lg text-sm bg-white"
              />
            </div>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Submit Request to Admin
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Past Requests */}
      {myRequests.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> My Payslip Request History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Requested On</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 text-xs">{req.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {MONTHS.find(m => m.value === req.month)?.label || req.month}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{req.reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">{statusBadge(req.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
