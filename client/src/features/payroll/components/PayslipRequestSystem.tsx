import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Send, Clock, CheckCircle, Download,
  Bell, ChevronRight, ShieldCheck, Sparkles, RefreshCw, XCircle
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

// ── Dummy salary data per employee ID for PDF generation ─────────────────────
const SALARY_DATA: Record<number, { basic: number; name: string; code: string }> = {
  38: { basic: 37500, name: 'Got Sharma', code: 'EMP101' },
  39: { basic: 34000, name: 'Mot Sharma', code: 'EMP202' },
  40: { basic: 41000, name: 'Tee Gfdsa', code: 'EMP206' },
  41: { basic: 48000, name: 'Team Lead', code: 'EMP2002' },
  42: { basic: 31000, name: 'Hrr Fccc', code: 'EMP1001' },
  43: { basic: 27000, name: 'NN Employee', code: 'EMP702' },
  44: { basic: 60000, name: 'PP Manager', code: '432' },
  45: { basic: 29000, name: 'Hrrr Employee', code: 'EMP7576' },
  46: { basic: 32000, name: 'Gooo Jjjjjj', code: 'EMP046' },
};

function computePayslip(empId: number, month: string) {
  const emp = SALARY_DATA[empId] || { basic: 30000, name: `Employee #${empId}`, code: `EMP-${empId}` };
  const basic = emp.basic;
  const hra = Math.round(basic * 0.40);
  const sa = Math.round(basic * 0.25);
  const gross = basic + hra + sa;
  const pf = Math.round(basic * 0.12);
  const esi = Math.round(gross * 0.0075);
  const tds = Math.round(gross * 0.08);
  const totalDed = pf + esi + tds;
  const net = Math.max(0, gross - totalDed);
  const psNum = `PS-${month.replace('-', '')}-${empId}`;
  return { emp, basic, hra, sa, gross, pf, esi, tds, totalDed, net, psNum, month };
}

