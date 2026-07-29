import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Send, Clock, CheckCircle, XCircle, Download,
  Printer, Bell, ChevronRight, Users, ShieldCheck, Sparkles
} from 'lucide-react';
import {
  addPayslipRequest,
  getPayslipRequests,
  updatePayslipRequestStatus,
  PayslipRequest
} from '../utils/payslipRequestQueue';
import { useAuthStore } from '@/features/auth/store/authStore';

// ── Month options ─────────────────────────────────────────────────────────────
const MONTHS = [
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
];

const MONTHS_MAP: Record<string, string> = Object.fromEntries(MONTHS.map(m => [m.value, m.label]));

function computePayslip(empId: number, month: string, empName?: string, empCode?: string, basic?: number) {
  const name = empName || `Employee #${empId}`;
  const code = empCode || `EMP-${empId}`;
  const basicAmt = basic || 0;
  const hra   = Math.round(basicAmt * 0.40);
  const sa    = Math.round(basicAmt * 0.25);
  const gross = basicAmt + hra + sa;
  const pf    = Math.round(Math.min(basicAmt, 15000) * 0.12);
  const esi   = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const tds   = Math.round(gross * 0.05);
  const totalDed = pf + esi + tds;
  const net   = Math.max(0, gross - totalDed);
  const emp   = { name, code };
  const psNum = `PS-${month.replace('-', '')}-${empId}`;
  return { emp, basic: basicAmt, hra, sa, gross, pf, esi, tds, totalDed, net, psNum, month };
}

