import React from 'react';
import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { PieChart, Clock, Calendar, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const LEAVE_TYPE_NAMES: Record<number, string> = {
  1: 'Casual Leave (CL)',
  2: 'Sick Leave (SL)',
  3: 'Earned Leave (EL)',
  4: 'Privilege Leave (PL)',
  5: 'Maternity Leave',
  6: 'Paternity Leave',
};

const LEAVE_TYPE_COLORS: Record<number, { bg: string; text: string; border: string; progress: string }> = {
  1: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', progress: 'bg-emerald-500' },
  2: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', progress: 'bg-rose-500' },
  3: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', progress: 'bg-indigo-500' },
  4: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', progress: 'bg-amber-500' },
  5: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', progress: 'bg-purple-500' },
  6: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', progress: 'bg-blue-500' },
};

export function LeaveBalancePage() {
  const { balances, isLoading, error } = useLeaveBalance();

  return (
    <div>
      <LeaveHeaderNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Leave Quota & Balances
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time balance breakdown and consumed leave quotas for current financial year
          </p>
        </div>

        <Link
          to="/leaves/apply"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">Loading leave balances from database...</p>
        </div>
      ) : balances.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <PieChart className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Leave Balances Found</h3>
          <p className="text-xs text-slate-400">Your leave balance quota for this financial year is initializing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {balances.map((balance: any) => {
            const typeId = balance.leave_type_id || balance.leaveTypeId || 1;
            const leaveTypeName = LEAVE_TYPE_NAMES[typeId] || `Leave Type #${typeId}`;
            const colorTheme = LEAVE_TYPE_COLORS[typeId] || LEAVE_TYPE_COLORS[1];

            const available = balance.available_balance ?? balance.availableBalance ?? 12;
            const consumed = balance.consumed_balance ?? balance.consumedBalance ?? 0;
            const credited = balance.opening_balance ?? balance.creditedBalance ?? (available + consumed);
            const total = credited || (available + consumed) || 12;
            const percentageUsed = Math.min(Math.round((consumed / total) * 100), 100);

            return (
              <div
                key={balance.id || typeId}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border ${colorTheme.border} shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${colorTheme.bg} ${colorTheme.text}`}>
                      {leaveTypeName}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Balance</span>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {available} <span className="text-xs font-semibold text-slate-500">Days</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Consumed Quota:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{consumed} days</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Total Allocated:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{total} days</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Usage Progress</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{percentageUsed}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${colorTheme.progress}`}
                      style={{ width: `${percentageUsed}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
}
