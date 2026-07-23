import React, { useState } from 'react';
import { useCompOffBalance, useRequestCompOff } from '../hooks/useCompOff';
import { LeaveHeaderNav } from '../components/LeaveHeaderNav';
import { Clock, CheckCircle2, Award, Calendar, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

export function CompOffManagementPage() {
  const [selectedCompOffId, setSelectedCompOffId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const { balance, totalHours, isLoading, error, refetch } = useCompOffBalance();
  const { requestCompOff, isLoading: requestLoading, error: requestError } = useRequestCompOff();

  const availableBalance = balance.filter((b) => b.status === 'available');
  const usedBalance = balance.filter((b) => b.status === 'used');

  const handleRequestCompOff = async () => {
    if (!selectedCompOffId || !reason.trim()) {
      toast.error('Please select a comp-off credit and provide a reason');
      return;
    }

    try {
      await requestCompOff({ compOffId: selectedCompOffId, reason });
      toast.success('Comp-off request submitted successfully!');
      setSelectedCompOffId(null);
      setReason('');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit comp-off request');
    }
  };

  return (
    <div>
      <LeaveHeaderNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Compensatory Off (Comp-Off) Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage overtime comp-off credits, view available balance, and submit redemption requests
        </p>
      </div>

      {(error || requestError) && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error || requestError}</span>
        </div>
      )}

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Available Comp-Off Hours</span>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 block">
              {totalHours || (availableBalance.length * 8)} <span className="text-xs font-semibold text-slate-500">Hours</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block">Available Credit Passes</span>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 block">
              {availableBalance.length} <span className="text-xs font-semibold text-slate-500">Credits</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Available Comp Off List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Available Comp-Off Credits</h2>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Loading comp-off credits from server...</p>
            </div>
          ) : availableBalance.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No Available Comp-Off Credits</p>
              <p className="text-[11px] text-slate-400">Comp-off credits earned from holiday/weekend work will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableBalance.map((compOff: any) => {
                const isSelected = selectedCompOffId === compOff.id;
                const earnedDate = compOff.compOffEarnedDate || compOff.comp_off_earned_date;
                const hours = compOff.compOffEarnedHours || compOff.comp_off_earned_hours || 8;

                return (
                  <div
                    key={compOff.id}
                    onClick={() => setSelectedCompOffId(compOff.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          +{hours} Overtime Hours Credit
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Available
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Earned on: {earnedDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Used Section */}
          {usedBalance.length > 0 && (
            <div className="pt-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Used Comp-Off History</h2>
              <div className="space-y-2">
                {usedBalance.map((compOff: any) => (
                  <div key={compOff.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs opacity-70">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{compOff.compOffEarnedHours || 8} Hours Used</span>
                    <span className="text-slate-400">Earned: {compOff.compOffEarnedDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Request Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 sticky top-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Request Comp-Off Redemption
          </h2>

          {selectedCompOffId ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                ✓ Comp-off credit #{selectedCompOffId} selected for redemption
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Redemption Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Provide reason for comp-off leave redemption..."
                />
              </div>

              <button
                type="button"
                onClick={handleRequestCompOff}
                disabled={requestLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{requestLoading ? 'Submitting...' : 'Submit Comp-Off Request'}</span>
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-semibold">Select a comp-off credit pass from the left list to submit a request.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