function openPDFWindow(req: PayslipRequest) {
  const p = computePayslip(req.requestedById, req.month);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>Payslip - ${p.psNum}</title><style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
      h2 { color: #1e3a8a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
      .val { font-weight: bold; font-size: 15px; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #1e3a8a; color: white; padding: 10px; text-align: left; font-size: 13px; }
      td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
      .earn { color: #15803d; font-weight: bold; }
      .ded  { color: #b91c1c; font-weight: bold; }
      .net-box { background: #eff6ff; border: 2px solid #bfdbfe; padding: 20px; border-radius: 8px; text-align: center; margin-top: 24px; }
      .net-label { font-size: 14px; color: #1d4ed8; font-weight: bold; }
      .net-amount { font-size: 36px; font-weight: 900; color: #1d4ed8; margin-top: 4px; }
      .stamp { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: right; }
    </style></head><body>
      <h2>SALARY PAYSLIP — ${MONTHS_MAP[p.month] || p.month}</h2>
      <div class="grid">
        <div><div class="label">Employee Name</div><div class="val">${p.emp.name}</div></div>
        <div><div class="label">Employee Code</div><div class="val">${p.emp.code}</div></div>
        <div><div class="label">Payslip Number</div><div class="val">${p.psNum}</div></div>
        <div><div class="label">Salary Month</div><div class="val">${MONTHS_MAP[p.month] || p.month}</div></div>
      </div>
      <table>
        <tr><th>Earnings</th><th>Amount (₹)</th><th>Deductions</th><th>Amount (₹)</th></tr>
        <tr><td>Basic Pay</td><td class="earn">${p.basic.toLocaleString('en-IN')}</td><td>PF (Employee 12%)</td><td class="ded">${p.pf.toLocaleString('en-IN')}</td></tr>
        <tr><td>House Rent Allowance</td><td class="earn">${p.hra.toLocaleString('en-IN')}</td><td>ESI (Employee 0.75%)</td><td class="ded">${p.esi.toLocaleString('en-IN')}</td></tr>
        <tr><td>Special Allowance</td><td class="earn">${p.sa.toLocaleString('en-IN')}</td><td>Income Tax (TDS)</td><td class="ded">${p.tds.toLocaleString('en-IN')}</td></tr>
        <tr><td><strong>Gross Earnings</strong></td><td class="earn"><strong>${p.gross.toLocaleString('en-IN')}</strong></td><td><strong>Total Deductions</strong></td><td class="ded"><strong>${p.totalDed.toLocaleString('en-IN')}</strong></td></tr>
      </table>
      <div class="net-box">
        <div class="net-label">NET TAKE-HOME PAY</div>
        <div class="net-amount">₹${p.net.toLocaleString('en-IN')}</div>
      </div>
      <div class="stamp">Generated by ApponextHRMS &bull; Admin Approved &bull; ${new Date().toLocaleDateString('en-IN')}</div>
      <script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);}<\/script>
    </body></html>
  `);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUESTER PANEL (Employee / Manager / Team Lead / HR)
// ─────────────────────────────────────────────────────────────────────────────
interface RequesterPanelProps {
  employeeName: string;
  employeeId: number;
  role: 'Employee' | 'Manager' | 'Team Lead' | 'HR';
}

export const PayslipRequesterPanel: React.FC<RequesterPanelProps> = ({ employeeName, employeeId, role }) => {
  const [month, setMonth] = useState('2026-07');
  const [reason, setReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [myRequests, setMyRequests] = useState<PayslipRequest[]>(() =>
    getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId)
  );

  const roleIcon = role === 'Manager' ? '👔' : role === 'Team Lead' ? '👥' : role === 'HR' ? '💼' : '👤';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPayslipRequest({
      requestedBy: employeeName,
      requestedById: employeeId,
      role,
      month,
      reason: reason || `Payslip needed for ${MONTHS_MAP[month]}`,
    }, employeeId);
    setSuccessMsg(`✅ Request submitted to Admin! You will be notified once approved.`);
    setReason('');
    setMyRequests(getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const statusBadge = (req: PayslipRequest) => {
    if (req.status === 'approved') return (
      <div className="flex items-center gap-2">
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">✅ Approved by Admin</Badge>
        <Button size="sm" className="h-7 text-xs bg-indigo-600 text-white font-bold flex items-center gap-1"
          onClick={() => openPDFWindow(req)}>
          <Download className="w-3 h-3" /> Download PDF
        </Button>
      </div>
    );
    if (req.status === 'rejected') return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">❌ Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">⏳ Pending Admin</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Flow Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <FileText className="w-4 h-4" /> Payslip Request Flow
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-indigo-700/50 rounded-lg px-3 py-1.5 font-bold">{roleIcon} You Apply</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-slate-700/50 rounded-lg px-3 py-1.5 font-bold">👑 Admin Reviews</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-slate-700/50 rounded-lg px-3 py-1.5 font-bold">⚙️ Admin Generates Payslip</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-emerald-700/50 rounded-lg px-3 py-1.5 font-bold">📥 You Download PDF</span>
        </div>
      </div>

      {/* Request Form */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" /> Apply for Payslip
          </CardTitle>
          <CardDescription>Submit a request to Admin to generate your official payslip for a specific month</CardDescription>
        </CardHeader>
        <CardContent>
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {successMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Requesting As</label>
                <div className="h-10 px-3 flex items-center border rounded-lg bg-slate-50 dark:bg-slate-900 text-sm font-bold text-indigo-700">
                  {roleIcon} {role} — {employeeName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payslip Month *</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="h-10 w-full px-3 border rounded-lg text-sm bg-white dark:bg-slate-900 font-bold"
                  required
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Purpose / Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Bank loan application, Visa application, Personal record..."
                className="h-10 w-full px-3 border rounded-lg text-sm bg-white dark:bg-slate-900"
              />
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2">
              <Send className="w-4 h-4" /> Submit Request to Admin
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Request History */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> My Request History
            </CardTitle>
            <Button size="sm" variant="ghost" className="text-xs text-indigo-600 font-bold"
              onClick={() => setMyRequests(getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId))}>
              🔄 Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-medium text-sm">
              No requests submitted yet. Use the form above to apply.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Submitted On</th>
                    <th className="px-4 py-3 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 text-xs">{req.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{MONTHS_MAP[req.month] || req.month}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{req.reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">{statusBadge(req)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN APPROVAL PANEL
// ─────────────────────────────────────────────────────────────────────────────
export const PayslipAdminApprovalPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const adminId = user?.id || user?.email;
  // Admin sees requests submitted to their org — read from the requester's scoped keys is not
  // feasible without knowing all employee IDs, so we use a shared org-admin key for the queue.
  // Requesters write to their own key AND the admin-shared key so admins can see pending requests.
  const [requests, setRequests] = useState<PayslipRequest[]>(() => getPayslipRequests(adminId));
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [successMsg, setSuccessMsg] = useState('');

  const refresh = () => setRequests(getPayslipRequests(adminId));

  const filtered = requests.filter(r => activeFilter === 'all' ? true : r.status === activeFilter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (id: string) => {
    updatePayslipRequestStatus(id, 'approved', adminId);
    refresh();
    setSuccessMsg('✅ Payslip request approved! Employee can now download their payslip as PDF.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleGenerateAndApprove = (req: PayslipRequest) => {
    // 1. Approve if pending
    if (req.status === 'pending') {
      updatePayslipRequestStatus(req.id, 'approved', adminId);
      refresh();
    }
    // 2. Immediately open and generate official formatted PDF payslip
    openPDFWindow(req);
    setSuccessMsg(`⚡ Payslip generated for ${req.requestedBy} (${MONTHS_MAP[req.month] || req.month})!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleReject = (id: string) => {
    updatePayslipRequestStatus(id, 'rejected', adminId);
    refresh();
  };

  const roleIcon = (role: string) =>
    role === 'Manager' ? '👔' : role === 'Team Lead' ? '👥' : role === 'HR' ? '💼' : '👤';

  return (
    <div className="space-y-6">
      {/* Admin Flow Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" /> Admin Payslip Approval Queue
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="bg-slate-700/50 rounded-lg px-3 py-1.5 font-bold">📥 Receive Requests</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-indigo-700/50 rounded-lg px-3 py-1.5 font-bold">👑 Review & Approve</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-slate-700/50 rounded-lg px-3 py-1.5 font-bold">⚙️ System Generates Payslip</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-emerald-700/50 rounded-lg px-3 py-1.5 font-bold">📤 Employee Downloads PDF</span>
        </div>
        <p className="text-slate-400 text-xs mt-3">All roles — Employee, Manager, Team Lead, HR — submit requests here. Only Admin can approve.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all capitalize ${
              activeFilter === f
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {f === 'pending' ? `⏳ Pending (${pendingCount})` : f === 'approved' ? '✅ Approved' : f === 'rejected' ? '❌ Rejected' : '📋 All'}
          </button>
        ))}
        <button onClick={refresh} className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white dark:bg-slate-900 text-slate-600 hover:border-indigo-300 ml-auto">
          🔄 Refresh
        </button>
      </div>

      {/* Requests Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              {activeFilter === 'pending' ? `Pending Approval (${pendingCount})` : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests`}
            </CardTitle>
            {pendingCount > 0 && activeFilter !== 'pending' && (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">{pendingCount} Pending!</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium text-sm">
              {activeFilter === 'pending'
                ? 'No pending requests at the moment. All caught up! ✅'
                : 'No requests found for this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Requester</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{req.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{req.requestedBy}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-bold text-xs">
                          {roleIcon(req.role)} {req.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{MONTHS_MAP[req.month] || req.month}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{req.reason}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-xs"
                              onClick={() => handleGenerateAndApprove(req)}
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Generate Payslip
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleApprove(req.id)}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-rose-600 font-bold hover:bg-rose-50"
                              onClick={() => handleReject(req.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : req.status === 'approved' ? (
                          <div className="flex items-center gap-2 justify-end">
                            <Badge className="bg-emerald-100 text-emerald-800 font-bold">✅ Approved</Badge>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-indigo-600 text-white font-bold flex items-center gap-1"
                              onClick={() => handleGenerateAndApprove(req)}
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Generate / View PDF
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 font-bold">❌ Rejected</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
