import { useLeaveBalance } from '../hooks/useLeaveBalance';
import { PieChart, Calendar, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
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
  1: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', progress: 'bg-emerald-500' },
  2: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/30', progress: 'bg-rose-500' },
  3: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/30', progress: 'bg-indigo-500' },
  4: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30', progress: 'bg-amber-500' },
  5: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/30', progress: 'bg-purple-500' },
  6: { bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500/30', progress: 'bg-sky-500' },
};

export function LeaveBalancePage() {
  const { balances, isLoading, error } = useLeaveBalance();

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Leave Quota & Balances
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time balance breakdown and consumed leave quotas for current financial year
            </p>
          </div>

          <Link
            to="/leaves/apply"
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-2xs transition-all self-start sm:self-auto"
          >
            <Calendar className="w-4 h-4" />
            <span>Apply for Leave</span>
          </Link>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{typeof error === 'string' ? error : (error as any)?.message || 'An error occurred'}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs font-medium">Loading leave balances...</p>
          </div>
        ) : balances.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
            <PieChart className="w-9 h-9 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-foreground">No Leave Balances Found</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your leave balance quota for this financial year is initializing.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((balance: any) => {
              const typeId = balance.leave_type_id || balance.leaveTypeId || 1;
              const leaveTypeName = balance.leave_name || balance.leaveName || LEAVE_TYPE_NAMES[typeId] || `Leave Type #${typeId}`;
              const colorTheme = LEAVE_TYPE_COLORS[typeId] || LEAVE_TYPE_COLORS[1];

              const available = balance.available_balance ?? balance.availableBalance ?? 12;
              const consumed = balance.consumed_balance ?? balance.consumedBalance ?? 0;
              const credited = balance.allocated_balance ?? balance.allocatedBalance ?? balance.opening_balance ?? balance.openingBalance ?? (available + consumed);
              const total = credited || (available + consumed) || 12;
              const percentageUsed = Math.min(Math.round((consumed / total) * 100), 100);

              let showExpired = false;
              if (balance.allocation_settings) {
                try {
                  const alloc = typeof balance.allocation_settings === 'string'
                    ? JSON.parse(balance.allocation_settings)
                    : balance.allocation_settings;
                  showExpired = !!alloc.expireLeaveOnDashboard;
                } catch (e) {}
              }
              const expired = balance.expired_balance ?? balance.expiredBalance ?? 0;

              return (
                <div
                  key={balance.id || typeId}
                  className={`p-5 rounded-xl bg-card border ${colorTheme.border} shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${colorTheme.bg} ${colorTheme.text}`}>
                        {leaveTypeName}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-muted-foreground/60" />
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Available Balance</span>
                      <span className="text-2xl font-black text-foreground tracking-tight">
                        {available} <span className="text-xs font-semibold text-muted-foreground">Days</span>
                      </span>
                      {balance.allow_negative_balance || balance.allowNegativeBalance ? (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                          Negative policy: {
                            balance.negative_balance_action === 'LOP' ? 'LOP (Unpaid)' :
                            balance.negative_balance_action === 'CARRY_FORWARD' ? 'Carry Forward' :
                            balance.negative_balance_action === 'POOL_FROM_OTHER_LEAVE' ? 'Pooled from other leave' :
                            'HR Override Required'
                          }
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Negative balance blocked
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 text-xs">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Consumed Quota:</span>
                        <span className="font-bold text-foreground">{consumed} days</span>
                      </div>

                      {showExpired && (
                        <div className="flex justify-between items-center text-rose-500 font-medium">
                          <span>Expired Leaves:</span>
                          <span className={expired > 0 ? "font-bold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>{expired} days</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Total Allocated:</span>
                        <span className="font-bold text-foreground">{total} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground font-medium">Usage Progress</span>
                      <span className="font-mono font-bold text-foreground">{percentageUsed}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${colorTheme.progress}`}
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
