import { useState, useEffect } from 'react';
import { useCompOffBalance, useRequestCompOff, useClaimCompOff } from '../hooks/useCompOff';
import { Clock, Award, Calendar, AlertCircle, RefreshCw, Send, Plus, X, ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export function CompOffManagementPage() {
  const { selectedCompanyId } = useCompanyStore();
  const [selectedCompOffId, setSelectedCompOffId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  // ─── Claim Comp-Off Modal State ──────────────────────────────────────────
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimWorkedDate, setClaimWorkedDate] = useState('');
  const [claimHours, setClaimHours] = useState<number>(8);
  const [claimReason, setClaimReason] = useState('');

  const { balance, totalHours, isLoading, error, refetch, pendingRequests } = useCompOffBalance();

  useEffect(() => {
    refetch();
  }, [selectedCompanyId, refetch]);

  const { requestCompOff, isLoading: requestLoading, error: requestError } = useRequestCompOff();
  const { claimCompOff, isLoading: claimLoading, error: claimError } = useClaimCompOff();

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
      toast.success('Comp-off redemption request submitted successfully!');
      setSelectedCompOffId(null);
      setReason('');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit comp-off request');
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimWorkedDate) {
      toast.error('Please select the date you worked.');
      return;
    }
    if (!claimReason.trim()) {
      toast.error('Please describe the work performed on that holiday/week-off.');
      return;
    }

    try {
      await claimCompOff({
        workedDate: claimWorkedDate,
        hoursEarned: claimHours,
        reason: claimReason.trim(),
      });
      toast.success('Comp-off credit claimed and recorded successfully!');
      setIsClaimModalOpen(false);
      setClaimWorkedDate('');
      setClaimHours(8);
      setClaimReason('');
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to claim comp-off. Date might not be a holiday or week-off.';
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5 w-full">
        {/* Header */}
        <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Compensatory Off (Comp-Off) Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Claim holiday/weekend overtime credits, manage your balance, and request comp-off leaves
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsClaimModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Claim Holiday Overtime</span>
          </button>
        </div>

        {(error || requestError || claimError) && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error || requestError || claimError}</span>
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
              <div className="p-8 text-center bg-card rounded-xl border border-border/80 shadow-2xs space-y-3">
                <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-foreground">No Available Comp-Off Credits</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    If you worked on a published holiday or weekly-off, click the "Claim Holiday Overtime" button above to log your credit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Claim Extra Work</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {availableBalance.map((compOff: any) => {
                  const isSelected = selectedCompOffId === compOff.id;
                  const earnedDate = compOff.compOffEarnedDate || compOff.comp_off_earned_date;
                  const hours = compOff.compOffEarnedHours || compOff.comp_off_earned_hours || 8;
                  const compReason = compOff.reason;

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
                          <span>Worked on: <strong>{earnedDate}</strong></span>
                          {compReason && <span className="text-[11px] text-muted-foreground/80">({compReason})</span>}
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
                        <span className="font-semibold text-amber-700 dark:text-amber-400 block">Pending Approval</span>
                        <span className="text-amber-600/70 dark:text-amber-400/70 text-[11px]">Requested on: {req.request_date || req.requestDate}</span>
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
                      <span className="font-semibold text-foreground">{compOff.compOffEarnedHours || compOff.comp_off_earned_hours || 8} Hours Used</span>
                      <span className="text-muted-foreground">Earned on: {compOff.compOffEarnedDate || compOff.comp_off_earned_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Request Redemption Panel */}
          <div className="lg:col-span-1 bg-card rounded-xl border border-border/80 shadow-2xs p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-2.5">
              Request Comp-Off Leave
            </h2>

            {selectedCompOffId ? (
              <div className="space-y-3.5">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ✓ Comp-off credit #{selectedCompOffId} selected for leave redemption
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
                    placeholder="Provide reason for taking comp-off leave..."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestCompOff}
                  disabled={requestLoading}
                  className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{requestLoading ? 'Submitting...' : 'Submit Comp-Off Leave Request'}</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <Clock className="w-7 h-7 text-muted-foreground/50 mx-auto" />
                <p className="font-medium">Select an available comp-off credit pass from the left to request leave.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Claim Extra Work (Comp-Off) Modal ─────────────────────────────── */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md border border-border rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Claim Holiday Overtime</h3>
                  <p className="text-[11px] text-muted-foreground">Earn comp-off credits for holiday or weekend work</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Comp-off credits can <strong>only be claimed for published holidays or weekly-offs</strong>. Weekday work will be automatically rejected by the system.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Date Worked (Holiday / Weekend) *
                </label>
                <input
                  type="date"
                  value={claimWorkedDate}
                  onChange={(e) => setClaimWorkedDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Hours Worked *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimHours(8)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                      claimHours === 8
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    Full Day (8 Hours)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimHours(4)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                      claimHours === 4
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    Half Day (4 Hours)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Work Details / Project Reason *
                </label>
                <textarea
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs bg-background border border-input rounded-md focus-visible:outline-none"
                  placeholder="e.g. Critical deployment and production support on Sunday..."
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {claimLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Claiming...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Submit Claim</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
