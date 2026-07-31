import { useState } from 'react';
import { useCompOffBalance, useRequestCompOff } from '../hooks/useCompOff';
import { Clock, Award, Calendar, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

export function CompOffManagementPage() {
  const [selectedCompOffId, setSelectedCompOffId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const { balance, totalHours, isLoading, error, refetch, pendingRequests } = useCompOffBalance();
  const { requestCompOff, isLoading: requestLoading, error: requestError } = useRequestCompOff();

  const availableBalance = balance.filter(
    (b) => b.status === 'available' && !pendingRequests.some((pr: any) => pr.comp_off_id === b.id)
  );
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
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5 w-full">
        {/* Header */}
        <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Compensatory Off (Comp-Off) Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage overtime comp-off credits, view available balance, and submit redemption requests
          </p>
        </div>

        {(error || requestError) && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error || requestError}</span>
          </div>
        )}

        {/* Summary KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-card border border-border/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Available Comp-Off Hours</span>
              <span className="text-2xl font-black text-foreground tracking-tight mt-0.5 block">
                {totalHours || (availableBalance.length * 8)} <span className="text-xs font-semibold text-muted-foreground">Hours</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Available Credit Passes</span>
              <span className="text-2xl font-black text-foreground tracking-tight mt-0.5 block">
                {availableBalance.length} <span className="text-xs font-semibold text-muted-foreground">Credits</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Available Comp Off List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Available Comp-Off Credits</h2>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading comp-off credits...</p>
              </div>
            ) : availableBalance.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-2">
                <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs font-bold text-foreground">No Available Comp-Off Credits</p>
                <p className="text-[11px] text-muted-foreground">Comp-off credits earned from holiday/weekend work will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableBalance.map((compOff: any) => {
                  const isSelected = selectedCompOffId === compOff.id;
                  const earnedDate = compOff.compOffEarnedDate || compOff.comp_off_earned_date;
                  const hours = compOff.compOffEarnedHours || compOff.comp_off_earned_hours || 8;

                  return (
                    <div
                      key={compOff.id}
                      onClick={() => setSelectedCompOffId(compOff.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-card border-primary ring-2 ring-primary/20 shadow-2xs'
                          : 'bg-card border-border/80 hover:border-border shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-foreground">
                            +{hours} Overtime Hours Credit
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Available
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>Earned on: {earnedDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending Section */}
            {pendingRequests.length > 0 && (
              <div className="pt-3 space-y-2.5">
                <h2 className="text-xs font-bold text-foreground">Pending Requests</h2>
                <div className="space-y-2">
                  {pendingRequests.map((req: any) => (
                    <div key={req.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-amber-700 dark:text-amber-400 block">Pending Manager Approval</span>
                        <span className="text-amber-600/70 dark:text-amber-400/70 text-[11px]">Requested on: {req.request_date}</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Used Section */}
            {usedBalance.length > 0 && (
              <div className="pt-3 space-y-2.5">
                <h2 className="text-xs font-bold text-foreground">Used Comp-Off History</h2>
                <div className="space-y-2">
                  {usedBalance.map((compOff: any) => (
                    <div key={compOff.id} className="p-3 rounded-lg bg-muted/40 border border-border/60 flex justify-between items-center text-xs opacity-75">
                      <span className="font-semibold text-foreground">{compOff.compOffEarnedHours || 8} Hours Used</span>
                      <span className="text-muted-foreground">Earned: {compOff.compOffEarnedDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Request Panel */}
          <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
              Request Comp-Off Redemption
            </h2>

            {selectedCompOffId ? (
              <div className="space-y-3.5">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ✓ Comp-off credit #{selectedCompOffId} selected for redemption
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Redemption Reason *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                    placeholder="Provide reason for comp-off leave redemption..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestCompOff}
                  disabled={requestLoading}
                  className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{requestLoading ? 'Submitting...' : 'Submit Comp-Off Request'}</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <Clock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
                <p className="font-medium">Select a comp-off credit pass from the left list to submit a request.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
