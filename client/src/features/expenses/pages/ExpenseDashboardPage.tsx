import React, { useEffect, useState } from 'react';
import { expenseApi } from '../api/expenseApi';
import {
  ReceiptIndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  Building2,
  IndianRupee
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '../utils/formatMoney';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const ExpenseDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [res, set] = await Promise.all([
        expenseApi.getDashboardSummary(),
        expenseApi.getSettings().catch(() => null),
      ]);
      setData(res);
      setSettings(set);
    } catch (err) {
      console.error('Failed to load expense dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading Expense Analytics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const money = (n: number | string | null | undefined) => formatMoney(n, settings);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expense Management Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your claims and reimbursement status. Organization payment records are available in Reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/expenses/my-expenses?create=true')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Expense Claim
          </button>
          <button
            onClick={() => navigate('/expenses/reports')}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Reports
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <ReceiptIndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {money(kpis.totalExpenses)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total claimed amount</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Approval</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpis.pendingApproval || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Claims awaiting action</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.approvedCount !== undefined ? kpis.approvedCount : (kpis.approvedExpenses > 0 ? 1 : 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Verified & approved count</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-lg">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {kpis.rejectedCount !== undefined ? kpis.rejectedCount : (kpis.rejectedExpenses > 0 ? 1 : 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Declined requests count</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Payment Pending</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {money(kpis.paymentPending)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting disbursal</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Reimbursed</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {money(kpis.totalReimbursedAmount)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total paid out</p>
          </div>
        </div>
      </div>

      {/* Policy Violations Alert */}
      {charts.policyViolationsCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Policy Violations Flagged: {charts.policyViolationsCount} Claim Items
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Some items exceeded category spending limits or lacked mandatory receipts. Employee justifications require review.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/expenses/approvals')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
          >
            Review Violations
          </button>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expense Trends */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Monthly Expense Trends
            </h3>
            <span className="text-xs text-slate-500">Last 6 Months</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: any) => money(val)} />
                <Legend />
                <Bar dataKey="claimed" name="Claimed Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="Approved Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ReceiptIndianRupee className="w-4 h-4 text-purple-500" />
              Category-Wise Spending
            </h3>
          </div>
          <div className="h-72">
            {charts.categoryExpenses && charts.categoryExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryExpenses}
                    dataKey="totalAmount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.categoryName}: ${money(entry.totalAmount)}`}
                  >
                    {charts.categoryExpenses.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => money(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Department-Wise Expenses
            </h3>
          </div>
          <div className="h-72">
            {charts.departmentExpenses && charts.departmentExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departmentExpenses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="departmentName" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: any) => money(val)} />
                  <Bar dataKey="totalAmount" name="Total Claimed" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No department data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
