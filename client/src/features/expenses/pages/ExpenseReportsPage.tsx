import React, { useEffect, useState, useCallback } from 'react';
import { expenseApi } from '../api/expenseApi';
import {
  BarChart2,
  PieChart,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Building,
  Tag,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Users,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { useExpenseMoney } from '../utils/useExpenseMoney';

// ─── Report Type Definitions ────────────────────────────────────────────────
type ReportType = 'employee' | 'department' | 'category' | 'monthly' | 'violations' | 'reimbursement';

const TABS: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'employee',      label: 'Employee-wise',    icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'department',    label: 'Department-wise',  icon: <Building className="w-3.5 h-3.5" /> },
  { id: 'category',      label: 'Category-wise',    icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 'monthly',       label: 'Monthly Trends',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'violations',    label: 'Policy Violations', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { id: 'reimbursement', label: 'Reimbursement',    icon: <CreditCard className="w-3.5 h-3.5" /> },
];

// ─── Mini Bar Component (CSS only, no external chart library) ───────────────
const MiniBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

// ─── Status badge (reused) ──────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    payment_pending: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    returned: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    draft: 'bg-slate-100 text-slate-600',
  };
  const cls = map[status] || 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
export const ExpenseReportsPage: React.FC = () => {
  const money = useExpenseMoney();
  const [activeTab, setActiveTab] = useState<ReportType>('employee');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  // Shared filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        reportType: activeTab,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: selectedStatus || undefined,
      };
      const result = await expenseApi.getReports(params);
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Failed to load expense report:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived totals ──────────────────────────────────────────────────────
  const totalClaimed = data.reduce((s, r) => s + Number(r.totalClaimed || r.claimedAmount || 0), 0);
  const totalApproved = data.reduce((s, r) => s + Number(r.totalApproved || 0), 0);
  const totalPaid = data.reduce((s, r) => s + Number(r.totalPaid || r.paidAmount || 0), 0);
  const maxClaimed = Math.max(...data.map(r => Number(r.totalClaimed || r.claimedAmount || 0)), 1);

  // ── CSV Export ────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    const header = keys.join(',');
    const rows = data.map(row =>
      keys.map(k => {
        const val = row[k];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return /[,\n"]/.test(str) ? `"${str}"` : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            Expense Reports &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated expense data across employees, departments, and time periods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            disabled={!data.length}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Claimed', value: money(totalClaimed), color: 'text-slate-900 dark:text-white', icon: <FileText className="w-4 h-4 text-blue-500" /> },
          { label: 'Total Approved', value: money(totalApproved), color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
          { label: 'Total Paid', value: money(totalPaid), color: 'text-indigo-600 dark:text-indigo-400', icon: <CreditCard className="w-4 h-4 text-indigo-500" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 flex-shrink-0">{icon}</div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
              <p className={`text-sm sm:text-base font-bold truncate ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters + Tabs ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filters:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeTab === 'employee' && (
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_level_1">Pending TL</option>
              <option value="pending_level_2">Pending Manager</option>
              <option value="pending_finance">Pending Finance</option>
              <option value="payment_pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
          {(startDate || endDate || selectedStatus) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSelectedStatus(''); }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Report Table ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading report data...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No data found for the selected filters</p>
            <p className="text-xs text-slate-400">Try adjusting the date range or clearing filters</p>
          </div>
        ) : (
          <>
            {/* ─── EMPLOYEE-WISE ─────────────────────────────────────── */}
            {activeTab === 'employee' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left">Claim # / Title</th>
                      <th className="py-3 px-4 text-left">Employee</th>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-right">Claimed</th>
                      <th className="py-3 px-4 text-right">Approved</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{row.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.claimNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{`${row.firstName || ''} ${row.lastName || ''}`.trim() || '—'}</div>
                          {row.employeeCode && <div className="text-[10px] text-slate-400">{row.employeeCode}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.departmentName || '—'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.categoryName || '—'}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{money(Number(row.totalClaimedAmount || 0))}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{money(Number(row.totalApprovedAmount || 0))}</td>
                        <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                        <td className="py-3 px-4 text-slate-500">{row.claimDate ? new Date(row.claimDate).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── DEPARTMENT-WISE ───────────────────────────────────── */}
            {activeTab === 'department' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-right">Total Claims</th>
                      <th className="py-3 px-4 text-right">Total Claimed</th>
                      <th className="py-3 px-4 text-right">Total Approved</th>
                      <th className="py-3 px-4 text-right">Total Paid</th>
                      <th className="py-3 px-4 text-right">Rejected</th>
                      <th className="py-3 px-4 text-left w-36">Claimed Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{row.departmentName}</td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{row.totalClaims}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{money(row.totalClaimed)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{money(row.totalApproved)}</td>
                        <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">{money(row.totalPaid)}</td>
                        <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">{row.rejectedCount}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] text-slate-500">{maxClaimed > 0 ? Math.round((row.totalClaimed / maxClaimed) * 100) : 0}%</span>
                          <MiniBar value={row.totalClaimed} max={maxClaimed} color="bg-blue-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── CATEGORY-WISE ─────────────────────────────────────── */}
            {activeTab === 'category' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-right">Claims</th>
                      <th className="py-3 px-4 text-right">Items</th>
                      <th className="py-3 px-4 text-right">Total Claimed</th>
                      <th className="py-3 px-4 text-right">Total Approved</th>
                      <th className="py-3 px-4 text-right">Policy Violations</th>
                      <th className="py-3 px-4 text-left w-36">Claim Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {row.categoryName}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{row.totalClaims}</td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{row.totalItems}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{money(row.totalClaimed)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{money(row.totalApproved)}</td>
                        <td className="py-3 px-4 text-right">
                          {row.violationsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                              <AlertCircle className="w-3 h-3" />{row.violationsCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] text-slate-500">{maxClaimed > 0 ? Math.round((row.totalClaimed / maxClaimed) * 100) : 0}%</span>
                          <MiniBar value={row.totalClaimed} max={maxClaimed} color="bg-violet-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── MONTHLY TRENDS ───────────────────────────────────── */}
            {activeTab === 'monthly' && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {data.map((row: any, i) => {
                    const pctApproved = row.totalClaimed > 0 ? Math.round((row.totalApproved / row.totalClaimed) * 100) : 0;
                    return (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{row.month}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />{row.totalClaims} claims
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-slate-500">Claimed</span>
                            <span className="font-bold text-slate-900 dark:text-white">{money(row.totalClaimed)}</span>
                          </div>
                          <MiniBar value={row.totalClaimed} max={maxClaimed} color="bg-blue-500" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-slate-500">Approved</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{money(row.totalApproved)}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pctApproved}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">Paid</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{money(row.totalPaid)}</span>
                        </div>
                        {row.rejectedCount > 0 && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            {row.rejectedCount} rejected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── POLICY VIOLATIONS ────────────────────────────────── */}
            {activeTab === 'violations' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left">Claim # / Title</th>
                      <th className="py-3 px-4 text-left">Employee</th>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-left">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-left">Policy Violations</th>
                      <th className="py-3 px-4 text-left">Justification</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i) => (
                      <tr key={i} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{row.claimTitle}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.claimNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{row.employeeName}</div>
                          {row.employeeCode && <div className="text-[10px] text-slate-400">{row.employeeCode}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.departmentName}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.categoryName}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{money(row.claimedAmount)}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {(Array.isArray(row.policyViolations) ? row.policyViolations : []).map((v: string, vi: number) => (
                              <div key={vi} className="flex items-start gap-1 text-amber-800 dark:text-amber-300">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{v}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic max-w-[160px]">
                          {row.employeeJustification || <span className="text-rose-500 font-medium not-italic">No justification</span>}
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── REIMBURSEMENT ────────────────────────────────────── */}
            {activeTab === 'reimbursement' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4 text-left">Claim # / Title</th>
                      <th className="py-3 px-4 text-left">Employee</th>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-right">Claimed</th>
                      <th className="py-3 px-4 text-right">Approved</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-left">Payment Method</th>
                      <th className="py-3 px-4 text-left">Payment Ref.</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{row.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.claimNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{row.employeeName}</div>
                          {row.employeeCode && <div className="text-[10px] text-slate-400">{row.employeeCode}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.departmentName}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">{money(row.totalClaimed)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{money(row.totalApproved)}</td>
                        <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-bold">{money(row.paidAmount)}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">{(row.paymentMethod || '—').replace(/_/g, ' ')}</td>
                        <td className="py-3 px-4">
                          {row.paymentReference
                            ? <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{row.paymentReference}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Row Count Footer ──────────────────────────────────── */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-[11px] text-slate-500 text-right">
              {data.length} record{data.length !== 1 ? 's' : ''} shown
            </div>
          </>
        )}
      </div>
    </div>
  );
};