function openPDFWindow(req: PayslipRequest) {
  const p = computePayslip(req.requestedById, req.month);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>Payslip - ${p.psNum}</title><style>
      body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
      h2 { color: #0f172a; border-bottom: 3px solid #0f172a; padding-bottom: 10px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
      .val { font-weight: bold; font-size: 15px; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #0f172a; color: white; padding: 10px; text-align: left; font-size: 13px; }
      td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
      .earn { color: #15803d; font-weight: bold; }
      .ded  { color: #b91c1c; font-weight: bold; }
      .net-box { background: #f1f5f9; border: 2px solid #cbd5e1; padding: 20px; border-radius: 8px; text-align: center; margin-top: 24px; }
      .net-label { font-size: 14px; color: #0f172a; font-weight: bold; }
      .net-amount { font-size: 36px; font-weight: 900; color: #0f172a; margin-top: 4px; }
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
    setSuccessMsg(`Request submitted to Admin! You will be notified once approved.`);
    setReason('');
    setMyRequests(getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId));
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const statusBadge = (req: PayslipRequest) => {
    if (req.status === 'approved') return (
      <div className="flex items-center gap-2 justify-end">
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Approved</Badge>
        <Button size="sm" className="h-6 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1"
          onClick={() => openPDFWindow(req)}>
          <Download className="w-3 h-3" /> Download PDF
        </Button>
      </div>
    );
    if (req.status === 'rejected') return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">Rejected</Badge>;
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">Pending Admin</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Flow Banner */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <FileText className="w-4 h-4" /> Payslip Request Flow
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">{roleIcon} You Apply</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">Admin Reviews</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">Admin Generates</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md font-bold">Download PDF</span>
        </div>
      </div>

      {/* Request Form */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Apply for Payslip
          </CardTitle>
          <CardDescription className="text-xs">Submit a request to Admin to generate your official payslip for a specific month</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {successMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Requesting As</label>
                <div className="h-9 px-3 flex items-center border border-border rounded-lg bg-muted/20 text-xs font-bold text-foreground">
                  {roleIcon} {role} — {employeeName}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Payslip Month *</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="h-9 w-full px-3 border border-border rounded-lg text-xs bg-background font-bold text-foreground cursor-pointer"
                  required
                >
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Purpose / Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Bank loan application, Visa application, Personal record..."
                className="h-9 w-full px-3 border border-border rounded-lg text-xs bg-background text-foreground"
              />
            </div>
            <Button type="submit" className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5">
              <Send className="w-3.5 h-3.5" /> Submit Request to Admin
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Request History */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> My Request History
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-primary font-bold gap-1"
              onClick={() => setMyRequests(getPayslipRequests(employeeId).filter(r => r.requestedById === employeeId))}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {myRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground font-medium text-xs">
              No requests submitted yet. Use the form above to apply.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th className="px-4 py-2.5">Request ID</th>
                    <th className="px-4 py-2.5">Month</th>
                    <th className="px-4 py-2.5">Purpose</th>
                    <th className="px-4 py-2.5">Submitted On</th>
                    <th className="px-4 py-2.5 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors text-xs">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{req.id}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{MONTHS_MAP[req.month] || req.month}</td>
                      <td className="px-4 py-3 text-muted-foreground">{req.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">
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
  const { user } = useAuthStore();
  const adminId = user?.id || user?.email;
  const [requests, setRequests] = useState<PayslipRequest[]>(() => getPayslipRequests(adminId));
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [successMsg, setSuccessMsg] = useState('');

  const refresh = () => setRequests(getPayslipRequests(adminId));

  const filtered = requests.filter(r => activeFilter === 'all' ? true : r.status === activeFilter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (id: string) => {
    updatePayslipRequestStatus(id, 'approved', adminId);
    refresh();
    setSuccessMsg('Payslip request approved! Employee can now download their payslip as PDF.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleGenerateAndApprove = (req: PayslipRequest) => {
    if (req.status === 'pending') {
      updatePayslipRequestStatus(req.id, 'approved', adminId);
      refresh();
    }
    openPDFWindow(req);
    setSuccessMsg(`Payslip generated for ${req.requestedBy} (${MONTHS_MAP[req.month] || req.month})!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleReject = (id: string) => {
    updatePayslipRequestStatus(id, 'rejected', adminId);
    refresh();
  };

  const roleIcon = (role: string) =>
    role === 'Manager' ? '👔' : role === 'Team Lead' ? '👥' : role === 'HR' ? '💼' : '👤';

  return (
    <div className="space-y-4">
      {/* Admin Flow Banner */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" /> Admin Payslip Approval Queue
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">Receive Requests</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-bold">Review & Approve</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-muted px-2.5 py-1 rounded-md font-semibold text-foreground">System Generates</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-md font-bold">Employee Downloads</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${activeFilter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
            >
              {f === 'pending' ? `Pending (${pendingCount})` : f === 'approved' ? 'Approved' : f === 'rejected' ? 'Rejected' : 'All'}
            </button>
          ))}
        </div>
        <Button onClick={refresh} variant="outline" size="sm" className="h-7 text-xs font-bold gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Requests Table */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              {activeFilter === 'pending' ? `Pending Approval (${pendingCount})` : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests`}
            </CardTitle>
            {pendingCount > 0 && activeFilter !== 'pending' && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">{pendingCount} Pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground font-medium text-xs">
              {activeFilter === 'pending'
                ? 'No pending requests at the moment. All caught up!'
                : 'No requests found for this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Requester</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Month</th>
                    <th className="px-4 py-2.5">Purpose</th>
                    <th className="px-4 py-2.5">Requested</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map(req => (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{req.id}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{req.requestedBy}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-bold text-[10px]">
                          {roleIcon(req.role)} {req.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{MONTHS_MAP[req.month] || req.month}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{req.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1"
                              onClick={() => handleGenerateAndApprove(req)}
                            >
                              <Sparkles className="w-3 h-3" /> Generate Payslip
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleApprove(req.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-rose-600 font-bold hover:bg-rose-50"
                              onClick={() => handleReject(req.id)}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : req.status === 'approved' ? (
                          <div className="flex items-center gap-2 justify-end">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Approved</Badge>
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1"
                              onClick={() => handleGenerateAndApprove(req)}
                            >
                              <Sparkles className="w-3 h-3" /> Generate / View PDF
                            </Button>
                          </div>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">Rejected</Badge>
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
